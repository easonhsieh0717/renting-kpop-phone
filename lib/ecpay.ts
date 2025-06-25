import crypto from 'crypto';

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

  const hash = crypto.createHash('sha256').update(encodedString).digest('hex');
  
  return hash.toUpperCase();
}

export function getECPayPaymentParams({ 
  merchantTradeNo, 
  totalAmount, 
  itemName, 
  merchantID, 
  hashKey, 
  hashIV 
}: {
  merchantTradeNo: string;
  totalAmount: number;
  itemName: string;
  merchantID: string;
  hashKey: string;
  hashIV: string;
}) {
  const tradeDate = new Date();
  const formattedDate = `${tradeDate.getFullYear()}/${String(tradeDate.getMonth() + 1).padStart(2, '0')}/${String(tradeDate.getDate()).padStart(2, '0')} ${String(tradeDate.getHours()).padStart(2, '0')}:${String(tradeDate.getMinutes()).padStart(2, '0')}:${String(tradeDate.getSeconds()).padStart(2, '0')}`;

  const params = {
    MerchantID: merchantID,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: formattedDate,
    PaymentType: 'aio',
    TotalAmount: totalAmount,
    TradeDesc: '手機租借服務',
    ItemName: itemName,
    ReturnURL: `${process.env.NEXT_PUBLIC_SITE_URL}/api/ecpay/return`,
    ChoosePayment: 'Credit',
    EncryptType: 1,
  };

  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result: any, key) => {
      result[key] = (params as any)[key];
      return result;
    }, {});

  const queryString = Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const stringToHash = `HashKey=${hashKey}&${queryString}&HashIV=${hashIV}`;
  const urlEncodedString = encodeURIComponent(stringToHash).toLowerCase();
  const checkMacValue = crypto.createHash('sha256').update(urlEncodedString).digest('hex').toUpperCase();

  return {
    ...sortedParams,
    CheckMacValue: checkMacValue,
  };
}

export function getECPayInvoiceParams({
  merchantID,
  hashKey,
  hashIV,
  relateNumber,
  customerName,
  customerPhone,
  customerEmail,
  carrierNumber,
  itemName,
  itemPrice,
  itemCount = 1
}: {
  merchantID: string;
  hashKey: string;
  hashIV: string;
  relateNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  carrierNumber?: string;
  itemName: string;
  itemPrice: number;
  itemCount?: number;
}) {
  const timeStamp = Math.floor(Date.now() / 1000);
  
  const params = {
    MerchantID: merchantID,
    RelateNumber: relateNumber,
    CustomerName: customerName,
    CustomerAddr: '',
    CustomerPhone: customerPhone,
    CustomerEmail: customerEmail || '',
    ClearanceMark: '',
    Print: '0',
    Donation: '0',
    LoveCode: '',
    CarrierType: carrierNumber ? '3' : '0', // 3=手機載具, 0=雲端發票
    CarrierNum: carrierNumber || '',
    TaxType: '1',
    SalesAmount: itemPrice,
    InvoiceRemark: '',
    ItemName: itemName,
    ItemCount: itemCount,
    ItemWord: '式',
    ItemPrice: itemPrice,
    ItemTaxType: '1',
    ItemAmount: itemPrice * itemCount,
    InvType: '07',
    TimeStamp: timeStamp
  };

  // 建立檢查碼
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result: any, key) => {
      result[key] = (params as any)[key];
      return result;
    }, {});

  const queryString = Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const stringToHash = `HashKey=${hashKey}&${queryString}&HashIV=${hashIV}`;
  const urlEncodedString = encodeURIComponent(stringToHash).toLowerCase();
  const checkMacValue = crypto.createHash('sha256').update(urlEncodedString).digest('hex').toUpperCase();

  return {
    ...sortedParams,
    CheckMacValue: checkMacValue,
  };
} 