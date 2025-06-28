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
  HoldTradeAMT?: number;
  CheckMacValue?: string;
  MerchantName?: string;
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

// 修正中文字符編碼問題的輔助函數
function sanitizeForECPay(str: string): string {
  // 移除或替換可能造成編碼問題的字符
  return str
    .replace(/[^\x00-\x7F]/g, '') // 移除非ASCII字符
    .replace(/[&=]/g, '_') // 替換可能影響參數解析的字符
    .substring(0, 200); // 限制長度
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
  hashIV,
  holdTradeAmount
}: {
  merchantTradeNo: string;
  totalAmount: number;
  itemName: string;
  merchantID: string;
  hashKey: string;
  hashIV: string;
  holdTradeAmount?: number;
}) {
  const tradeDate = new Date();
  const formattedDate = `${tradeDate.getFullYear()}/${String(tradeDate.getMonth() + 1).padStart(2, '0')}/${String(tradeDate.getDate()).padStart(2, '0')} ${String(tradeDate.getHours()).padStart(2, '0')}:${String(tradeDate.getMinutes()).padStart(2, '0')}:${String(tradeDate.getSeconds()).padStart(2, '0')}`;

  const params: any = {
    MerchantID: merchantID,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: formattedDate,
    PaymentType: 'aio',
    TotalAmount: totalAmount,
    TradeDesc: sanitizeForECPay('Mobile Rental Service'),
    ItemName: sanitizeForECPay(itemName),
    ReturnURL: `${process.env.NEXT_PUBLIC_SITE_URL}/api/ecpay/return`,
    ChoosePayment: 'Credit',
    EncryptType: 1,
    ClientBackURL: `${process.env.NEXT_PUBLIC_SITE_URL}`,
  };

  if (holdTradeAmount && holdTradeAmount > 0) {
    params.HoldTradeAMT = holdTradeAmount;
  }

  const checkMacValue = generateCheckMacValue(params as Omit<ECPayPaymentData, 'CheckMacValue'>, hashKey, hashIV);

  return {
    ...params,
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

// 新增：ECPay退刷API功能
export function getECPayRefundParams({
  merchantTradeNo,
  tradeNo,
  action,
  totalAmount,
  merchantID,
  hashKey,
  hashIV
}: {
  merchantTradeNo: string;
  tradeNo: string;
  action: 'C' | 'R' | 'E' | 'N'; // C=關帳, R=退刷, E=取消, N=放棄
  totalAmount: number;
  merchantID: string;
  hashKey: string;
  hashIV: string;
}) {
  const params = {
    MerchantID: merchantID,
    MerchantTradeNo: merchantTradeNo,
    TradeNo: tradeNo,
    Action: action,
    TotalAmount: totalAmount
  };

  // 生成CheckMacValue - 退刷API使用不同的參數結構
  const sortedData = Object.entries(params)
    .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const hashString = `HashKey=${hashKey}&${sortedData}&HashIV=${hashIV}`;
  const encodedString = ecpayUrlEncode(hashString).toLowerCase();
  const checkMacValue = crypto.createHash('sha256').update(encodedString).digest('hex').toUpperCase();

  return {
    ...params,
    CheckMacValue: checkMacValue,
  };
}

// 呼叫ECPay退刷API
export async function callECPayRefundAPI({
  merchantTradeNo,
  tradeNo,
  action,
  totalAmount,
  merchantID,
  hashKey,
  hashIV,
  isProduction = false
}: {
  merchantTradeNo: string;
  tradeNo: string;
  action: 'C' | 'R' | 'E' | 'N';
  totalAmount: number;
  merchantID: string;
  hashKey: string;
  hashIV: string;
  isProduction?: boolean;
}) {
  const apiUrl = isProduction 
    ? 'https://payment.ecpay.com.tw/CreditDetail/DoAction'
    : 'https://payment-stage.ecpay.com.tw/CreditDetail/DoAction';

  const params = getECPayRefundParams({
    merchantTradeNo,
    tradeNo,
    action,
    totalAmount,
    merchantID,
    hashKey,
    hashIV
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params as any).toString(),
    });

    const result = await response.text();
    
    // 解析回傳結果
    const resultParams = new URLSearchParams(result);
    return {
      MerchantID: resultParams.get('MerchantID'),
      MerchantTradeNo: resultParams.get('MerchantTradeNo'),
      TradeNo: resultParams.get('TradeNo'),
      RtnCode: parseInt(resultParams.get('RtnCode') || '0'),
      RtnMsg: resultParams.get('RtnMsg'),
      success: parseInt(resultParams.get('RtnCode') || '0') === 1
    };
  } catch (error) {
    console.error('ECPay退刷API呼叫失敗:', error);
    throw error;
  }
}

// 新增：專門用於保證金預授權的函數
export function getECPayPreAuthParams({ 
  merchantTradeNo, 
  totalAmount, 
  itemName, 
  merchantID, 
  hashKey, 
  hashIV,
  holdTradeAmount,
  merchantName
}: {
  merchantTradeNo: string;
  totalAmount: number;
  itemName: string;
  merchantID: string;
  hashKey: string;
  hashIV: string;
  holdTradeAmount?: number;
  merchantName: string;
}) {
  const tradeDate = new Date();
  const formattedDate = `${tradeDate.getFullYear()}/${String(tradeDate.getMonth() + 1).padStart(2, '0')}/${String(tradeDate.getDate()).padStart(2, '0')} ${String(tradeDate.getHours()).padStart(2, '0')}:${String(tradeDate.getMinutes()).padStart(2, '0')}:${String(tradeDate.getSeconds()).padStart(2, '0')}`;

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    throw new Error('NEXT_PUBLIC_SITE_URL environment variable is not set');
  }

  if (!merchantName) {
    throw new Error('MerchantName is required');
  }

  const params: any = {
    MerchantID: merchantID,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: formattedDate,
    PaymentType: 'aio',
    TotalAmount: totalAmount,
    TradeDesc: sanitizeForECPay('Mobile Rental Service'),
    ItemName: sanitizeForECPay(itemName),
    ReturnURL: `${process.env.NEXT_PUBLIC_SITE_URL}/api/ecpay/preauth/return`,
    ChoosePayment: 'Credit',
    EncryptType: 1,
    ClientBackURL: `${process.env.NEXT_PUBLIC_SITE_URL}`,
    HoldTradeAMT: 1,
    MerchantName: sanitizeForECPay(merchantName)
  };

  const checkMacValue = generateCheckMacValue(params as Omit<ECPayPaymentData, 'CheckMacValue'>, hashKey, hashIV);

  return {
    ...params,
    CheckMacValue: checkMacValue,
  };
}

// 新增：ECPay預授權請款API功能
export function getECPayCaptureParams({
  merchantTradeNo,
  tradeNo,
  captureAmount,
  merchantID,
  hashKey,
  hashIV
}: {
  merchantTradeNo: string;
  tradeNo: string;
  captureAmount: number;
  merchantID: string;
  hashKey: string;
  hashIV: string;
}) {
  const params = {
    MerchantID: merchantID,
    MerchantTradeNo: merchantTradeNo,
    TradeNo: tradeNo,
    Action: 'C', // C=請款(Capture)
    TotalAmount: captureAmount
  };

  // 生成CheckMacValue
  const sortedData = Object.entries(params)
    .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const hashString = `HashKey=${hashKey}&${sortedData}&HashIV=${hashIV}`;
  const encodedString = ecpayUrlEncode(hashString).toLowerCase();
  const checkMacValue = crypto.createHash('sha256').update(encodedString).digest('hex').toUpperCase();

  return {
    ...params,
    CheckMacValue: checkMacValue,
  };
}

// 呼叫ECPay預授權請款API
export async function callECPayCaptureAPI({
  merchantTradeNo,
  tradeNo,
  captureAmount,
  merchantID,
  hashKey,
  hashIV,
  isProduction = false
}: {
  merchantTradeNo: string;
  tradeNo: string;
  captureAmount: number;
  merchantID: string;
  hashKey: string;
  hashIV: string;
  isProduction?: boolean;
}) {
  const apiUrl = isProduction 
    ? 'https://payment.ecpay.com.tw/CreditDetail/DoAction'
    : 'https://payment-stage.ecpay.com.tw/CreditDetail/DoAction';

  const params = getECPayCaptureParams({
    merchantTradeNo,
    tradeNo,
    captureAmount,
    merchantID,
    hashKey,
    hashIV
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params as any).toString(),
    });

    const result = await response.text();
    
    // 解析回傳結果
    const resultParams = new URLSearchParams(result);
    return {
      MerchantID: resultParams.get('MerchantID'),
      MerchantTradeNo: resultParams.get('MerchantTradeNo'),
      TradeNo: resultParams.get('TradeNo'),
      RtnCode: parseInt(resultParams.get('RtnCode') || '0'),
      RtnMsg: resultParams.get('RtnMsg'),
      success: parseInt(resultParams.get('RtnCode') || '0') === 1
    };
  } catch (error) {
    console.error('ECPay預授權請款API呼叫失敗:', error);
    throw error;
  }
} 