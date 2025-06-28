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

// 獲取所有有預授權的訂單
async function getPreAuthOrders() {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A:BB', // 擴展到BB欄以包含新的預授權欄位
  });

  const rows = response.data.values || [];
  const orders = [];

  // 跳過標題行，從第二行開始
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // 檢查是否有預授權交易編號（S欄）
    const depositTransactionNo = row[18] || ''; // S欄：保證金交易編號
    
    if (depositTransactionNo && depositTransactionNo.includes('P')) { // P代表PreAuth
      const orderId = row[0] || '';
      const customerName = row[5] || ''; // F欄：客戶姓名
      const phoneModel = row[1] || ''; // B欄：手機ID
      const paymentStatus = row[8] || ''; // I欄：付款狀態
      const ecpayTradeNo = row[24] || ''; // Y欄：ECPay交易編號
      const depositAmount = parseInt(row[19]) || 0; // T欄：保證金金額
      const depositStatus = row[20] || ''; // U欄：保證金狀態
      const captureAmount = parseInt(row[21]) || 0; // V欄：已請款金額
      
      orders.push({
        orderId,
        customerName,
        phoneModel,
        paymentStatus,
        preAuthInfo: {
          orderId,
          depositTransactionNo,
          ecpayTradeNo,
          depositAmount,
          depositStatus,
          captureAmount
        }
      });
    }
  }

  return orders;
}

// GET: 獲取所有預授權訂單
export async function GET(req: NextRequest) {
  try {
    console.log('Getting all pre-auth orders');

    const orders = await getPreAuthOrders();
    
    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length
    });

  } catch (error: any) {
    console.error('Get pre-auth orders error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '獲取預授權訂單失敗'
    }, { status: 500 });
  }
} 