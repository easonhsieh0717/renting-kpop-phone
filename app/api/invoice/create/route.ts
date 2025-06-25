import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getECPayInvoiceParams } from '../../../../lib/ecpay';

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

async function updateInvoiceStatus(orderId: string, invoiceNumber: string, status: string) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  // 先找到訂單的行號
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'reservations!A:A',
  });

  const rows = response.data.values;
  if (!rows) return;

  const rowIndex = rows.findIndex(row => row[0] === orderId);
  if (rowIndex === -1) return;

  // 更新發票相關欄位 (P=發票號碼, Q=發票狀態, R=發票開立時間)
  const updateRange = `reservations!P${rowIndex + 1}:R${rowIndex + 1}`;
  const currentTime = new Date().toISOString();
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: updateRange,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[invoiceNumber, status, currentTime]],
    },
  });
}

async function getOrderData(orderId: string) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'reservations!A:R',
  });

  const rows = response.data.values;
  if (!rows) return null;

  const orderRow = rows.find(row => row[0] === orderId);
  if (!orderRow) return null;

  return {
    orderId: orderRow[0],
    phoneId: orderRow[1],
    startDate: orderRow[2],
    endDate: orderRow[3],
    originalAmount: orderRow[4],
    customerName: orderRow[6],
    customerPhone: orderRow[7],
    customerEmail: orderRow[8],
    paymentStatus: orderRow[12],
    finalAmount: orderRow[11],
    carrierNumber: orderRow[14] || '' // O欄是手機載具號碼
  };
}

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    
    if (!orderId) {
      return NextResponse.json({ message: 'Missing orderId' }, { status: 400 });
    }

    // 取得訂單資料
    const orderData = await getOrderData(orderId);
    if (!orderData) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // 檢查付款狀態
    if (orderData.paymentStatus !== 'PAID') {
      return NextResponse.json({ message: 'Order not paid yet' }, { status: 400 });
    }

    // 準備發票參數
    const isProduction = process.env.VERCEL_ENV === 'production';
    const merchantID = process.env.ECPAY_INVOICE_MERCHANT_ID || '3383324';
    const hashKey = process.env.ECPAY_INVOICE_HASH_KEY;
    const hashIV = process.env.ECPAY_INVOICE_HASH_IV;

    if (!hashKey || !hashIV) {
      throw new Error('ECPay invoice credentials not configured');
    }

    const invoiceParams = getECPayInvoiceParams({
      merchantID,
      hashKey,
      hashIV,
      relateNumber: orderId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerEmail: orderData.customerEmail,
      carrierNumber: orderData.carrierNumber,
      itemName: '手機租賃服務',
      itemPrice: parseInt(orderData.finalAmount)
    });

    // 呼叫綠界發票API
    const ecpayInvoiceUrl = isProduction 
      ? 'https://einvoice.ecpay.com.tw/B2CInvoice/Issue'
      : 'https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue';

    const formData = new URLSearchParams();
    Object.entries(invoiceParams).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const response = await fetch(ecpayInvoiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const result = await response.text();
    console.log('ECPay Invoice Response:', result);

    // 解析回應
    const resultParams = new URLSearchParams(result);
    const rtnCode = resultParams.get('RtnCode');
    const rtnMsg = resultParams.get('RtnMsg');
    const invoiceNumber = resultParams.get('InvoiceNumber') || '';

    if (rtnCode === '1') {
      // 發票開立成功
      await updateInvoiceStatus(orderId, invoiceNumber, '已開立');
      
      return NextResponse.json({
        success: true,
        invoiceNumber,
        message: '發票開立成功'
      });
    } else {
      // 發票開立失敗
      await updateInvoiceStatus(orderId, '', `失敗: ${rtnMsg}`);
      
      return NextResponse.json({
        success: false,
        message: `發票開立失敗: ${rtnMsg}`
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || '發票開立失敗' 
    }, { status: 500 });
  }
} 