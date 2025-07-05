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
    const { searchParams } = req.nextUrl;
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: '請提供訂單編號 (orderId)'
      }, { status: 400 });
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 讀取完整的資料範圍
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:BB',
    });

    const rows = response.data.values || [];
    
    // 查找指定訂單
    let targetRow = null;
    let targetRowIndex = -1;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === orderId) {
        targetRow = row;
        targetRowIndex = i + 1; // Google Sheets 行號
        break;
      }
    }

    if (!targetRow) {
      return NextResponse.json({
        success: false,
        message: `找不到訂單 ${orderId}`
      }, { status: 404 });
    }

    // 分析每個欄位
    const columnAnalysis = [];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let i = 0; i < targetRow.length; i++) {
      const columnLetter = i < 26 ? alphabet[i] : `A${alphabet[i - 26]}`;
      columnAnalysis.push({
        index: i,
        column: columnLetter,
        value: targetRow[i] || '',
        dataType: typeof targetRow[i],
        length: (targetRow[i] || '').toString().length
      });
    }

    // 特別檢查可能的 ECPay 交易編號
    const possibleEcpayColumns = columnAnalysis.filter(col => 
      col.value && 
      col.value.toString().length >= 10 && 
      /^\d+$/.test(col.value.toString())
    );

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        rowIndex: targetRowIndex,
        totalColumns: targetRow.length,
        columnAnalysis,
        possibleEcpayColumns,
        specificColumns: {
          S_column: { index: 18, value: targetRow[18] || '', description: '預授權交易編號' },
          T_column: { index: 19, value: targetRow[19] || '', description: '預授權金額' },
          U_column: { index: 20, value: targetRow[20] || '', description: '預授權狀態' },
          V_column: { index: 21, value: targetRow[21] || '', description: '已請款金額' },
          W_column: { index: 22, value: targetRow[22] || '', description: '退刷時間' },
          X_column: { index: 23, value: targetRow[23] || '', description: '損壞費用' },
          Y_column: { index: 24, value: targetRow[24] || '', description: 'ECPay交易編號(預期位置)' },
          Z_column: { index: 25, value: targetRow[25] || '', description: 'Z欄' },
          AA_column: { index: 26, value: targetRow[26] || '', description: 'AA欄' },
          BB_column: { index: 27, value: targetRow[27] || '', description: 'BB欄' }
        }
      }
    });

  } catch (error: any) {
    console.error('Debug preauth data error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '調試失敗'
    }, { status: 500 });
  }
} 