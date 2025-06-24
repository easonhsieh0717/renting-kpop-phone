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

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    const { signature } = await req.json();
    
    if (!signature) {
      return NextResponse.json({ message: '簽名資料缺失' }, { status: 400 });
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID is not configured');
    
    // 先查詢訂單所在行
    const range = 'reservations!A:M';
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values;
    
    if (!rows || rows.length < 2) {
      return NextResponse.json({ message: '查無訂單' }, { status: 404 });
    }

    const orderIndex = rows.findIndex(row => row[0] === orderId);
    if (orderIndex === -1) {
      return NextResponse.json({ message: '查無訂單' }, { status: 404 });
    }

    // 更新合約簽署狀態（假設在 N 欄，索引 13）
    const updateRange = `reservations!N${orderIndex + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['已簽署']]
      }
    });

    // 這裡可以將簽名圖片上傳到 Google Drive
    // 暫時先記錄到 console
    console.log('Signature saved for order:', orderId);

    return NextResponse.json({ message: '簽署成功' });
  } catch (e) {
    console.error('Sign contract error:', e);
    return NextResponse.json({ message: '簽署失敗' }, { status: 500 });
  }
} 