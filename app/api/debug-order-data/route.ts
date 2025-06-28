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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId') || 'RENT1750990100151';
    
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:Z',
    });

    const rows = response.data.values || [];
    console.log(`Total rows: ${rows.length}`);
    
    // 查找訂單的所有相關資料
    const foundRows = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // 檢查A欄是否完全匹配或包含訂單ID
      if (row[0] && (row[0] === orderId || row[0].includes(orderId))) {
        foundRows.push({
          searchType: 'A欄完全匹配',
          rowIndex: i + 1,
          orderId: row[0],
          phoneId: row[1],
          customerName: row[5],
          depositTransactionNo: row[18], // S欄
          depositAmount: row[19], // T欄
          depositStatus: row[20], // U欄
          captureAmount: row[21], // V欄
          ecpayTradeNo: row[24], // Y欄
          fullRowLength: row.length
        });
      }
      
      // 也檢查S欄預授權交易編號
      if (row[18] && row[18].includes(orderId)) {
        foundRows.push({
          searchType: 'S欄包含訂單ID',
          rowIndex: i + 1,
          orderId: row[0],
          phoneId: row[1],
          customerName: row[5],
          depositTransactionNo: row[18],
          depositAmount: row[19],
          depositStatus: row[20],
          captureAmount: row[21],
          ecpayTradeNo: row[24],
          fullRowLength: row.length
        });
      }
      
      // 檢查所有包含P的預授權交易
      if (row[18] && row[18].includes('P')) {
        foundRows.push({
          searchType: '所有預授權交易(包含P)',
          rowIndex: i + 1,
          orderId: row[0],
          phoneId: row[1],
          customerName: row[5],
          depositTransactionNo: row[18],
          depositAmount: row[19],
          depositStatus: row[20],
          captureAmount: row[21],
          ecpayTradeNo: row[24],
          fullRowLength: row.length
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      searchOrderId: orderId,
      foundRows,
      totalRows: rows.length,
      message: foundRows.length > 0 ? `找到 ${foundRows.length} 個匹配的行` : '沒有找到匹配的行'
    });

  } catch (error: any) {
    console.error('Debug order error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '調試失敗'
    }, { status: 500 });
  }
} 