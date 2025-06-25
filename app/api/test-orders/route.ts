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

export async function POST(req: NextRequest) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 生成3筆測試訂單
    const testOrders = [
      [
        'TEST001', // A: 訂單編號
        'iPhone 15 Pro', // B: 手機ID
        '2024-01-15', // C: 開始日期
        '2024-01-22', // D: 結束日期
        '2100', // E: 原始金額
        '李測試', // F: 客戶姓名
        'test1@example.com', // G: Email
        '0912345678', // H: 電話
        'PAID', // I: 付款狀態
        '2024-01-15 10:30', // J: 建立時間
        '0', // K: 折扣碼
        '2100', // L: 最終付款
        '已付款', // M: 付款狀態中文
        '已簽署', // N: 文件簽署狀態
        '/A1B2C3D4', // O: 手機載具號碼
        '', // P: 發票號碼（待補開）
        '', // Q: 發票狀態（待補開）
        '' // R: 發票開立時間（待補開）
      ],
      [
        'TEST002',
        'Samsung S24 Ultra',
        '2024-01-16',
        '2024-01-23',
        '1800',
        '王測試',
        'test2@example.com',
        '0923456789',
        'PAID',
        '2024-01-16 14:20',
        '0',
        '1800',
        '已付款',
        '已簽署',
        '', // 無載具（雲端發票）
        '',
        '',
        ''
      ],
      [
        'TEST003',
        'iPhone 14 Pro Max',
        '2024-01-17',
        '2024-01-24',
        '1900',
        '張測試',
        'test3@example.com',
        '0934567890',
        'PAID',
        '2024-01-17 16:45',
        '0',
        '1900',
        '已付款',
        '已簽署',
        '/E5F6G7H8',
        '',
        '',
        ''
      ]
    ];

    // 先檢查是否已有測試訂單
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:A',
    });

    const existingIds = response.data.values?.flat() || [];
    const hasTestOrders = testOrders.some(order => existingIds.includes(order[0]));

    if (hasTestOrders) {
      return NextResponse.json({ 
        message: '測試訂單已存在',
        note: '如需重新生成，請先手動刪除 TEST001, TEST002, TEST003'
      });
    }

    // 添加測試訂單到Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'reservations!A:R',
      valueInputOption: 'RAW',
      requestBody: {
        values: testOrders,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: '成功生成3筆測試訂單',
      orders: testOrders.map(order => ({
        id: order[0],
        customer: order[5],
        phone: order[1],
        amount: order[11],
        carrier: order[14] || '無載具'
      }))
    });

  } catch (error: any) {
    console.error('生成測試訂單失敗:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || '生成測試訂單失敗' 
    }, { status: 500 });
  }
} 