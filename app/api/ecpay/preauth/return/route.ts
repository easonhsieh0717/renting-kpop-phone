import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { google } from 'googleapis';

// 从 lib/ecpay.ts 复制的函数
function ecpayUrlEncode(data: string): string {
  return encodeURIComponent(data)
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2a');
}

function verifyCheckMacValue(data: Record<string, any>, hashKey: string, hashIV: string, isTest: boolean): boolean {
  const { CheckMacValue, ...rest } = data;
  if (!CheckMacValue) return false;
  if (isTest && CheckMacValue === 'test') return true;

  const sortedData = Object.entries(rest)
    .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const hashString = `HashKey=${hashKey}&${sortedData}&HashIV=${hashIV}`;
  const encodedString = ecpayUrlEncode(hashString).toLowerCase();
  const calculatedHash = crypto.createHash('sha256').update(encodedString).digest('hex').toUpperCase();
  
  return calculatedHash === CheckMacValue;
}

// 获取 Google Sheets 客户端
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

// 🎯 預授權成功後的自動化處理
async function triggerPreAuthSuccessActions(preauthTransactionNo: string, ecpayTradeNo: string) {
  try {
    console.log(`[PREAUTH_SUCCESS_AUTOMATION] Starting automation for transaction: ${preauthTransactionNo}`);
    
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 獲取訂單資料
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:BB',
    });

    const rows = response.data.values;
    if (!rows) return;

    // 查找對應的訂單
    const rowIndex = rows.findIndex((row: any) => row[18] === preauthTransactionNo);
    if (rowIndex === -1) {
      console.log(`[PREAUTH_SUCCESS_AUTOMATION] Order not found for transaction: ${preauthTransactionNo}`);
      return;
    }

    const orderRow = rows[rowIndex];
    const originalOrderId = orderRow[0]; // A欄：原始訂單編號
    
    // 準備通知資料
    const orderData = {
      orderId: originalOrderId,
      customerName: orderRow[5] || '',
      customerEmail: orderRow[6] || '',
      phoneModel: orderRow[2] || '',
      imei: orderRow[1] || '',
      startDate: orderRow[3] || '',
      endDate: orderRow[4] || '',
      finalAmount: parseFloat(orderRow[12]) || 0,
      preauthAmount: parseFloat(orderRow[19]) || 30000, // T欄：預授權金額
      carrierNumber: orderRow[14] || ''
    };

    console.log(`[PREAUTH_SUCCESS_AUTOMATION] Processing order data:`, {
      orderId: orderData.orderId,
      customerEmail: orderData.customerEmail,
      preauthAmount: orderData.preauthAmount
    });

    // 🎯 1. 發送預授權成功通知email（如果有email）
    if (orderData.customerEmail) {
      try {
        const emailResponse = await fetch(`${process.env.VERCEL_URL || 'https://renting-kpop-phone.vercel.app'}/api/send-preauth-success-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderData,
            preauthTransactionNo,
            ecpayTradeNo
          })
        });
        
        if (emailResponse.ok) {
          console.log(`[PREAUTH_SUCCESS_AUTOMATION] Email notification sent successfully to: ${orderData.customerEmail}`);
        } else {
          console.error(`[PREAUTH_SUCCESS_AUTOMATION] Email notification failed:`, await emailResponse.text());
        }
      } catch (emailError) {
        console.error(`[PREAUTH_SUCCESS_AUTOMATION] Email notification error:`, emailError);
      }
    }

    // 🎯 2. 記錄預授權成功的時間戳記
    const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `reservations!Z${rowIndex + 1}`, // Z欄：預授權成功時間
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[timestamp]]
        }
      });
      console.log(`[PREAUTH_SUCCESS_AUTOMATION] Timestamp recorded: ${timestamp}`);
    } catch (timestampError) {
      console.error(`[PREAUTH_SUCCESS_AUTOMATION] Failed to record timestamp:`, timestampError);
    }

    console.log(`[PREAUTH_SUCCESS_AUTOMATION] Automation completed for transaction: ${preauthTransactionNo}`);
    
  } catch (error) {
    console.error(`[PREAUTH_SUCCESS_AUTOMATION] Failed for transaction ${preauthTransactionNo}:`, error);
  }
}

// 更新预授权状态
async function updatePreAuthStatus(transactionNo: string, status: 'HELD' | 'PREAUTH_FAILED', ecpayTradeNo?: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 获取所有数据来查找预授权交易号
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:BB',
    });

    const rows = response.data.values;
    if (!rows) return;

    // 查找包含该预授权交易号的行（S列是保证金交易编号）
    const rowIndex = rows.findIndex((row: any) => row[18] === transactionNo); // S列索引是18
    if (rowIndex === -1) {
      console.log(`Pre-auth transaction ${transactionNo} not found`);
      return;
    }

    // 更新预授权状态（U列）和ECPay交易编号（Y列）
    if (ecpayTradeNo) {
      // 同时更新ECPay交易编号和状态
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: `reservations!Y${rowIndex + 1}`, // Y列：ECPay交易编号
              values: [[`'${ecpayTradeNo}`]] // 加上單引號前綴強制為文字格式
            },
            {
              range: `reservations!U${rowIndex + 1}`, // U列：保证金状态
              values: [[status]]
            }
          ]
        }
      });
    } else {
      // 只更新状态
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `reservations!U${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[status]],
        },
      });
    }

    console.log(`Updated pre-auth status for transaction ${transactionNo} to ${status}${ecpayTradeNo ? ` with ECPay TradeNo: ${ecpayTradeNo}` : ''}`);
  } catch (error) {
    console.error('Error updating pre-auth status:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    // --- 日誌記錄：收到 ECPay 的回調資料 ---
    console.log('[ECPAY_CALLBACK_RECEIVED]', JSON.stringify({
      message: 'Received callback data from ECPay.',
      data
    }, null, 2));

    // 验证必要参数
    if (!data.MerchantID || !data.MerchantTradeNo || !data.RtnCode) {
      console.error('[ECPAY_CALLBACK_ERROR] Missing required parameters.', data);
      return new NextResponse('0|Missing required parameters', { status: 400 });
    }

    let hashKey: string;
    let hashIV: string;
    const receivedMerchantID = data.MerchantID;
    let verificationEnv: string;

    if (receivedMerchantID === '2000132') {
      // 平台商的子廠商測試金鑰
      verificationEnv = 'Sub-merchant Test';
      hashKey = '5294y06JbISpM5x9';
      hashIV = 'v77hoKGq4kWxNNIS';
    } else if (receivedMerchantID === '3002607') {
      // 標準測試金鑰
      verificationEnv = 'Standard Test';
      hashKey = 'pwFHCqoQZGmho4w6';
      hashIV = 'EkRm7iFT261dpevs';
    } else {
      // 正式環境金鑰
      verificationEnv = 'Production';
      hashKey = process.env.ECPAY_HASH_KEY!;
      hashIV = process.env.ECPAY_HASH_IV!;
    }
    
    // --- 日誌記錄：驗證資訊 ---
    console.log('[ECPAY_CALLBACK_VERIFICATION]', JSON.stringify({
      message: 'Verifying callback CheckMacValue.',
      verificationEnv,
      merchantId: receivedMerchantID
    }, null, 2));

    if (!hashKey || !hashIV) {
      console.error('[ECPAY_CALLBACK_ERROR] ECPay credentials for verification not found for MerchantID:', receivedMerchantID);
      return new NextResponse('0|ECPay credentials not configured', { status: 500 });
    }

    // 使用動態選擇的金鑰進行驗證
    const isValid = verifyCheckMacValue(data, hashKey, hashIV, false); // isTest=false 進行實際驗證
    
    if (!isValid) {
      console.error('[ECPAY_CALLBACK_ERROR] CheckMacValue verification failed.');
      return new NextResponse('0|CheckMacValue verification failed', { status: 400 });
    }

    const { MerchantTradeNo: orderId, RtnCode, RtnMsg, TradeNo: ecpayTradeNo } = data;
    
    // 确认是预授权交易
    if (!orderId.includes('P')) {
      console.error(`[ECPAY_CALLBACK_ERROR] Not a preauth transaction. OrderID: ${orderId}`);
      return new NextResponse('0|Not a preauth transaction', { status: 400 });
    }

    if (RtnCode === '1') {
      // 预授权成功
      console.log(`[ECPAY_CALLBACK_SUCCESS] Pre-authorization successful for transaction ${orderId}.`);
      await updatePreAuthStatus(orderId, 'HELD', ecpayTradeNo);
      
      // 🎯 新增：預授權成功後觸發自動化功能
      await triggerPreAuthSuccessActions(orderId, ecpayTradeNo);
    } else {
      // 预授权失败
      console.error(`[ECPAY_CALLBACK_FAILURE] Pre-authorization failed for transaction ${orderId}. RtnCode: ${RtnCode}, RtnMsg: ${RtnMsg}`);
      await updatePreAuthStatus(orderId, 'PREAUTH_FAILED');
    }

    return new NextResponse('1|OK');
  } catch (error) {
    console.error('[ECPAY_CALLBACK_FATAL] Error handling ECPay preauth return:', error);
    return new NextResponse('0|Error', { status: 500 });
  }
} 