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
async function updateDepositStatus(transactionNo: string, status: 'PAID' | 'FAILED') {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 獲取所有資料來查找交易號
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:U',
    });

    const rows = response.data.values;
    if (!rows) return;

    // 查找包含該交易號的行（S欄是保證金交易號）
    const rowIndex = rows.findIndex((row: any) => row[18] === transactionNo); // S欄索引是18
    if (rowIndex === -1) {
      console.log(`Deposit transaction ${transactionNo} not found`);
      return;
    }

    // 更新保證金狀態（U欄）
    const updateRange = `reservations!U${rowIndex + 1}`;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[status]],
      },
    });

    console.log(`Updated deposit status for transaction ${transactionNo} to ${status}`);
  } catch (error) {
    console.error('Error updating deposit status:', error);
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
      const { MerchantTradeNo: orderId, RtnCode } = data;
      
      // 判斷是否為保證金交易（包含D字母的交易號）
      const isDepositTransaction = orderId.includes('D');
      
      if (RtnCode === '1') {
        if (isDepositTransaction) {
          // 保證金交易成功
          await updateDepositStatus(orderId, 'PAID');
          console.log(`Deposit payment successful for transaction ${orderId}, status updated.`);
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