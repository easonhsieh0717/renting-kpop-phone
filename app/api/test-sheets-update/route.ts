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
        success: false,
        message: 'GOOGLE_SHEET_ID is not configured'
      }, { status: 500 });
    }

    console.log(`[SHEETS_TEST] 使用的工作表ID: ${spreadsheetId}`);

    // 1. 讀取工作表基本信息
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    console.log(`[SHEETS_TEST] 工作表標題: ${sheetInfo.data.properties?.title}`);
    console.log(`[SHEETS_TEST] 工作表URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
    console.log(`[SHEETS_TEST] 工作表包含的子表:`, sheetInfo.data.sheets?.map(sheet => sheet.properties?.title));

    // 2. 讀取第13行的資料
    const row13Response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A13:Z13',
    });

    const row13Data = row13Response.data.values?.[0] || [];
    console.log(`[SHEETS_TEST] 第13行資料:`, row13Data);
    console.log(`[SHEETS_TEST] 第13行A欄(訂單號): ${row13Data[0]}`);
    console.log(`[SHEETS_TEST] 第13行U欄(狀態): ${row13Data[20]}`);

    // 3. 嘗試更新一個測試欄位（使用Z欄作為測試）
    const testValue = `TEST_${Date.now()}`;
    console.log(`[SHEETS_TEST] 嘗試在Z13欄位寫入測試值: ${testValue}`);
    
    const updateResult = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'reservations!Z13',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[testValue]]
      }
    });

    console.log(`[SHEETS_TEST] 更新結果:`, updateResult.status);
    console.log(`[SHEETS_TEST] 更新的儲存格數量:`, updateResult.data.updatedCells);

    // 4. 驗證更新結果
    const verifyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!Z13',
    });

    const actualValue = verifyResponse.data.values?.[0]?.[0] || '';
    console.log(`[SHEETS_TEST] 驗證結果 - 實際值: ${actualValue}`);

    return NextResponse.json({
      success: true,
      data: {
        spreadsheetId,
        spreadsheetTitle: sheetInfo.data.properties?.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        sheets: sheetInfo.data.sheets?.map(sheet => sheet.properties?.title),
        row13Data: {
          orderId: row13Data[0],
          status: row13Data[20],
          fullData: row13Data
        },
        testUpdate: {
          testValue,
          actualValue,
          updateSuccess: testValue === actualValue,
          updateResult: updateResult.status
        }
      }
    });

  } catch (error: any) {
    console.error('[SHEETS_TEST] 錯誤:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '測試失敗',
      error: error.toString()
    }, { status: 500 });
  }
} 