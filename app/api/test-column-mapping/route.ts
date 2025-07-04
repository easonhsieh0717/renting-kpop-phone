import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

// 根據實際資料排列的欄位對應配置
const COLUMN_MAPPING = {
  // 基本訂單資訊（根據實際資料排列）
  ORDER_ID: 0,              // A: 訂單編號
  PHONE_IMEI: 1,            // B: IMEI (手機ID)
  START_DATE: 2,            // C: 開始日期
  END_DATE: 3,              // D: 結束日期
  TOTAL_AMOUNT: 4,          // E: 總金額
  CUSTOMER_NAME: 5,         // F: 客戶姓名
  CUSTOMER_EMAIL: 6,        // G: 客戶Email
  CUSTOMER_PHONE: 7,        // H: 客戶電話
  PAYMENT_STATUS: 8,        // I: 付款狀態
  CREATE_TIME: 9,           // J: 建立時間
  DISCOUNT_CODE: 10,        // K: 折扣碼
  DISCOUNT_AMOUNT: 11,      // L: 總共折扣
  FINAL_PAYMENT: 12,        // M: 最終付款
  CONTRACT_SIGNATURE: 13,   // N: 租賃文件簽署
  CARRIER_NUMBER: 14,       // O: 手機載具號碼
  INVOICE_NO: 15,           // P: 發票編號
  INVOICE_STATUS: 16,       // Q: 發票狀態
  INVOICE_TIME: 17,         // R: 發票時間

  // S-Z: 保證金/預授權資訊
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

      // 根據標準的欄位對應配置
      const standardHeaders = [
        '訂單編號',         // A(0): 訂單編號
        'IMEI',             // B(1): IMEI
        '開始日期',         // C(2): 開始日期
        '結束日期',         // D(3): 結束日期
        '總金額',           // E(4): 總金額
        '客戶姓名',         // F(5): 客戶姓名
        '客戶Email',        // G(6): 客戶Email
        '客戶電話',         // H(7): 客戶電話
        '付款狀態',         // I(8): 付款狀態
        '建立時間',         // J(9): 建立時間
        '折扣碼',           // K(10): 折扣碼
        '總共折扣',         // L(11): 總共折扣
        '最終付款',         // M(12): 最終付款
        '租賃文件簽署',     // N(13): 租賃文件簽署
        '手機載具號碼',     // O(14): 手機載具號碼
        '發票號碼',         // P(15): 發票號碼
        '發票狀態',         // Q(16): 發票狀態
        '發票開立時間',     // R(17): 發票開立時間
        '保證金交易編號',   // S(18): 保證金交易編號
        '保證金金額',       // T(19): 保證金金額
        '保證金狀態',       // U(20): 保證金狀態
        '已退刷金額',       // V(21): 已退刷金額
        '退刷時間',         // W(22): 退刷時間
        '損壞費用',         // X(23): 損壞費用
        'ECPay交易編號',    // Y(24): ECPay交易編號
        '額外備註'          // Z(25): 額外備註
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