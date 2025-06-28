import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { callECPayRefundAPI } from '@/lib/ecpay';
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

// 更新預授權取消狀態
async function updateVoidStatus(orderId: string, status: string) {
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
      
              // 更新預授權狀態和取消時間
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: [
              {
                range: `U${rowIndex}`, // U欄：保證金狀態
                values: [[status]]
              },
              {
                range: `W${rowIndex}`, // W欄：取消時間
                values: [[formatDateTimeInTaipei(new Date())]]
              }
            ]
          }
        });
      break;
    }
  }
}

interface VoidRequest {
  confirm: boolean;
  reason?: string;
}

// POST: 取消預授權
export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    const body: VoidRequest = await req.json();
    
    console.log(`Processing void pre-auth for order ${orderId}:`, body);

    // 確認機制檢查
    if (!body.confirm) {
      return NextResponse.json({
        success: false,
        message: '請確認要取消預授權操作'
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
        message: '找不到ECPay交易編號，無法取消預授權'
      }, { status: 404 });
    }

    if (preAuthInfo.depositStatus === 'VOID') {
      return NextResponse.json({
        success: false,
        message: '此預授權已經取消'
      }, { status: 400 });
    }

    if (preAuthInfo.captureAmount > 0) {
      return NextResponse.json({
        success: false,
        message: '此預授權已有部分請款，無法取消'
      }, { status: 400 });
    }

    // 準備ECPay取消預授權參數
    const merchantID = process.env.ECPAY_MERCHANT_ID || '3383324';
    const hashKey = process.env.ECPAY_HASH_KEY!;
    const hashIV = process.env.ECPAY_HASH_IV!;

    if (!hashKey || !hashIV) {
      throw new Error('ECPay credentials not configured');
    }

    // 生成取消訂單編號
    const voidOrderId = `${orderId}_VOID_${Date.now()}`;

    // 呼叫ECPay取消預授權API (使用N=放棄)
    const isProduction = merchantID === '3383324';
    
    console.log('Calling ECPay void pre-auth API for order:', orderId);
    console.log('Void details:', {
      merchantTradeNo: voidOrderId,
      tradeNo: preAuthInfo.ecpayTradeNo,
      totalAmount: preAuthInfo.depositAmount
    });

    const ecpayResult = await callECPayRefundAPI({
      merchantTradeNo: voidOrderId,
      tradeNo: preAuthInfo.ecpayTradeNo,
      action: 'N', // N=放棄(取消預授權)
      totalAmount: preAuthInfo.depositAmount,
      merchantID,
      hashKey,
      hashIV,
      isProduction
    });

    console.log('ECPay void result:', ecpayResult);

    if (ecpayResult.success) {
      // 取消成功，更新狀態
      await updateVoidStatus(orderId, 'VOID');
      
      return NextResponse.json({
        success: true,
        message: '預授權取消成功',
        data: {
          orderId,
          voidAmount: preAuthInfo.depositAmount,
          status: 'VOID',
          ecpayResult
        }
      });
    } else {
      // 取消失敗
      await updateVoidStatus(orderId, 'VOID_FAILED');
      
      return NextResponse.json({
        success: false,
        message: `預授權取消失敗: ${ecpayResult.RtnMsg}`,
        error: ecpayResult.RtnMsg
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Void pre-auth error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '取消預授權失敗'
    }, { status: 500 });
  }
} 