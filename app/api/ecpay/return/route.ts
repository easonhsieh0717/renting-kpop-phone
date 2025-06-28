import { NextRequest, NextResponse } from 'next/server';
import { updateReservationStatus } from '../../../../lib/sheets/reservations';
import crypto from 'crypto';
import { google } from 'googleapis';

// This function is copied from lib/ecpay.ts, ensure it's in sync or refactor to a shared utility
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

// 獲取Google Sheets客戶端
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

// 更新保證金狀態
async function updateDepositStatus(transactionNo: string, status: 'PAID' | 'FAILED', ecpayTradeNo?: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 獲取所有資料來查找交易號
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:Z',
    });

    const rows = response.data.values;
    if (!rows) return;

    // 查找包含該交易號的行（S欄是保證金交易號）
    const rowIndex = rows.findIndex((row: any) => row[18] === transactionNo); // S欄索引是18
    if (rowIndex === -1) {
      console.log(`Deposit transaction ${transactionNo} not found`);
      return;
    }

    // 更新保證金狀態（U欄）和ECPay交易編號（Y欄）
    if (ecpayTradeNo) {
      // 同時更新狀態和ECPay交易編號
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: [
            {
              range: `reservations!U${rowIndex + 1}`, // U欄：保證金狀態
              values: [[status]]
            },
            {
              range: `reservations!Y${rowIndex + 1}`, // Y欄：ECPay交易編號
              values: [[ecpayTradeNo]]
            }
          ]
        }
      });
    } else {
      // 只更新狀態
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `reservations!U${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[status]],
        },
      });
    }

    console.log(`Updated deposit status for transaction ${transactionNo} to ${status}${ecpayTradeNo ? ` with ECPay TradeNo: ${ecpayTradeNo}` : ''}`);
  } catch (error) {
    console.error('Error updating deposit status:', error);
    throw error;
  }
}

// 更新預授權狀態
async function updatePreAuthStatus(transactionNo: string, status: 'HELD' | 'PREAUTH_FAILED', ecpayTradeNo?: string) {
  try {
    const sheets = await getGoogleSheetsClient();
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

    // 獲取所有資料來查找預授權交易號
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:BB',
    });

    const rows = response.data.values;
    if (!rows) return;

    // 查找包含該預授權交易號的行（S欄是保證金交易編號）
    const rowIndex = rows.findIndex((row: any) => row[18] === transactionNo); // S欄索引是18
    if (rowIndex === -1) {
      console.log(`Pre-auth transaction ${transactionNo} not found`);
      return;
    }

    // 更新預授權狀態（U欄）和ECPay交易編號（Y欄）
    if (ecpayTradeNo) {
      // 同時更新ECPay交易編號和狀態
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: `Y${rowIndex + 1}`, // Y欄：ECPay交易編號
              values: [[ecpayTradeNo]]
            },
            {
              range: `U${rowIndex + 1}`, // U欄：保證金狀態
              values: [[status]]
            }
          ]
        }
      });
    } else {
      // 只更新狀態
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `U${rowIndex + 1}`,
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

    console.log('Received ECPay return data:', data);

    // 分流處理 callback 格式
    if (data.MerchantID && data.MerchantTradeNo && data.RtnCode) {
      // 全方位金流格式
      const isProduction = process.env.VERCEL_ENV === 'production';
      const hashKey = isProduction ? process.env.ECPAY_HASH_KEY! : 'pwFHCqoQZGmho4w6';
      const hashIV = isProduction ? process.env.ECPAY_HASH_IV! : 'EkRm7iFT261dpevs';
      const isTest = !isProduction;
      const isValid = verifyCheckMacValue(data, hashKey, hashIV, isTest);
      if (!isValid) {
        console.error('CheckMacValue verification failed');
        return new NextResponse('0|CheckMacValue verification failed', { status: 400 });
      }
      const { MerchantTradeNo: orderId, RtnCode, TradeNo: ecpayTradeNo } = data;
      
      // 判斷交易類型
      const isDepositTransaction = orderId.includes('D'); // 舊的保證金交易（立即扣款）
      const isPreAuthTransaction = orderId.includes('P'); // 新的預授權交易（延遲撥款）
      
      if (RtnCode === '1') {
        if (isDepositTransaction) {
          // 保證金交易成功，儲存ECPay交易編號
          await updateDepositStatus(orderId, 'PAID', ecpayTradeNo);
          console.log(`Deposit payment successful for transaction ${orderId}, ECPay TradeNo: ${ecpayTradeNo}, status updated.`);
        } else if (isPreAuthTransaction) {
          // 預授權交易成功，儲存ECPay交易編號並設定為HELD狀態
          await updatePreAuthStatus(orderId, 'HELD', ecpayTradeNo);
          console.log(`Pre-authorization successful for transaction ${orderId}, ECPay TradeNo: ${ecpayTradeNo}, status updated.`);
        } else {
          // 一般租金交易成功
          await updateReservationStatus(orderId, 'PAID');
          console.log(`Payment successful for order ${orderId}, status updated.`);
        }
      } else {
        if (isDepositTransaction) {
          // 保證金交易失敗
          await updateDepositStatus(orderId, 'FAILED');
          console.log(`Deposit payment failed for transaction ${orderId}. RtnCode: ${RtnCode}`);
        } else if (isPreAuthTransaction) {
          // 預授權交易失敗
          await updatePreAuthStatus(orderId, 'PREAUTH_FAILED');
          console.log(`Pre-authorization failed for transaction ${orderId}. RtnCode: ${RtnCode}`);
        } else {
          // 一般租金交易失敗
          await updateReservationStatus(orderId, 'FAILED');
          console.log(`Payment not successful for order ${orderId}. RtnCode: ${RtnCode}`);
        }
      }
      return new NextResponse('1|OK');
    } else if (data.succ && data.od_sob) {
      // 信用卡即時授權格式
      if (data.succ === '1') {
        await updateReservationStatus(data.od_sob, 'PAID');
        console.log(`Credit auth payment successful for order ${data.od_sob}, status updated.`);
        return new NextResponse('1|OK');
      } else {
        await updateReservationStatus(data.od_sob, 'FAILED');
        console.log(`Credit auth payment failed for order ${data.od_sob}.`);
        return new NextResponse('0|Failed');
      }
    } else {
      console.error('Unknown callback format:', data);
      return new NextResponse('0|Unknown callback format', { status: 400 });
    }
  } catch (error) {
    console.error('Error handling ECPay return:', error);
    return new NextResponse('0|Error', { status: 500 });
  }
} 