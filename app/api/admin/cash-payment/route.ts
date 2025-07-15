import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { updateReservationStatus } from '@/lib/sheets/reservations';

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

// 獲取所有pending的訂單
export async function GET(req: NextRequest) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      return NextResponse.json({
        success: false,
        message: 'GOOGLE_SHEET_ID is not configured'
      }, { status: 500 });
    }

    // 獲取所有訂單資料
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:R',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return NextResponse.json({
        success: true,
        orders: [],
        message: '沒有找到訂單資料'
      });
    }

    // 篩選pending狀態的訂單
    const pendingOrders = rows.slice(1).filter((row: any) => {
      const paymentStatus = row[8]; // I欄：付款狀態
      return paymentStatus === 'PENDING' || paymentStatus === 'pending';
    }).map((row: any) => ({
      orderId: row[0], // A欄：訂單編號
      customerName: row[5] || '未提供', // F欄：客戶姓名
      customerPhone: row[7] || '', // H欄：客戶電話
      customerEmail: row[6] || '', // G欄：客戶Email
      phoneModel: row[1] || '', // B欄：手機型號
      startDate: row[2] || '', // C欄：開始日期
      endDate: row[3] || '', // D欄：結束日期
      originalAmount: parseFloat(row[4]) || 0, // E欄：原始金額
      finalAmount: parseFloat(row[12]) || 0, // M欄：最終金額
      paymentStatus: row[8] || '', // I欄：付款狀態
      documentStatus: row[9] || '', // J欄：文件狀態
      invoiceStatus: row[16] || '', // Q欄：發票狀態
      rowIndex: rows.indexOf(row) + 1 // 用於更新時的定位
    }));

    return NextResponse.json({
      success: true,
      orders: pendingOrders,
      totalCount: pendingOrders.length,
      message: `找到 ${pendingOrders.length} 筆待付款訂單`
    });

  } catch (error) {
    console.error('獲取pending訂單失敗:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}

// 處理現金支付
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    
    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: '請提供訂單編號'
      }, { status: 400 });
    }

    console.log(`[CASH_PAYMENT] 開始處理現金支付: ${orderId}`);

    // 更新付款狀態為PAID
    await updateReservationStatus(orderId, 'PAID');
    
    console.log(`[CASH_PAYMENT] 訂單 ${orderId} 現金支付處理完成`);

    return NextResponse.json({
      success: true,
      message: `訂單 ${orderId} 現金支付處理成功`,
      orderId: orderId
    });

  } catch (error) {
    console.error('現金支付處理失敗:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
} 