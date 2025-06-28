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

// 標準化的標題行
const STANDARD_HEADERS = [
  // A-R: 基本訂單資訊
  '訂單編號',           // A(0)
  '手機ID',            // B(1)
  '開始日期',          // C(2)
  '結束日期',          // D(3)
  '原始金額',          // E(4)
  '客戶姓名',          // F(5)
  '客戶Email',         // G(6)
  '客戶電話',          // H(7)
  '付款狀態',          // I(8)
  '建立時間',          // J(9)
  '折扣碼',            // K(10)
  '折扣金額',          // L(11)
  '最終付款',          // M(12)
  '租賃文件簽署',      // N(13)
  '手機載具號碼',      // O(14)
  '發票號碼',          // P(15)
  '發票狀態',          // Q(16)
  '發票開立時間',      // R(17)
  
  // S-Z: 保證金/預授權資訊
  '保證金交易編號',    // S(18)
  '保證金金額',        // T(19)
  '保證金狀態',        // U(20)
  '已退刷/請款金額',   // V(21)
  '退刷/請款時間',     // W(22)
  '損壞費用',          // X(23)
  'ECPay交易編號',     // Y(24)
  '備註'               // Z(25)
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminKey, preview = false } = body;
    
    // 簡單的管理員驗證
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ 
        success: false, 
        message: '無權限執行此操作' 
      }, { status: 403 });
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 獲取目前的標題行
    const currentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A1:Z1',
    });

    const currentHeaders = currentResponse.data.values?.[0] || [];
    
    // 比較差異
    const differences = [];
    for (let i = 0; i < Math.max(currentHeaders.length, STANDARD_HEADERS.length); i++) {
      const current = currentHeaders[i] || '空白';
      const standard = STANDARD_HEADERS[i] || '空白';
      
      if (current !== standard) {
        const columnLetter = String.fromCharCode(65 + i); // A, B, C...
        differences.push({
          column: `${columnLetter}(${i})`,
          current,
          standard,
          action: current === '空白' ? '新增' : standard === '空白' ? '移除' : '修改'
        });
      }
    }

    if (preview) {
      // 預覽模式：只顯示會做什麼改變
      return NextResponse.json({
        success: true,
        message: differences.length === 0 ? '標題行已經是最新的' : `發現 ${differences.length} 個需要更新的欄位`,
        preview: true,
        currentHeaders,
        standardHeaders: STANDARD_HEADERS,
        differences,
        wouldUpdate: differences.length > 0
      });
    }

    // 執行更新
    if (differences.length === 0) {
      return NextResponse.json({
        success: true,
        message: '標題行已經是最新的，無需更新',
        currentHeaders,
        differences: []
      });
    }

    console.log(`準備更新 ${differences.length} 個標題欄位...`);

    // 更新標題行
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'reservations!A1:Z1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [STANDARD_HEADERS],
      },
    });

    console.log('標題行更新完成！');

    return NextResponse.json({
      success: true,
      message: `成功更新了 ${differences.length} 個標題欄位`,
      updatedHeaders: STANDARD_HEADERS,
      differences,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('更新標題行失敗:', error);
    return NextResponse.json({
      success: false,
      message: `更新失敗: ${error.message}`,
      error: error.toString()
    }, { status: 500 });
  }
}

// GET: 查看目前的標題行狀態
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const adminKey = url.searchParams.get('adminKey');
    
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ 
        success: false, 
        message: '無權限執行此操作' 
      }, { status: 403 });
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A1:Z1',
    });

    const currentHeaders = response.data.values?.[0] || [];
    
    // 檢查一致性
    const isConsistent = currentHeaders.length === STANDARD_HEADERS.length &&
      currentHeaders.every((header, index) => header === STANDARD_HEADERS[index]);

    return NextResponse.json({
      success: true,
      isConsistent,
      currentHeaders,
      standardHeaders: STANDARD_HEADERS,
      message: isConsistent ? '標題行與標準一致' : '標題行需要更新'
    });

  } catch (error: any) {
    console.error('查詢標題行失敗:', error);
    return NextResponse.json({
      success: false,
      message: `查詢失敗: ${error.message}`
    }, { status: 500 });
  }
} 