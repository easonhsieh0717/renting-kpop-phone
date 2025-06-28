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
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({
        error: 'GOOGLE_SHEET_ID is not configured'
      }, { status: 500 });
    }

    // 強制不使用緩存，直接從Google Sheets讀取
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:Z',
      dateTimeRenderOption: 'FORMATTED_STRING',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    const rows = response.data.values || [];
    const targetOrderId = 'RENT1750815760740';
    
    let foundRow = null;
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === targetOrderId) {
        foundRow = row;
        rowIndex = i + 1;
        break;
      }
    }

    if (!foundRow) {
      return NextResponse.json({
        error: `未找到訂單 ${targetOrderId}`,
        totalRows: rows.length,
        timestamp: new Date().toISOString()
      });
    }

    const result = {
      找到訂單: targetOrderId,
      Google_Sheets行號: rowIndex,
      讀取時間: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      原始數據: {
        A欄_訂單編號: foundRow[0],
        B欄_手機ID: foundRow[1],
        F欄_客戶姓名: foundRow[5],
        S欄_保證金交易編號: foundRow[18],
        T欄_保證金金額_原始值: foundRow[19],
        T欄_保證金金額_類型: typeof foundRow[19],
        T欄_保證金金額_轉換後: parseInt(foundRow[19]) || 0,
        U欄_保證金狀態: foundRow[20],
        V欄_已請款金額_原始值: foundRow[21],
        V欄_已請款金額_類型: typeof foundRow[21],
        V欄_已請款金額_轉換後: parseInt(foundRow[21]) || 0,
        W欄_退刷時間: foundRow[22],
        X欄_損壞費用: foundRow[23],
        Y欄_ECPay交易編號: foundRow[24],
        Z欄_備註: foundRow[25]
      },
      完整行資料: foundRow.slice(0, 30),
      API構建的預授權對象: {
        orderId: foundRow[0],
        customerName: foundRow[5] || '',
        phoneModel: foundRow[1] || '',
        depositAmount: parseInt(foundRow[19]) || 0,
        depositStatus: foundRow[20] || '',
        captureAmount: parseInt(foundRow[21]) || 0,
        ecpayTradeNo: foundRow[24] || '',
        depositTransactionNo: foundRow[18] || ''
      }
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 