import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import crypto from 'crypto';
import { formatDateTimeInTaipei } from '@/lib/utils';

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
  const currentTime = formatDateTimeInTaipei(new Date());
  
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
    customerName: orderRow[5],
    customerEmail: orderRow[6],
    customerPhone: orderRow[7],
    paymentStatus: orderRow[8],
    finalAmount: orderRow[12], // M欄（索引12）是最終付款金額
    carrierNumber: orderRow[14] || '' // O欄是手機載具號碼
  };
}

// 使用之前成功的AES加密方式
function aesEncrypt(plainText: string, key: string, iv: string): string {
  const keyBuffer = Buffer.alloc(16);
  keyBuffer.write(key.substring(0, 16), 0, 'utf8');
  
  const ivBuffer = Buffer.alloc(16);
  ivBuffer.write(iv.substring(0, 16), 0, 'utf8');
  
  const cipher = crypto.createCipheriv('aes-128-cbc', keyBuffer, ivBuffer);
  cipher.setAutoPadding(true);
  
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return encrypted;
}

// 使用之前成功的AES解密方式
function aesDecrypt(encryptedData: string, key: string, iv: string): string {
  const keyBuffer = Buffer.alloc(16);
  keyBuffer.write(key.substring(0, 16), 0, 'utf8');
  
  const ivBuffer = Buffer.alloc(16);
  ivBuffer.write(iv.substring(0, 16), 0, 'utf8');
  
  const decipher = crypto.createDecipheriv('aes-128-cbc', keyBuffer, ivBuffer);
  decipher.setAutoPadding(true);
  
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId', message: 'Missing orderId' }, { status: 400 });
    }

    // 取得訂單資料
    const orderData = await getOrderData(orderId);
    if (!orderData) {
      return NextResponse.json({ error: 'Order not found', message: 'Order not found' }, { status: 404 });
    }

    // 檢查付款狀態
    if (orderData.paymentStatus !== 'PAID') {
      return NextResponse.json({ error: 'Order not paid yet', message: 'Order not paid yet' }, { status: 400 });
    }

    // 判斷環境：localhost使用測試憑證，Vercel使用正式憑證
    const host = req.headers.get('host');
    const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
    
    console.log('Environment check:', {
      host,
      isLocalhost,
      url: req.url
    });
    
    let merchantID: string;
    let hashKey: string;
    let hashIV: string;
    let isProduction: boolean;

    if (isLocalhost) {
      // 本地環境強制使用ECPay官方測試憑證
      merchantID = '3085340';
      hashKey = 'HwiqPsywG1hLQNuN';
      hashIV = 'YqITWD4TyKacYXpn';
      isProduction = false;
      console.log('Using ECPay official test credentials:', {
        merchantID,
        hashKey,
        hashIV,
        isProduction
      });
    } else {
      // 生產環境使用您的正式憑證
      merchantID = process.env.ECPAY_MERCHANT_ID || '3383324';
      hashKey = process.env.ECPAY_HASH_KEY!;
      hashIV = process.env.ECPAY_HASH_IV!;
      isProduction = merchantID === '3383324';
      
      console.log('Using production ECPay credentials:', {
        merchantID,
        hashKeyExists: !!hashKey,
        hashIVExists: !!hashIV,
        isProduction,
        hashKeyPrefix: hashKey?.substring(0, 8) + '...'
      });

      if (!hashKey || !hashIV) {
        throw new Error('ECPay credentials not configured');
      }
    }

    // 準備發票資料（根據ECPay B2C發票規範）
    const timestamp = Math.floor(Date.now() / 1000);
    
    // 載具設定：根據ECPay規範，'3'表示手機條碼載具，' '表示不使用載具（雲端發票）
    const carrierType = orderData.carrierNumber ? '3' : ' ';
    const carrierNum = orderData.carrierNumber || '';
    
    const invoiceData = {
      MerchantID: merchantID,
      RelateNumber: orderId,
      CustomerName: orderData.customerName,
      CustomerAddr: '',
      CustomerPhone: orderData.customerPhone,
      CustomerEmail: orderData.customerEmail || '',
      ClearanceMark: '',
      Print: '0',
      Donation: '0',
      LoveCode: '',
      CarrierType: carrierType,
      CarrierNum: carrierNum,
      TaxType: '1',
      SpecialTaxType: 0,
      SalesAmount: parseInt(orderData.finalAmount),
      InvoiceRemark: '手機租賃服務',
      InvType: '07',
      vat: '1',
      Items: [{
        ItemName: '手機租賃服務',
        ItemCount: 1,
        ItemWord: 'pcs',
        ItemPrice: parseInt(orderData.finalAmount),
        ItemTaxType: '1',
        ItemAmount: parseInt(orderData.finalAmount)
      }]
    };

    console.log('Invoice data:', invoiceData);

    // 將資料轉為JSON並進行URL編碼（使用之前成功的方式）
    const jsonString = JSON.stringify(invoiceData);
    console.log('JSON string:', jsonString);
    const urlEncodedData = encodeURIComponent(jsonString);
    console.log('URL encoded data:', urlEncodedData);

    // AES加密
    const encryptedData = aesEncrypt(urlEncodedData, hashKey, hashIV);
    console.log('Encrypted data:', encryptedData);

    // 準備請求參數
    const requestPayload = {
      MerchantID: merchantID,
      RqHeader: {
        Timestamp: timestamp
      },
      Data: encryptedData
    };

    console.log('Request payload:', requestPayload);

    // 呼叫ECPay B2C發票API
    const apiUrl = isProduction 
      ? 'https://einvoice.ecpay.com.tw/B2CInvoice/Issue'
      : 'https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue';
    
    console.log('Calling API:', apiUrl, isProduction ? '(Production)' : '(Staging)');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const rawResponse = await response.text();
    console.log('Raw response:', rawResponse);

    const parsedResponse = JSON.parse(rawResponse);
    console.log('Parsed response:', parsedResponse);

    if (parsedResponse.TransCode === 1 && parsedResponse.Data) {
      // 解密回應資料
      const decryptedData = aesDecrypt(parsedResponse.Data, hashKey, hashIV);
      console.log('Decrypted response:', decryptedData);
      
      const decodedData = decodeURIComponent(decryptedData);
      const invoiceResult = JSON.parse(decodedData);
      console.log('Final invoice result:', invoiceResult);

      if (invoiceResult.RtnCode === 1) {
        // 發票開立成功
        await updateInvoiceStatus(orderId, invoiceResult.InvoiceNo, '已開立');
        
        return NextResponse.json({
          success: true,
          invoiceNumber: invoiceResult.InvoiceNo,
          invoiceDate: invoiceResult.InvoiceDate,
          randomNumber: invoiceResult.RandomNumber,
          message: '發票開立成功'
        });
      } else {
        // 發票開立失敗
        await updateInvoiceStatus(orderId, '', `失敗: ${invoiceResult.RtnMsg}`);
        
        return NextResponse.json({
          success: false,
          error: `發票開立失敗: ${invoiceResult.RtnMsg}`,
          message: `發票開立失敗: ${invoiceResult.RtnMsg}`
        }, { status: 400 });
      }
    } else {
      // API呼叫失敗
      return NextResponse.json({
        success: false,
        error: `ECPay API錯誤: ${parsedResponse.TransMsg}`,
        message: `ECPay API錯誤: ${parsedResponse.TransMsg}`
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || '發票開立失敗',
      message: error.message || '發票開立失敗' 
    }, { status: 500 });
  }
} 