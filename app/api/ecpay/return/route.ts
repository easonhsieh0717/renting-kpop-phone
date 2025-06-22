import { NextRequest, NextResponse } from 'next/server';
import { updateReservationStatus } from '@/lib/sheets/reservations';
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

function verifyCheckMacValue(data: Record<string, any>, hashKey: string, hashIV: string): boolean {
  const { CheckMacValue, ...rest } = data;
  if (!CheckMacValue) return false;

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

    const isProduction = process.env.VERCEL_ENV === 'production';
    const hashKey = isProduction ? process.env.ECPAY_HASH_KEY! : 'pwFHCqoQZGmho4w6';
    const hashIV = isProduction ? process.env.ECPAY_HASH_IV! : 'EkRm7iFT261dpevs';
    
    const isValid = verifyCheckMacValue(data, hashKey, hashIV);

    if (!isValid) {
      console.error('CheckMacValue verification failed');
      // For security, don't give too much info. But for debugging, we might want to know.
      // In a real production environment, you might just return a generic error or '0|Error'.
      return new NextResponse('0|CheckMacValue verification failed', { status: 400 });
    }

    const { MerchantTradeNo: orderId, RtnCode } = data;

    if (RtnCode === '1') { // '1' means payment successful
      await updateReservationStatus(orderId, 'PAID');
      console.log(`Payment successful for order ${orderId}, status updated.`);
    } else {
      console.log(`Payment not successful for order ${orderId}. RtnCode: ${RtnCode}`);
      // Optionally, update status to 'FAILED' or something similar
      await updateReservationStatus(orderId, 'FAILED');
    }

    return new NextResponse('1|OK');
  } catch (error) {
    console.error('Error handling ECPay return:', error);
    return new NextResponse('0|Error', { status: 500 });
  }
} 