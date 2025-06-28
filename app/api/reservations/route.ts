import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Phone, Discount } from '../../../types';
import { getECPayPaymentParams } from '../../../lib/ecpay';
import { deactivateDiscount, getDiscountByCode } from '../../../lib/sheets/discounts';
import { formatDateTimeInTaipei } from '../../../lib/utils';

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

async function ensureReservationsWorksheet(sheets: any, spreadsheetId: string) {
  try {
    // 嘗試讀取 reservations 工作表
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A1',
    });
    console.log('Reservations worksheet exists');
  } catch (error) {
    console.log('Reservations worksheet does not exist, creating...');
    
    // 建立 reservations 工作表
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'reservations',
              },
            },
          },
        ],
      },
    });

    // 設定標題行
    const headers = [
      '訂單編號', '手機ID', '開始日期', '結束日期', 
      '總金額', '客戶姓名', '客戶Email', '客戶電話', 
      '付款狀態', '建立時間', '折扣碼', '總共折扣', '最終付款',
      '租賃文件簽署', '手機載具號碼', '發票號碼', '發票狀態', '發票開立時間'
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'reservations!A1:R1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    console.log('Reservations worksheet created successfully');
  }
}

async function appendToSheet(values: { 
  phone: Phone, 
  startDate: string, 
  endDate: string, 
  name: string, 
  userPhone: string, 
  email: string, 
  totalAmount: number, 
  originalAmount: number, 
  discountCode?: string, 
  discountAmount?: number,
  carrierNumber?: string 
}): Promise<string> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }
  
  await ensureReservationsWorksheet(sheets, spreadsheetId);
  
  const orderId = `RENT${Date.now()}`;
  const createdAt = formatDateTimeInTaipei(new Date());
  const paymentStatus = 'PENDING';

  const newRow = [
    orderId,                        // A: 訂單編號
    values.phone.id,               // B: 手機ID
    values.startDate,              // C: 開始日期
    values.endDate,                // D: 結束日期
    values.originalAmount,         // E: 總金額
    values.name,                   // F: 客戶姓名
    values.email,                  // G: 客戶Email
    values.userPhone,              // H: 客戶電話
    paymentStatus,                 // I: 付款狀態
    createdAt,                     // J: 建立時間
    values.discountCode || '',     // K: 折扣碼
    values.discountAmount || 0,    // L: 總共折扣
    values.totalAmount,            // M: 最終付款
    '',                           // N: 租賃文件簽署（暫空）
    values.carrierNumber || '',   // O: 手機載具號碼
    '',                           // P: 發票號碼（暫空）
    '',                           // Q: 發票狀態（暫空）
    ''                            // R: 發票開立時間（暫空）
  ];

  console.log('Writing to Google Sheets:', newRow);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'reservations!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRow],
    },
  });

  return orderId;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received reservation request:', body);
    
    const { 
      phone, startDate, endDate, name, userPhone, email, 
      totalAmount, originalAmount, discountCode, discountAmount, carrierNumber, isTest 
    } = body;

    if (!phone || !startDate || !endDate || !name || !userPhone || !email || totalAmount === undefined) {
      console.error('Missing required fields:', body);
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const orderId = await appendToSheet({
      phone, startDate, endDate, name, userPhone, email,
      totalAmount, originalAmount, discountCode, discountAmount, carrierNumber
    });
    
    // Deactivate discount if it's a unique one
    if (discountCode) {
      const discount = await getDiscountByCode(discountCode);
      if (discount && discount.type === 'UNIQUE_ONCE') {
        await deactivateDiscount(discountCode);
      }
    }

    // 判斷是否為測試模式
    const useTest = isTest === true;
    const isProduction = process.env.VERCEL_ENV === 'production' && !useTest;

    const merchantID = isProduction ? process.env.ECPAY_MERCHANT_ID : '3002607';
    const hashKey = isProduction ? process.env.ECPAY_HASH_KEY : 'pwFHCqoQZGmho4w6';
    const hashIV = isProduction ? process.env.ECPAY_HASH_IV : 'EkRm7iFT261dpevs';

    if (!merchantID || !hashKey || !hashIV) {
        throw new Error('ECPay credentials are not defined in environment variables for the current environment.');
    }

    // 簡化商品名稱：手機租金
    const phoneModelShort = phone.name.replace('Samsung Galaxy ', '').replace(' Ultra', 'U');
    const ecpayParams = getECPayPaymentParams({
      merchantTradeNo: orderId,
      totalAmount: totalAmount,
      itemName: `${phoneModelShort}租金-IMEI:${phone.id}`,
      merchantID,
      hashKey,
      hashIV,
    });

    return NextResponse.json(ecpayParams);
  } catch (error) {
    console.error('Error creating reservation:', error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    try {
      const range = 'reservations!A:R';
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        return NextResponse.json({ reservations: [] });
      }

      // Skip header row and process data
      const reservations = rows.slice(1).map(row => {
        if (!row || row.length < 9) return null; // Ensure minimum required columns
        
        return {
          orderId: row[0] || '',
          phoneId: row[1] || '',
          startDate: row[2] || '',
          endDate: row[3] || '',
          originalAmount: parseFloat(row[4]) || 0,
          customerName: row[5] || '',
          customerEmail: row[6] || '',
          customerPhone: row[7] || '',
          status: row[8] || 'PENDING',
          createdAt: row[9] || '',
          discountCode: row[10] || '',
          discountAmount: parseFloat(row[11]) || 0,
          totalAmount: parseFloat(row[12]) || 0,
          documentStatus: row[13] || '',
          carrierNumber: row[14] || '',
          invoiceNumber: row[15] || '',
          invoiceStatus: row[16] || '',
          invoiceCreateTime: row[17] || ''
        };
      }).filter(reservation => reservation !== null);

      return NextResponse.json({ reservations });
    } catch (error: any) {
      // If reservations sheet doesn't exist yet
      if (error.message && error.message.includes('Unable to parse range')) {
        console.log("Reservations sheet doesn't exist yet. Returning empty array.");
        return NextResponse.json({ reservations: [] });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching reservations:', error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 