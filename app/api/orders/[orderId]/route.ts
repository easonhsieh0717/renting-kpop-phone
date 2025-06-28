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

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID is not configured');
    const range = 'reservations!A:Z';
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values;
    if (!rows || rows.length < 2) return NextResponse.json({ message: '查無訂單' }, { status: 404 });
    const header = rows[0];
    const order = rows.find(r => r[0] === orderId);
    if (!order) return NextResponse.json({ message: '查無訂單' }, { status: 404 });
    return NextResponse.json(order);
  } catch (e) {
    return NextResponse.json({ message: '查詢失敗' }, { status: 500 });
  }
} 