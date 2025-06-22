import crypto from 'crypto-js';

interface ECPayPaymentData {
  MerchantID: string;
  MerchantTradeNo: string;
  MerchantTradeDate: string;
  PaymentType: string;
  TotalAmount: number;
  TradeDesc: string;
  ItemName: string;
  ReturnURL: string;
  ChoosePayment: string;
  EncryptType: number;
  ClientBackURL: string;
  CheckMacValue?: string;
}

function ecpayUrlEncode(data: string): string {
  return encodeURIComponent(data)
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2a');
}

function generateCheckMacValue(data: Omit<ECPayPaymentData, 'CheckMacValue'>, hashKey: string, hashIV: string): string {
  const sortedData = Object.entries(data)
    .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const hashString = `HashKey=${hashKey}&${sortedData}&HashIV=${hashIV}`;
  
  const encodedString = ecpayUrlEncode(hashString).toLowerCase();

  const hash = crypto.SHA256(encodedString).toString();
  
  return hash.toUpperCase();
}

export function getECPayPaymentParams(params: {
  merchantTradeNo: string;
  totalAmount: number;
  itemName: string;
  merchantID: string;
  hashKey: string;
  hashIV: string;
}): ECPayPaymentData {
  const { merchantTradeNo, totalAmount, itemName, merchantID, hashKey, hashIV } = params;
  const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.APP_URL || 'http://localhost:3000');

  // Convert current time to Taiwan Time (UTC+8)
  const now = new Date();
  const taiwanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
  
  const year = taiwanTime.getFullYear();
  const month = (taiwanTime.getMonth() + 1).toString().padStart(2, '0');
  const day = taiwanTime.getDate().toString().padStart(2, '0');
  const hours = taiwanTime.getHours().toString().padStart(2, '0');
  const minutes = taiwanTime.getMinutes().toString().padStart(2, '0');
  const seconds = taiwanTime.getSeconds().toString().padStart(2, '0');
  const merchantTradeDate = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;

  const baseParams: Omit<ECPayPaymentData, 'CheckMacValue'> = {
    MerchantID: merchantID,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: merchantTradeDate,
    PaymentType: 'aio',
    TotalAmount: totalAmount,
    TradeDesc: `追星神器手機租借 - ${itemName}`,
    ItemName: `${itemName} 租借費用`,
    ReturnURL: `${appUrl}/api/ecpay/return`, // The URL ECPay sends the result to in the background
    ChoosePayment: 'Credit',
    EncryptType: 1,
    ClientBackURL: `${appUrl}/orders/${merchantTradeNo}`, // The URL to redirect the user to after payment
  };

  const checkMacValue = generateCheckMacValue(baseParams, hashKey, hashIV);

  return {
    ...baseParams,
    CheckMacValue: checkMacValue,
  };
} 