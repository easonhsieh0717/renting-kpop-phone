import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { callECPayRefundAPI } from '@/lib/ecpay';

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

interface RefundRequest {
  refundAmount: number;
  damageAmount?: number;
  reason?: string;
  confirm: boolean; // 確認機制
}

// 更新Google Sheet中的保證金退刷資訊
async function updateDepositRefundInSheet(
  orderId: string, 
  refundAmount: number, 
  status: string,
  damageAmount: number = 0
) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 找到訂單的行號
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:A',
    });

    const rows = response.data.values;
    if (!rows) return;

    const rowIndex = rows.findIndex((row: any) => row[0] === orderId);
    if (rowIndex === -1) return;

    // 更新保證金相關欄位 (U=保證金狀態, V=退刷金額, W=退刷時間, X=損壞費用)
    const updateRange = `reservations!U${rowIndex + 1}:X${rowIndex + 1}`;
    const currentTime = new Date().toISOString();
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[status, refundAmount, currentTime, damageAmount]],
      },
    });

    console.log(`Updated deposit refund info for order ${orderId} in Google Sheet`);
  } catch (error) {
    console.error('Error updating Google Sheet:', error);
    throw error;
  }
}

// 獲取訂單的保證金交易資訊
async function getDepositTransactionInfo(orderId: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 獲取訂單資料，包含保證金交易資訊
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:X',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      throw new Error('Order not found');
    }

    const orderRow = rows.find((row: any) => row[0] === orderId);
    if (!orderRow) {
      throw new Error('Order not found');
    }

    return {
      orderId: orderRow[0],
      customerName: orderRow[5],
      phoneModel: orderRow[1],
      depositTransactionNo: orderRow[18], // S欄：保證金交易號
      depositAmount: parseInt(orderRow[19]) || 30000, // T欄：保證金金額
      depositStatus: orderRow[20] || 'UNKNOWN', // U欄：保證金狀態
      refundAmount: parseInt(orderRow[21]) || 0, // V欄：已退刷金額
      refundTime: orderRow[22] || '', // W欄：退刷時間
      damageAmount: parseInt(orderRow[23]) || 0, // X欄：損壞費用
      ecpayTradeNo: orderRow[24] || '', // Y欄：ECPay交易編號
    };
  } catch (error) {
    console.error('Error getting deposit transaction info:', error);
    throw error;
  }
}

// POST: 執行保證金退刷
export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    const body: RefundRequest = await req.json();
    
    console.log(`Processing refund for order ${orderId}:`, body);

    // 確認機制檢查
    if (!body.confirm) {
      return NextResponse.json({
        success: false,
        message: '請確認要執行退刷操作'
      }, { status: 400 });
    }

    // 驗證退刷金額
    if (!body.refundAmount || body.refundAmount <= 0) {
      return NextResponse.json({
        success: false,
        message: '退刷金額必須大於0'
      }, { status: 400 });
    }

    // 獲取訂單的保證金交易資訊
    const depositInfo = await getDepositTransactionInfo(orderId);
    
    if (!depositInfo.depositTransactionNo) {
      return NextResponse.json({
        success: false,
        message: '找不到保證金交易記錄'
      }, { status: 404 });
    }

    if (!depositInfo.ecpayTradeNo) {
      return NextResponse.json({
        success: false,
        message: '找不到ECPay交易編號，無法執行退刷'
      }, { status: 404 });
    }

    if (depositInfo.depositStatus === 'REFUNDED') {
      return NextResponse.json({
        success: false,
        message: '此訂單的保證金已經退刷完成'
      }, { status: 400 });
    }

    // 檢查退刷金額是否超過可退金額
    const maxRefundAmount = depositInfo.depositAmount - depositInfo.refundAmount;
    if (body.refundAmount > maxRefundAmount) {
      return NextResponse.json({
        success: false,
        message: `退刷金額不能超過可退金額 NT$${maxRefundAmount}`
      }, { status: 400 });
    }

    // 準備ECPay退刷參數
    const merchantID = process.env.ECPAY_MERCHANT_ID || '3383324';
    const hashKey = process.env.ECPAY_HASH_KEY!;
    const hashIV = process.env.ECPAY_HASH_IV!;

    if (!hashKey || !hashIV) {
      throw new Error('ECPay credentials not configured');
    }

    // 生成退刷訂單編號
    const refundOrderId = `${orderId}_REFUND_${Date.now()}`;

    // 呼叫ECPay退刷API
    const isProduction = merchantID === '3383324';
    
    console.log('Calling ECPay refund API for order:', orderId);
    console.log('Refund details:', {
      merchantTradeNo: refundOrderId,
      tradeNo: depositInfo.ecpayTradeNo, // 使用ECPay的真正交易編號
      totalAmount: body.refundAmount
    });

    const ecpayResult = await callECPayRefundAPI({
      merchantTradeNo: refundOrderId,
      tradeNo: depositInfo.ecpayTradeNo, // 使用ECPay的真正交易編號
      action: 'R', // R=退刷
      totalAmount: body.refundAmount,
      merchantID,
      hashKey,
      hashIV,
      isProduction
    });

    console.log('ECPay refund result:', ecpayResult);

    if (ecpayResult.success && ecpayResult.RtnCode === 1) {
      // 退刷成功，更新Google Sheet
      const newStatus = (body.refundAmount + depositInfo.refundAmount >= depositInfo.depositAmount) 
        ? 'REFUNDED' 
        : 'PARTIAL_REFUND';

      await updateDepositRefundInSheet(
        orderId, 
        body.refundAmount, 
        newStatus,
        body.damageAmount || 0
      );

      return NextResponse.json({
        success: true,
        message: `保證金退刷成功：NT$${body.refundAmount}`,
        refundAmount: body.refundAmount,
        remainingAmount: maxRefundAmount - body.refundAmount,
        status: newStatus,
        ecpayResponse: {
          rtnCode: ecpayResult.RtnCode,
          rtnMsg: ecpayResult.RtnMsg,
          merchantTradeNo: ecpayResult.MerchantTradeNo
        }
      });
    } else {
      // 退刷失敗
      return NextResponse.json({
        success: false,
        message: `退刷失敗：${ecpayResult.RtnMsg || '未知錯誤'}`,
        ecpayResponse: {
          rtnCode: ecpayResult.RtnCode,
          rtnMsg: ecpayResult.RtnMsg,
          merchantTradeNo: ecpayResult.MerchantTradeNo
        }
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Refund processing error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '退刷處理失敗',
      error: error.message
    }, { status: 500 });
  }
}

// GET: 查看訂單的保證金退刷狀態
export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    
    const depositInfo = await getDepositTransactionInfo(orderId);
    
    const maxRefundAmount = depositInfo.depositAmount - depositInfo.refundAmount;
    
    return NextResponse.json({
      success: true,
      depositInfo: {
        ...depositInfo,
        maxRefundAmount,
        canRefund: maxRefundAmount > 0 && depositInfo.depositStatus !== 'REFUNDED'
      }
    });
    
  } catch (error: any) {
    console.error('Get deposit info error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '查詢保證金資訊失敗'
    }, { status: 500 });
  }
} 