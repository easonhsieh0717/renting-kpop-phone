import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

// 欄位對應配置
const COLUMN_MAPPING = {
  // A-R (0-17): 基本訂單資訊
  ORDER_ID: 0,              // A: 訂單編號
  CUSTOMER_NAME: 1,         // B: 客戶姓名
  PHONE: 2,                 // C: 電話
  EMAIL: 3,                 // D: 電子郵件
  START_DATE: 4,            // E: 開始日期
  END_DATE: 5,              // F: 結束日期
  DAYS: 6,                  // G: 天數
  PHONE_MODEL: 7,           // H: 手機型號
  PHONE_IMEI: 8,            // I: IMEI
  DAILY_RATE: 9,            // J: 日租金
  TOTAL_AMOUNT: 10,         // K: 總金額
  DISCOUNT_AMOUNT: 11,      // L: 折扣金額
  FINAL_AMOUNT: 12,         // M: 最終金額
  PAYMENT_STATUS: 13,       // N: 付款狀態
  PAYMENT_TIME: 14,         // O: 付款時間
  RETURN_STATUS: 15,        // P: 歸還狀態
  RETURN_TIME: 16,          // Q: 歸還時間
  NOTES: 17,                // R: 備註

  // S-Z (18-25): 保證金/預授權資訊
  DEPOSIT_TRADE_NO: 18,     // S: 保證金交易編號 (D=保證金, P=預授權)
  DEPOSIT_AMOUNT: 19,       // T: 保證金金額
  DEPOSIT_STATUS: 20,       // U: 保證金狀態
  REFUND_AMOUNT: 21,        // V: 已退刷/請款金額
  REFUND_TIME: 22,          // W: 退刷/請款時間
  DAMAGE_FEE: 23,           // X: 損壞費用
  ECPAY_TRADE_NO: 24,       // Y: ECPay交易編號
  EXTRA_NOTES: 25,          // Z: 額外備註
};

export async function GET(request: NextRequest) {
  try {
    // 建立 Google Sheets 連接
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // 讀取標題行
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A1:Z1',
    });

    const headers = headerResponse.data.values?.[0] || [];

    // 檢查欄位對應
    const mappingCheck = Object.entries(COLUMN_MAPPING).map(([fieldName, columnIndex]) => ({
      fieldName,
      columnIndex,
      columnLetter: String.fromCharCode(65 + columnIndex), // A=65
      currentHeader: headers[columnIndex] || '(空白)',
      isCorrect: headers[columnIndex] !== undefined
    }));

    return NextResponse.json({
      success: true,
      columnMapping: COLUMN_MAPPING,
      currentHeaders: headers,
      mappingCheck,
      totalColumns: headers.length,
      expectedColumns: Object.keys(COLUMN_MAPPING).length
    });

  } catch (error) {
    console.error('Column mapping test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'updateHeaders') {
      // 更新標題行
      const auth = new GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      // 標準標題行
      const standardHeaders = [
        '訂單編號', '客戶姓名', '電話', '電子郵件', '開始日期', '結束日期', '天數', '手機型號', 
        'IMEI', '日租金', '總金額', '折扣金額', '最終金額', '付款狀態', '付款時間', '歸還狀態', 
        '歸還時間', '備註', '保證金交易編號', '保證金金額', '保證金狀態', '已退刷金額', 
        '退刷時間', '損壞費用', 'ECPay交易編號', '額外備註'
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A1:Z1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [standardHeaders]
        }
      });

      return NextResponse.json({
        success: true,
        message: '標題行已更新',
        headers: standardHeaders
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Column mapping update error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 