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
            values: [['PENDING']]
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

    // 根據實際資料排列調整欄位對應
    return {
      orderId: orderRow[0],       // 訂單編號
      customerName: orderRow[5],  // 客戶姓名
      phoneModel: orderRow[1],    // 手機IMEI（用作型號判斷）
      phoneImei: orderRow[1],     // IMEI
      paymentStatus: orderRow[8], // 付款狀態
      depositTransactionNo: orderRow[18], // S欄：保證金交易編號
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
    const orderId = params.orderId;
    const { depositAmount, isTest, clientBackURL } = await req.json();

    // --- 防禦性修正：確保金額為純整數 ---
    const finalAmount = Math.round(Number(depositAmount));
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return NextResponse.json({ success: false, message: `Invalid deposit amount: ${depositAmount}` }, { status: 400 });
    }

    // 根據 orderId 獲取訂單詳細資訊
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

    // 生成保證金預授權訂單編號 (ECPay限制20字元)
    // 使用訂單號後6碼 + P(PreAuth) + 時間戳後8碼
    const orderSuffix = orderId.slice(-6);
    const timestamp = Date.now().toString().slice(-8);
    const preAuthOrderId = `${orderSuffix}P${timestamp}`;

    // 改善商品明細，明確標示為保證金預授權
    const phoneImei = orderInfo.phoneImei;
    
    // 根據IMEI判斷手機型號（因為phoneModel欄位目前是IMEI）
    let phoneModelName = 'S25U'; // 預設值
    if (phoneImei.startsWith('356789') || phoneImei.startsWith('867530')) {
      phoneModelName = 'S24U';
    } else if (phoneImei.startsWith('456789') || phoneImei.startsWith('654321')) {
      phoneModelName = 'S23U';
    }
    
    const itemName = `${phoneModelName}押金預授權-IMEI:${phoneImei}`;

    let merchantID: string;
    let platformID: string;
    let hashKey: string;
    let hashIV: string;
    let merchantName: string;
    let isProductionEnv = false;

    if (isTest) {
      // 來自 /test-preauth 頁面的請求，強制使用平台商測試資料
      console.log('Request from test page, using ECPay Platform Test credentials for sub-merchant.');
      merchantID = '2000132'; // 子廠商ID
      platformID = '3085340'; // 平台商ID
      hashKey = '5294y06JbISpM5x9'; // 子廠商金鑰
      hashIV = 'v77hoKGq4kWxNNIS'; // 子廠商金鑰
      merchantName = '測試商店';
      isProductionEnv = false;
    } else {
      // 來自網站正常流程的請求
      const isVercelProduction = process.env.VERCEL_ENV === 'production';
      if (isVercelProduction) {
        // 正式環境
        console.log('Production environment, using Production ECPay credentials.');
        merchantID = process.env.ECPAY_MERCHANT_ID!;
        platformID = process.env.ECPAY_MERCHANT_ID!; // 使用 MERCHANT_ID 作為 PLATFORM_ID
        hashKey = process.env.ECPAY_HASH_KEY!;
        hashIV = process.env.ECPAY_HASH_IV!;
        merchantName = '伊森不累'; // 使用綠界後台實際註冊的商店名稱
        isProductionEnv = true;
      } else {
        // 開發或 Vercel 預覽環境
        console.log('Non-production environment, using standard Test credentials.');
        merchantID = '3002607';
        platformID = '3002607';
        hashKey = 'pwFHCqoQZGmho4w6';
        hashIV = 'EkRm7iFT261dpevs';
        merchantName = '測試商店';
        isProductionEnv = false;
      }
    }

    console.log('Final ECPay config:', {
      merchantID,
      platformID,
      merchantName,
      isProductionEnv
    });

    // 確保 NEXT_PUBLIC_SITE_URL 存在
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      throw new Error('NEXT_PUBLIC_SITE_URL is not configured');
    }

    const paymentParams = getECPayPreAuthParams({
      merchantTradeNo: preAuthOrderId,
      totalAmount: finalAmount,
      itemName: itemName,
      merchantID,
      platformID,
      hashKey,
      hashIV,
      holdTradeAmount: finalAmount,
      merchantName,
      clientBackURL: clientBackURL // 使用前端傳來的合約頁面URL
    });

    // 準備ECPay表單URL
    const ecpayUrl = isProductionEnv 
      ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
      : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';

    // --- 日誌記錄：發送給 ECPay 的最終參數 ---
    console.log('[ECPAY_REQUEST]', JSON.stringify({
      message: `Sending pre-auth request for order ${orderId}`,
      url: ecpayUrl,
      params: paymentParams
    }, null, 2));

    // 更新Google Sheet記錄保證金預授權交易號
    await updateDepositTransactionInSheet(orderId, preAuthOrderId, finalAmount);

    return NextResponse.json({
      success: true,
      message: '保證金預授權訂單已建立（不會立即扣款）',
      paymentParams,
      ecpayUrl,
      preAuthOrderId,
      depositAmount: finalAmount,
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