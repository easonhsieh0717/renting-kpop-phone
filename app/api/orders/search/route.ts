import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const status = searchParams.get('status');
    
    // 如果是狀態查詢（管理界面）
    if (status) {
      return await getOrdersByStatus(status);
    }
    
    // 原有的手機號碼查詢
    if (!phone) {
      return NextResponse.json({ message: '請提供手機號碼' }, { status: 400 });
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID is not configured');
    
    const range = 'reservations!A:R'; // 擴展到R欄包含發票資訊
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values;
    
    if (!rows || rows.length < 2) {
      return NextResponse.json({ message: '查無訂單' }, { status: 404 });
    }

    // 搜尋手機號碼（H欄，索引7）
    const order = rows.find(row => row[7] === phone);
    
    if (!order) {
      return NextResponse.json({ message: '查無此手機號碼的訂單' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (e) {
    console.error('Search order error:', e);
    return NextResponse.json({ message: '查詢失敗' }, { status: 500 });
  }
}

async function getOrdersByStatus(status: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID is not configured');
    
    const range = 'reservations!A:R'; // 包含發票資訊
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values;
    
    if (!rows || rows.length < 2) {
      return NextResponse.json({ orders: [] });
    }

    // 篩選已付款的訂單
    const filteredOrders = rows.slice(1).filter(row => {
      if (status === 'paid') {
        return row[8] === 'PAID'; // I欄（索引8）是付款狀態
      }
      return false;
    }).map(row => ({
      id: row[0] || '',
      customerName: row[5] || '',
      customerPhone: row[7] || '',
      customerEmail: row[6] || '',
      phoneModel: row[1] || '',
      orderAmount: parseInt(row[12]) || 0,
      paymentStatus: row[8] || '',
      documentStatus: row[13] || '', // 租賃文件簽署(N欄)
      carrierNumber: row[14] || '', // 手機載具號碼(O欄)
      invoiceNumber: row[15] || '', // 發票號碼(P欄)
      invoiceStatus: row[16] || '', // 發票狀態(Q欄)
      invoiceCreateTime: row[17] || '' // 發票開立時間(R欄)
    }));

    return NextResponse.json({ orders: filteredOrders });
  } catch (e) {
    console.error('Get orders by status error:', e);
    return NextResponse.json({ message: '查詢失敗' }, { status: 500 });
  }
} 