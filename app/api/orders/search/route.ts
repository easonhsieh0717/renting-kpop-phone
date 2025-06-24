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
    
    if (!phone) {
      return NextResponse.json({ message: '請提供手機號碼' }, { status: 400 });
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID is not configured');
    
    const range = 'reservations!A:M';
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values;
    
    if (!rows || rows.length < 2) {
      return NextResponse.json({ message: '查無訂單' }, { status: 404 });
    }

    // 搜尋手機號碼（第8欄，索引7）
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