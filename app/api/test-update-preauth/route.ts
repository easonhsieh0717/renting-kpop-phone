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

// 手動更新預授權狀態和ECPay交易編號
async function updatePreAuthManually(transactionNo: string, ecpayTradeNo: string, status: string = 'HELD') {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 獲取所有資料來查找預授權交易號
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:BB',
    });

    const rows = response.data.values;
    if (!rows) return false;

    // 查找包含該預授權交易號的行（S欄是保證金交易編號）
    const rowIndex = rows.findIndex((row: any) => row[18] === transactionNo); // S欄索引是18
    if (rowIndex === -1) {
      console.log(`Pre-auth transaction ${transactionNo} not found`);
      return false;
    }

    // 同時更新ECPay交易編號和狀態
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `reservations!Y${rowIndex + 1}`, // Y欄：ECPay交易編號
            values: [[ecpayTradeNo]]
          },
          {
            range: `reservations!U${rowIndex + 1}`, // U欄：保證金狀態
            values: [[status]]
          }
        ]
      }
    });

    console.log(`Updated pre-auth status for transaction ${transactionNo} to ${status} with ECPay TradeNo: ${ecpayTradeNo}`);
    return true;
  } catch (error) {
    console.error('Error updating pre-auth status:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionNo, ecpayTradeNo, status = 'HELD' } = body;

    if (!transactionNo || !ecpayTradeNo) {
      return NextResponse.json({
        success: false,
        message: '請提供 transactionNo 和 ecpayTradeNo'
      }, { status: 400 });
    }

    console.log('Manually updating pre-auth:', { transactionNo, ecpayTradeNo, status });

    const success = await updatePreAuthManually(transactionNo, ecpayTradeNo, status);

    if (success) {
      return NextResponse.json({
        success: true,
        message: '預授權狀態更新成功',
        data: { transactionNo, ecpayTradeNo, status }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '找不到對應的預授權交易記錄'
      }, { status: 404 });
    }

  } catch (error: any) {
    console.error('Manual pre-auth update error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '更新失敗'
    }, { status: 500 });
  }
} 