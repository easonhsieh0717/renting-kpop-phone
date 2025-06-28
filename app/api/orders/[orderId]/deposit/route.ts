import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getECPayPaymentParams } from '@/lib/ecpay';

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

// 更新Google Sheet中的保證金交易資訊
async function updateDepositTransactionInSheet(
  orderId: string, 
  transactionNo: string, 
  amount: number = 30000
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

    // 更新保證金相關欄位 (S=交易號, T=金額, U=狀態)
    const updateRange = `reservations!S${rowIndex + 1}:U${rowIndex + 1}`;
    const currentTime = new Date().toISOString();
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[transactionNo, amount, 'HELD']],
      },
    });

    console.log(`Updated deposit transaction info for order ${orderId} in Google Sheet`);
  } catch (error) {
    console.error('Error updating Google Sheet:', error);
    throw error;
  }
}

// 獲取訂單資訊
async function getOrderInfo(orderId: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

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
      phoneModel: orderRow[1],
      customerName: orderRow[5],
      customerPhone: orderRow[7],
      paymentStatus: orderRow[8], // I欄：付款狀態
      depositTransactionNo: orderRow[18], // S欄：保證金交易號
      depositAmount: parseInt(orderRow[19]) || 0, // T欄：保證金金額
      depositStatus: orderRow[20] || '', // U欄：保證金狀態
    };
  } catch (error) {
    console.error('Error getting order info:', error);
    throw error;
  }
}

// POST: 創建保證金收款訂單
export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    
    console.log(`Creating deposit payment for order ${orderId}`);

    // 獲取訂單資訊
    const orderInfo = await getOrderInfo(orderId);
    
    // 檢查訂單狀態
    if (orderInfo.paymentStatus !== 'PAID') {
      return NextResponse.json({
        success: false,
        message: '此訂單尚未完成租金付款'
      }, { status: 400 });
    }

    if (orderInfo.depositTransactionNo) {
      return NextResponse.json({
        success: false,
        message: '此訂單已經收取過保證金'
      }, { status: 400 });
    }

    // 準備ECPay付款參數
    const merchantID = process.env.ECPAY_MERCHANT_ID || '3383324';
    const hashKey = process.env.ECPAY_HASH_KEY!;
    const hashIV = process.env.ECPAY_HASH_IV!;

    if (!hashKey || !hashIV) {
      throw new Error('ECPay credentials not configured');
    }

    // 生成保證金訂單編號
    const depositOrderId = `${orderId}_DEPOSIT_${Date.now()}`;
    const depositAmount = 30000;

    const paymentParams = getECPayPaymentParams({
      merchantTradeNo: depositOrderId,
      totalAmount: depositAmount,
      itemName: `手機租賃保證金 - ${orderInfo.phoneModel}`,
      merchantID,
      hashKey,
      hashIV
    });

    // 更新Google Sheet記錄保證金交易號
    await updateDepositTransactionInSheet(orderId, depositOrderId, depositAmount);

    // 準備ECPay表單URL
    const isProduction = merchantID === '3383324';
    const ecpayUrl = isProduction 
      ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
      : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';

    return NextResponse.json({
      success: true,
      message: '保證金收款訂單已建立',
      paymentParams,
      ecpayUrl,
      depositOrderId,
      depositAmount,
      orderInfo: {
        orderId: orderInfo.orderId,
        customerName: orderInfo.customerName,
        phoneModel: orderInfo.phoneModel
      }
    });

  } catch (error: any) {
    console.error('Create deposit payment error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '建立保證金收款失敗'
    }, { status: 500 });
  }
}

// GET: 查看訂單的保證金狀態
export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    
    const orderInfo = await getOrderInfo(orderId);
    
    return NextResponse.json({
      success: true,
      orderInfo: {
        ...orderInfo,
        canCreateDeposit: orderInfo.paymentStatus === 'PAID' && !orderInfo.depositTransactionNo,
        hasDeposit: !!orderInfo.depositTransactionNo
      }
    });
    
  } catch (error: any) {
    console.error('Get deposit status error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '查詢保證金狀態失敗'
    }, { status: 500 });
  }
} 