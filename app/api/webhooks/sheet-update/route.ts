import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import crypto from 'crypto';

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

// AES加密函數
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

// AES解密函數
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

// 呼叫ECPay發票API
async function createECPayInvoice(invoiceData: any) {
  try {
    const merchantID = process.env.ECPAY_MERCHANT_ID || '3383324';
    const hashKey = process.env.ECPAY_HASH_KEY;
    const hashIV = process.env.ECPAY_HASH_IV;

    if (!hashKey || !hashIV) {
      throw new Error('ECPay credentials not configured');
    }

    // 根據商店代號判斷環境
    const isProduction = merchantID === '3383324';
    const apiUrl = isProduction 
      ? 'https://einvoice.ecpay.com.tw/B2CInvoice/Issue'
      : 'https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue';

    // 準備完整的發票資料
    const fullInvoiceData = {
      MerchantID: merchantID,
      RelateNumber: invoiceData.RelateNumber,
      CustomerName: invoiceData.CustomerName,
      CustomerAddr: '',
      CustomerPhone: invoiceData.CustomerPhone,
      CustomerEmail: invoiceData.CustomerEmail || '',
      ClearanceMark: '',
      Print: '0',
      Donation: '0',
      LoveCode: '',
      CarrierType: invoiceData.CarrierNum ? '3' : '0',
      CarrierNum: invoiceData.CarrierNum || '',
      TaxType: '1',
      SpecialTaxType: 0,
      SalesAmount: invoiceData.SalesAmount,
      InvoiceRemark: invoiceData.InvoiceRemark,
      InvType: '07',
      vat: '1',
      Items: invoiceData.Items
    };

    // 加密資料
    const jsonString = JSON.stringify(fullInvoiceData);
    const urlEncodedData = encodeURIComponent(jsonString);
    const encryptedData = aesEncrypt(urlEncodedData, hashKey, hashIV);

    // 準備請求參數
    const timestamp = Math.floor(Date.now() / 1000);
    const requestPayload = {
      MerchantID: merchantID,
      RqHeader: { Timestamp: timestamp },
      Data: encryptedData,
    };

    console.log('Calling ECPay API:', apiUrl);
    console.log('Request payload:', requestPayload);

    // 呼叫ECPay API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    const responseData = await response.json();
    console.log('ECPay Response:', responseData);

    if (responseData.TransCode === 1 && responseData.Data) {
      // 解密回應資料
      const decryptedResponse = aesDecrypt(responseData.Data, hashKey, hashIV);
      const invoiceResult = JSON.parse(decryptedResponse);
      
      console.log('Invoice result:', invoiceResult);

      if (invoiceResult.RtnCode === 1) {
        return {
          success: true,
          data: {
            invoiceNumber: invoiceResult.InvoiceNo,
            invoiceDate: invoiceResult.InvoiceDate,
            randomNumber: invoiceResult.RandomNumber,
            status: '開立成功'
          }
        };
      } else {
        return {
          success: false,
          error: invoiceResult.RtnMsg || 'Invoice creation failed'
        };
      }
    } else {
      return {
        success: false,
        error: responseData.TransMsg || 'API call failed'
      };
    }
  } catch (error) {
    console.error('ECPay invoice creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 更新Google Sheet中的發票資訊
async function updateInvoiceInSheet(spreadsheetId: string, orderId: string, invoiceData: any) {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // 找到訂單的行號
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
        values: [[invoiceData.invoiceNumber, invoiceData.status, currentTime]],
      },
    });

    console.log(`Updated invoice info for order ${orderId} in Google Sheet`);
  } catch (error) {
    console.error('Error updating Google Sheet:', error);
    throw error;
  }
}

async function getOrdersNeedingInvoice() {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  // 獲取所有訂單資料
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'reservations!A:R',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  // 篩選需要補開發票的訂單：已付款但未開發票
  const ordersNeedingInvoice = rows.slice(1).filter(row => {
    const paymentStatus = row[8]; // I欄：付款狀態
    const invoiceStatus = row[16]; // Q欄：發票狀態
    
    // 條件：已付款、發票狀態為空或包含"失敗"
    return paymentStatus === 'PAID' && 
           (!invoiceStatus || invoiceStatus.includes('失敗'));
  }).map(row => ({
    orderId: row[0],
    customerName: row[5],
    phoneModel: row[1],
    finalAmount: row[12],
    invoiceStatus: row[16] || '未開立'
  }));

  return ordersNeedingInvoice;
}

async function triggerInvoiceCreation(orderId: string) {
  try {
    console.log(`正在處理訂單 ${orderId} 的發票開立...`);
    
    // 直接呼叫發票開立邏輯，不用HTTP請求避免循環
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 獲取該訂單的詳細資料
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:R',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      throw new Error('No data found in spreadsheet');
    }

    // 找到對應的訂單
    const orderRow = rows.find(row => row[0] === orderId);
    if (!orderRow) {
      throw new Error(`Order ${orderId} not found`);
    }

    // 檢查訂單是否已付款
    const paymentStatus = orderRow[8]; // I欄：付款狀態
    if (paymentStatus !== 'PAID') {
      throw new Error(`Order ${orderId} is not paid yet. Status: ${paymentStatus}`);
    }

    // 準備發票資料
    const customerName = orderRow[5] || '未提供';
    const customerEmail = orderRow[6] || '';
    const customerPhone = orderRow[7] || '';
    const carrierNumber = orderRow[14] || ''; // O欄：手機載具號碼
    const finalAmount = parseFloat(orderRow[12]) || 0; // M欄：最終金額

    if (finalAmount <= 0) {
      throw new Error(`Invalid amount: ${finalAmount}`);
    }

    // 準備ECPay發票資料
    const invoiceData = {
      RelateNumber: orderId,
      CustomerName: customerName,
      CustomerEmail: customerEmail,
      CustomerPhone: customerPhone,
      CarrierNum: carrierNumber,
      SalesAmount: finalAmount,
      InvoiceRemark: '手機租賃服務',
      Items: [{
        ItemName: '手機租賃服務',
        ItemCount: 1,
        ItemWord: 'pcs',
        ItemPrice: finalAmount,
        ItemAmount: finalAmount
      }]
    };

    // 呼叫ECPay發票API（這裡需要引入發票邏輯）
    const invoiceResult = await createECPayInvoice(invoiceData);
    
    if (invoiceResult.success) {
      // 更新Google Sheet的發票欄位
      await updateInvoiceInSheet(spreadsheetId, orderId, invoiceResult.data);
    }

    return {
      orderId,
      success: invoiceResult.success,
      result: invoiceResult
    };
  } catch (error) {
    console.error(`訂單 ${orderId} 發票開立失敗:`, error);
    return {
      orderId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// POST: 手動觸發檢查並補開發票
export async function POST(req: NextRequest) {
  try {
    console.log('開始檢查需要補開發票的訂單...');
    
    // 獲取需要補開發票的訂單
    const ordersNeedingInvoice = await getOrdersNeedingInvoice();
    
    if (ordersNeedingInvoice.length === 0) {
      return NextResponse.json({
        success: true,
        message: '沒有需要補開發票的訂單',
        processedOrders: []
      });
    }

    console.log(`發現 ${ordersNeedingInvoice.length} 筆需要補開發票的訂單:`, ordersNeedingInvoice);

    // 批次處理發票開立
    const results = [];
    for (const order of ordersNeedingInvoice) {
      console.log(`正在為訂單 ${order.orderId} 補開發票...`);
      const result = await triggerInvoiceCreation(order.orderId);
      results.push(result);
      
      // 避免API限制，每次請求間隔1秒
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      message: `批次補開發票完成：成功 ${successCount} 筆，失敗 ${failureCount} 筆`,
      totalOrders: ordersNeedingInvoice.length,
      successCount,
      failureCount,
      processedOrders: results
    });

  } catch (error: any) {
    console.error('批次補開發票失敗:', error);
    return NextResponse.json({
      success: false,
      message: `批次補開發票失敗: ${error.message}`
    }, { status: 500 });
  }
}

// GET: 查看需要補開發票的訂單列表
export async function GET() {
  try {
    const ordersNeedingInvoice = await getOrdersNeedingInvoice();
    
    return NextResponse.json({
      success: true,
      ordersCount: ordersNeedingInvoice.length,
      orders: ordersNeedingInvoice,
      message: ordersNeedingInvoice.length > 0 
        ? `發現 ${ordersNeedingInvoice.length} 筆需要補開發票的訂單`
        : '沒有需要補開發票的訂單'
    });
  } catch (error: any) {
    console.error('查詢需要補開發票的訂單失敗:', error);
    return NextResponse.json({
      success: false,
      message: `查詢失敗: ${error.message}`
    }, { status: 500 });
  }
} 