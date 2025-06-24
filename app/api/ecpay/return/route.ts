import { NextRequest, NextResponse } from 'next/server';
import { updateReservationStatus } from '../../../../lib/sheets/reservations';
import crypto from 'crypto-js';

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
  const calculatedHash = crypto.SHA256(encodedString).toString().toUpperCase();
  
  return calculatedHash === CheckMacValue;
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
      if (RtnCode === '1') {
        await updateReservationStatus(orderId, 'PAID');
        console.log(`Payment successful for order ${orderId}, status updated.`);
      } else {
        await updateReservationStatus(orderId, 'FAILED');
        console.log(`Payment not successful for order ${orderId}. RtnCode: ${RtnCode}`);
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