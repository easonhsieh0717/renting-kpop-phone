import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

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

// 獲取特定訂單的預授權狀態
async function getOrderDepositStatus(orderId: string) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  // 獲取所有訂單資料
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'reservations!A:X',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('No data found in sheet');
  }

  // 尋找指定的訂單
  const orderRow = rows.slice(1).find((row: any) => row[0] === orderId);
  
  if (!orderRow) {
    throw new Error('Order not found');
  }

  return {
    orderId: orderRow[0],
    customerName: orderRow[5],
    phoneModel: orderRow[1],
    paymentStatus: orderRow[8], // I欄：付款狀態
    depositTransactionNo: orderRow[18], // S欄：保證金交易號
    depositAmount: parseInt(orderRow[19]) || 0, // T欄：保證金金額
    depositStatus: orderRow[20] || 'PENDING', // U欄：保證金狀態
    refundedAmount: parseInt(orderRow[21]) || 0, // V欄：已退刷金額
    ecpayTradeNo: orderRow[24] || '', // Y欄：ECPay交易編號
    preAuthCompletedAt: orderRow[25] || '', // Z欄：預授權完成時間
  };
}

// GET: 查詢特定訂單的預授權狀態
export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    
    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: '訂單編號不能為空'
      }, { status: 400 });
    }

    const orderStatus = await getOrderDepositStatus(orderId);
    
    // 判斷預授權狀態
    let status = 'PENDING';
    let message = '預授權處理中...';
    
    if (orderStatus.depositStatus === 'HELD') {
      status = 'HELD';
      message = '預授權已完成';
    } else if (orderStatus.depositStatus === 'PREAUTH_FAILED') {
      status = 'PREAUTH_FAILED';
      message = '預授權失敗';
    } else if (orderStatus.depositStatus === 'CAPTURED') {
      status = 'CAPTURED';
      message = '預授權已請款';
    } else if (orderStatus.depositStatus === 'REFUNDED') {
      status = 'REFUNDED';
      message = '預授權已退款';
    } else if (orderStatus.depositTransactionNo && !orderStatus.depositStatus) {
      status = 'PROCESSING';
      message = '預授權處理中...';
    }
    
    return NextResponse.json({
      success: true,
      status,
      message,
      data: {
        orderId: orderStatus.orderId,
        customerName: orderStatus.customerName,
        phoneModel: orderStatus.phoneModel,
        depositTransactionNo: orderStatus.depositTransactionNo,
        depositAmount: orderStatus.depositAmount,
        depositStatus: orderStatus.depositStatus,
        ecpayTradeNo: orderStatus.ecpayTradeNo,
        preAuthCompletedAt: orderStatus.preAuthCompletedAt,
        hasPreAuthTransaction: !!orderStatus.depositTransactionNo
      }
    });
    
  } catch (error: any) {
    console.error(`查詢訂單 ${params.orderId} 預授權狀態失敗:`, error);
    
    if (error.message === 'Order not found') {
      return NextResponse.json({
        success: false,
        message: '找不到該訂單'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: false,
      message: `查詢失敗: ${error.message}`
    }, { status: 500 });
  }
} 