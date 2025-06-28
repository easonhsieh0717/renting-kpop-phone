import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getECPayPreAuthParams } from '@/lib/ecpay';
import { formatDateTimeInTaipei } from '@/lib/utils';

// Google Sheets 客戶端
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

// 更新Google Sheet中的保證金交易資訊
async function updateDepositTransactionInSheet(
  orderId: string, 
  transactionNo: string, 
  amount: number = 30000
) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    // 找到訂單的行號
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:A',
    });

    const rows = response.data.values;
    if (!rows) return;

    const rowIndex = rows.findIndex((row: any) => row[0] === orderId);
    if (rowIndex === -1) return;

    // 更新保證金相關欄位 (S=交易號, T=金額, U=狀態)
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: [
          {
            range: `reservations!S${rowIndex + 1}`, // S欄：保證金交易編號
            values: [[transactionNo]]
          },
          {
            range: `reservations!T${rowIndex + 1}`, // T欄：保證金金額
            values: [[amount]]
          },
          {
            range: `reservations!U${rowIndex + 1}`, // U欄：保證金狀態
            values: [['HELD']]
          }
        ]
      }
    });

    console.log(`Updated deposit transaction info for order ${orderId} in Google Sheet`);
  } catch (error) {
    console.error('Error updating Google Sheet:', error);
    throw error;
  }
}

// 獲取訂單資訊
async function getOrderInfo(orderId: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:X',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      throw new Error('Order not found');
    }

    const orderRow = rows.find((row: any) => row[0] === orderId);
    if (!orderRow) {
      throw new Error('Order not found');
    }

    return {
      orderId: orderRow[0],
      customerName: orderRow[1],
      phoneModel: orderRow[7], // H欄：手機型號
      phoneImei: orderRow[8],  // I欄：IMEI
      paymentStatus: orderRow[13], // N欄：付款狀態
      depositTransactionNo: orderRow[18], // S欄：保證金交易號
      depositAmount: parseInt(orderRow[19]) || 0, // T欄：保證金金額
      depositStatus: orderRow[20] || '', // U欄：保證金狀態
    };
  } catch (error) {
    console.error('Error getting order info:', error);
    throw error;
  }
}

// POST: 創建保證金預授權訂單（使用HoldTradeAMT）
export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    
    // 獲取請求體中的金額
    const body = await req.json();
    const requestedAmount = body.amount || 30000;
    
    console.log(`Creating deposit pre-authorization for order ${orderId}, amount: ${requestedAmount}`);

    // 獲取訂單資訊
    const orderInfo = await getOrderInfo(orderId);
    
    // 檢查訂單狀態
    if (orderInfo.paymentStatus !== 'PAID') {
      return NextResponse.json({
        success: false,
        message: '此訂單尚未完成租金付款'
      }, { status: 400 });
    }

    if (orderInfo.depositTransactionNo) {
      return NextResponse.json({
        success: false,
        message: '此訂單已經建立過保證金預授權'
      }, { status: 400 });
    }

    // 準備ECPay預授權參數
    const merchantID = process.env.ECPAY_MERCHANT_ID || '3383324';
    const hashKey = process.env.ECPAY_HASH_KEY!;
    const hashIV = process.env.ECPAY_HASH_IV!;

    if (!hashKey || !hashIV) {
      throw new Error('ECPay credentials not configured');
    }

    // 生成保證金預授權訂單編號 (ECPay限制20字元)
    // 使用訂單號後6碼 + P(PreAuth) + 時間戳後8碼
    const orderSuffix = orderId.slice(-6);
    const timestamp = Date.now().toString().slice(-8);
    const preAuthOrderId = `${orderSuffix}P${timestamp}`;
    const depositAmount = requestedAmount; // 使用前端傳入的金額

    // 改善商品明細，明確標示為保證金預授權
    const phoneImei = orderInfo.phoneImei;
    const actualPhoneModel = orderInfo.phoneModel || 'Samsung Galaxy S25 Ultra';
    
    // 簡化商品名稱：押金預授權
    const phoneModelShort = actualPhoneModel.replace('Samsung Galaxy ', '').replace(' Ultra', 'U');
    const itemName = `${phoneModelShort}押金預授權-IMEI:${phoneImei}`;

    // 使用新的預授權函數（包含HoldTradeAMT參數）
    const paymentParams = getECPayPreAuthParams({
      merchantTradeNo: preAuthOrderId,
      totalAmount: depositAmount,
      itemName: itemName,
      merchantID,
      hashKey,
      hashIV
    });

    // 更新Google Sheet記錄保證金預授權交易號
    await updateDepositTransactionInSheet(orderId, preAuthOrderId, depositAmount);

    // 準備ECPay表單URL
    const isProduction = merchantID === '3383324';
    const ecpayUrl = isProduction 
      ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
      : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';

    return NextResponse.json({
      success: true,
      message: '保證金預授權訂單已建立（不會立即扣款）',
      paymentParams,
      ecpayUrl,
      preAuthOrderId,
      depositAmount,
      isPreAuth: true, // 標示這是預授權
      orderInfo: {
        orderId: orderInfo.orderId,
        customerName: orderInfo.customerName,
        phoneModel: orderInfo.phoneModel
      }
    });

  } catch (error: any) {
    console.error('Create deposit pre-authorization error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '建立保證金預授權失敗'
    }, { status: 500 });
  }
}

// GET: 查看訂單的保證金狀態
export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    
    const orderInfo = await getOrderInfo(orderId);
    
    return NextResponse.json({
      success: true,
      orderInfo: {
        ...orderInfo,
        canCreateDeposit: orderInfo.paymentStatus === 'PAID' && !orderInfo.depositTransactionNo,
        hasDeposit: !!orderInfo.depositTransactionNo
      }
    });
    
  } catch (error: any) {
    console.error('Get deposit status error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '查詢保證金狀態失敗'
    }, { status: 500 });
  }
} 