import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Phone, Discount } from '../../../types';
import { getECPayPaymentParams } from '../../../lib/ecpay';
import { deactivateDiscount, getDiscountByCode } from '../../../lib/sheets/discounts';

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
      '原始總金額', '客戶姓名', '客戶Email', '客戶電話', 
      '付款狀態', '建立時間', '折扣碼', '折扣金額', '最終金額'
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'reservations!A1:M1',
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
  discountAmount?: number 
}): Promise<string> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }
  
  await ensureReservationsWorksheet(sheets, spreadsheetId);
  
  const orderId = `RENT${Date.now()}`;
  const createdAt = new Date().toISOString();
  const paymentStatus = 'PENDING';

  const newRow = [
    orderId,
    values.phone.id,
    values.startDate,
    values.endDate,
    values.originalAmount,
    values.name,
    values.email,
    values.userPhone,
    paymentStatus,
    createdAt,
    values.discountCode || '',
    values.discountAmount || 0,
    values.totalAmount
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
      totalAmount, originalAmount, discountCode, discountAmount 
    } = body;

    if (!phone || !startDate || !endDate || !name || !userPhone || !email || totalAmount === undefined) {
      console.error('Missing required fields:', body);
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const orderId = await appendToSheet({
      phone, startDate, endDate, name, userPhone, email,
      totalAmount, originalAmount, discountCode, discountAmount
    });
    
    // Deactivate discount if it's a unique one
    if (discountCode) {
      const discount = await getDiscountByCode(discountCode);
      if (discount && discount.type === 'UNIQUE_ONCE') {
        await deactivateDiscount(discountCode);
      }
    }

    const isProduction = process.env.VERCEL_ENV === 'production';

    const merchantID = isProduction ? process.env.ECPAY_MERCHANT_ID : '3002607';
    const hashKey = isProduction ? process.env.ECPAY_HASH_KEY : 'pwFHCqoQZGmho4w6';
    const hashIV = isProduction ? process.env.ECPAY_HASH_IV : 'EkRm7iFT261dpevs';

    if (!merchantID || !hashKey || !hashIV) {
        throw new Error('ECPay credentials are not defined in environment variables for the current environment.');
    }

    const ecpayParams = getECPayPaymentParams({
      merchantTradeNo: orderId,
      totalAmount: totalAmount,
      itemName: `${phone.name} ${phone.spec}`,
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