import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { callECPayCaptureAPI } from '@/lib/ecpay';
import { formatDateTimeInTaipei } from '@/lib/utils';

// Google Sheets 客戶端
async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// 獲取訂單的預授權交易資訊
async function getPreAuthTransactionInfo(orderId: string) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'reservations!A:Z',
  });

  const rows = response.data.values || [];
  
  // 找到對應的訂單
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] === orderId) { // A欄是訂單編號
      return {
        orderId: row[0],
        depositTransactionNo: row[18] || '', // S欄：保證金交易編號
        ecpayTradeNo: row[24] || '', // Y欄：ECPay交易編號
        depositAmount: parseInt(row[19]) || 0, // T欄：保證金金額
        depositStatus: row[20] || '', // U欄：保證金狀態
        captureAmount: parseInt(row[21]) || 0, // V欄：已請款金額
      };
    }
  }
  
  throw new Error('找不到訂單資訊');
}

// 更新預授權請款狀態
async function updateCaptureStatus(orderId: string, captureAmount: number, status: string) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'reservations!A:Z',
  });

  const rows = response.data.values || [];
  
  // 找到對應的訂單並更新
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] === orderId) {
      const rowIndex = i + 1;
      
              // 更新請款金額和狀態
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: [
              {
                range: `V${rowIndex}`, // V欄：已請款金額
                values: [[captureAmount]]
              },
              {
                range: `U${rowIndex}`, // U欄：保證金狀態
                values: [[status]]
              },
              {
                range: `W${rowIndex}`, // W欄：請款時間
                values: [[formatDateTimeInTaipei(new Date())]]
              }
            ]
          }
        });
      break;
    }
  }
}

interface CaptureRequest {
  captureAmount: number;
  reason?: string;
  confirm: boolean;
}

// GET: 獲取預授權交易資訊
export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    
    console.log(`Getting pre-auth info for order ${orderId}`);

    const preAuthInfo = await getPreAuthTransactionInfo(orderId);
    
    return NextResponse.json({
      success: true,
      data: preAuthInfo
    });

  } catch (error: any) {
    console.error('Get pre-auth info error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '獲取預授權資訊失敗'
    }, { status: 500 });
  }
}

// POST: 執行預授權請款
export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    const body: CaptureRequest = await req.json();
    
    console.log(`Processing capture for order ${orderId}:`, body);

    // 確認機制檢查
    if (!body.confirm) {
      return NextResponse.json({
        success: false,
        message: '請確認要執行預授權請款操作'
      }, { status: 400 });
    }

    // 驗證請款金額
    if (!body.captureAmount || body.captureAmount <= 0) {
      return NextResponse.json({
        success: false,
        message: '請款金額必須大於0'
      }, { status: 400 });
    }

    // 獲取訂單的預授權交易資訊
    const preAuthInfo = await getPreAuthTransactionInfo(orderId);
    
    if (!preAuthInfo.depositTransactionNo) {
      return NextResponse.json({
        success: false,
        message: '找不到預授權交易記錄'
      }, { status: 404 });
    }

    if (!preAuthInfo.ecpayTradeNo) {
      return NextResponse.json({
        success: false,
        message: '找不到ECPay交易編號，無法執行請款'
      }, { status: 404 });
    }

    if (preAuthInfo.depositStatus === 'CAPTURED') {
      return NextResponse.json({
        success: false,
        message: '此預授權已經請款完成'
      }, { status: 400 });
    }

    // 檢查請款金額是否超過預授權金額
    const maxCaptureAmount = preAuthInfo.depositAmount - preAuthInfo.captureAmount;
    if (body.captureAmount > maxCaptureAmount) {
      return NextResponse.json({
        success: false,
        message: `請款金額不能超過可請款金額 NT$${maxCaptureAmount}`
      }, { status: 400 });
    }

    // 準備ECPay請款參數
    const merchantID = process.env.ECPAY_MERCHANT_ID || '3383324';
    const hashKey = process.env.ECPAY_HASH_KEY!;
    const hashIV = process.env.ECPAY_HASH_IV!;

    if (!hashKey || !hashIV) {
      throw new Error('ECPay credentials not configured');
    }

    // 生成請款訂單編號
    const captureOrderId = `${orderId}_CAPTURE_${Date.now()}`;

    // 呼叫ECPay預授權請款API
    const isProduction = merchantID === '3383324';
    
    console.log('Calling ECPay capture API for order:', orderId);
    console.log('Capture details:', {
      merchantTradeNo: captureOrderId,
      tradeNo: preAuthInfo.ecpayTradeNo,
      captureAmount: body.captureAmount
    });

    const ecpayResult = await callECPayCaptureAPI({
      merchantTradeNo: captureOrderId,
      tradeNo: preAuthInfo.ecpayTradeNo,
      captureAmount: body.captureAmount,
      merchantID,
      hashKey,
      hashIV,
      isProduction
    });

    console.log('ECPay capture result:', ecpayResult);

    if (ecpayResult.success) {
      // 請款成功，更新狀態
      const newCaptureAmount = preAuthInfo.captureAmount + body.captureAmount;
      const newStatus = newCaptureAmount >= preAuthInfo.depositAmount ? 'CAPTURED' : 'PARTIAL_CAPTURED';
      
      await updateCaptureStatus(orderId, newCaptureAmount, newStatus);
      
      return NextResponse.json({
        success: true,
        message: '預授權請款成功',
        data: {
          captureAmount: body.captureAmount,
          totalCapturedAmount: newCaptureAmount,
          remainingAmount: preAuthInfo.depositAmount - newCaptureAmount,
          status: newStatus,
          ecpayResult
        }
      });
    } else {
      // 請款失敗
      await updateCaptureStatus(orderId, preAuthInfo.captureAmount, 'CAPTURE_FAILED');
      
      return NextResponse.json({
        success: false,
        message: `預授權請款失敗: ${ecpayResult.RtnMsg}`,
        error: ecpayResult.RtnMsg
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Capture error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '預授權請款失敗'
    }, { status: 500 });
  }
} 