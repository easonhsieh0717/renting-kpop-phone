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
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'reservations!A:Z', // 指定 reservations 工作表
  });

  const rows = response.data.values || [];
  const orders = [];

  console.log(`Found ${rows.length} rows in total`);
  
  // 跳過標題行，從第二行開始  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // 檢查是否有預授權交易編號（S欄）
    const depositTransactionNo = row[18] || ''; // S欄：保證金交易編號
    const orderId = row[0] || '';
    
    if (depositTransactionNo && depositTransactionNo.includes('P')) { // P代表PreAuth
      const customerName = row[5] || ''; // F欄：客戶姓名
      const phoneModel = row[1] || ''; // B欄：手機ID
      const paymentStatus = row[8] || ''; // I欄：付款狀態
      const ecpayTradeNo = row[24] || ''; // Y欄：ECPay交易編號
      const depositAmount = parseInt(row[19]) || 0; // T欄：保證金金額
      const depositStatus = row[20] || ''; // U欄：保證金狀態
      const captureAmount = parseInt(row[21]) || 0; // V欄：已請款金額
      
      console.log(`[PREAUTH_DEBUG] 找到預授權訂單: ${orderId}, 狀態: ${depositStatus}, 交易編號: ${depositTransactionNo}`);
      
      // 只返回狀態不是VOID的預授權
      if (depositStatus !== 'VOID') {
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
      } else {
        console.log(`[PREAUTH_DEBUG] 跳過已取消的預授權: ${orderId}`);
      }
    }
  }

  return orders;
}

// GET: 獲取所有預授權訂單 - 確保不使用緩存
export async function GET(req: NextRequest) {
  try {
    console.log('[PREAUTH_ORDERS_API] 開始從Google Sheets獲取預授權訂單，確保不使用緩存');

    const orders = await getPreAuthOrders();
    
    console.log(`[PREAUTH_ORDERS_API] 成功獲取 ${orders.length} 筆預授權訂單`);
    
    // 添加no-cache headers確保不緩存回應
    const response = NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
      timestamp: new Date().toISOString()
    });
    
    // 設定不緩存的headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error: any) {
    console.error('Get pre-auth orders error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '獲取預授權訂單失敗'
    }, { status: 500 });
  }
} 