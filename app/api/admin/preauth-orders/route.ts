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

  console.log(`[PREAUTH_DEBUG] Found ${rows.length} rows in total`);
  
  // 檢查標題行，確認欄位對應
  if (rows.length > 0) {
    const headers = rows[0];
    console.log(`[PREAUTH_DEBUG] Headers: A=${headers[0]}, S=${headers[18]}, T=${headers[19]}, U=${headers[20]}, Y=${headers[24]}`);
  }
  
  // 跳過標題行，從第二行開始  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // 檢查是否有預授權交易編號（S欄）
    const depositTransactionNo = row[18] || ''; // S欄：保證金交易編號（索引18）
    const orderId = row[0] || '';
    
    // 詳細調試特定行
    if (orderId.includes('RENT1750815760740') || i === 12) { // 第13行對應索引12
      console.log(`[PREAUTH_DEBUG] 檢查第${i+1}行(索引${i}): 訂單=${orderId}`);
      console.log(`[PREAUTH_DEBUG] S欄(索引18): "${row[18]}"`);
      console.log(`[PREAUTH_DEBUG] T欄(索引19): "${row[19]}"`);
      console.log(`[PREAUTH_DEBUG] U欄(索引20): "${row[20]}"`);
      console.log(`[PREAUTH_DEBUG] 完整行資料:`, row.slice(0, 25));
    }
    
    if (depositTransactionNo && depositTransactionNo.includes('P')) { // P代表PreAuth
      const customerName = row[5] || ''; // F欄：客戶姓名
      const phoneModel = row[1] || ''; // B欄：手機ID
      const paymentStatus = row[8] || ''; // I欄：付款狀態
      const ecpayTradeNo = row[24] || ''; // Y欄：ECPay交易編號
      const depositAmount = parseInt(row[19]) || 0; // T欄：保證金金額
      const depositStatus = row[20] || ''; // U欄：保證金狀態
      const captureAmount = parseInt(row[21]) || 0; // V欄：已請款金額
      
      // 特別針對RENT1750815760740進行詳細調試
      if (orderId === 'RENT1750815760740') {
        console.log(`[PREAUTH_DEBUG] ===== 詳細調試 ${orderId} =====`);
        console.log(`[PREAUTH_DEBUG] T欄原始值: "${row[19]}", 類型: ${typeof row[19]}`);
        console.log(`[PREAUTH_DEBUG] 轉換後金額: ${depositAmount}`);
        console.log(`[PREAUTH_DEBUG] V欄原始值: "${row[21]}", 類型: ${typeof row[21]}`);
        console.log(`[PREAUTH_DEBUG] 轉換後已請款金額: ${captureAmount}`);
        console.log(`[PREAUTH_DEBUG] U欄狀態: "${depositStatus}"`);
        console.log(`[PREAUTH_DEBUG] 完整行資料:`, row.slice(18, 26)); // S到Z欄
        console.log(`[PREAUTH_DEBUG] ================================`);
      }
      
      console.log(`[PREAUTH_DEBUG] 找到預授權訂單: ${orderId}, 金額: ${depositAmount}, 狀態: ${depositStatus}, 交易編號: ${depositTransactionNo}`);
      
      // 返回所有預授權訂單（包括VOID狀態，讓用戶看到完整狀況）
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

  console.log(`[PREAUTH_DEBUG] 總共找到 ${orders.length} 筆預授權訂單`);
  
  // 如果沒有找到任何預授權訂單，檢查所有包含P的行
  if (orders.length === 0) {
    console.log(`[PREAUTH_DEBUG] 沒有找到預授權訂單，檢查所有可能的預授權資料...`);
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const orderId = row[0] || '';
      const sColumn = row[18] || ''; // S欄
      
      if (sColumn && sColumn.toString().includes('P')) {
        console.log(`[PREAUTH_DEBUG] 發現包含P的S欄資料 - 第${i+1}行: 訂單=${orderId}, S欄="${sColumn}", U欄="${row[20]}"`);
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