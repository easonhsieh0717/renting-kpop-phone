import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { callECPayRefundAPI } from '@/lib/ecpay';

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

export async function POST(req: NextRequest) {
  try {
    const { orderId, forceEcpayTradeNo } = await req.json();

    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: '請提供訂單編號'
      }, { status: 400 });
    }

    console.log(`[MANUAL_VOID] 開始手動取消預授權：${orderId}`);

    // 讀取 Google Sheets 資料
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:BB',
    });

    const rows = response.data.values || [];
    
    // 查找訂單
    let targetRow = null;
    let targetRowIndex = -1;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === orderId) {
        targetRow = row;
        targetRowIndex = i + 1;
        break;
      }
    }

    if (!targetRow) {
      return NextResponse.json({
        success: false,
        message: `找不到訂單 ${orderId}`
      }, { status: 404 });
    }

    // 提取資料
    const depositTransactionNo = targetRow[18] || ''; // S欄
    const depositAmount = parseInt(targetRow[19]) || 0; // T欄
    const depositStatus = targetRow[20] || ''; // U欄
    
    // 檢查多個位置的 ECPay 交易編號
    let ecpayTradeNo = forceEcpayTradeNo || '';
    if (!ecpayTradeNo) {
      const possiblePositions = [24, 25, 26, 27]; // Y, Z, AA, BB
      for (const pos of possiblePositions) {
        if (targetRow[pos] && targetRow[pos].toString().length >= 10) {
          ecpayTradeNo = targetRow[pos].toString();
          console.log(`[MANUAL_VOID] 在位置 ${pos} 找到 ECPay 交易編號: ${ecpayTradeNo}`);
          break;
        }
      }
    }

    console.log(`[MANUAL_VOID] 訂單資料:`, {
      orderId,
      depositTransactionNo,
      depositAmount,
      depositStatus,
      ecpayTradeNo,
      rowIndex: targetRowIndex
    });

    if (!depositTransactionNo) {
      return NextResponse.json({
        success: false,
        message: '找不到預授權交易編號'
      }, { status: 404 });
    }

    if (!ecpayTradeNo) {
      return NextResponse.json({
        success: false,
        message: '找不到 ECPay 交易編號，請手動提供 forceEcpayTradeNo 參數'
      }, { status: 404 });
    }

    // 使用正式環境的憑證
    const merchantID = process.env.ECPAY_MERCHANT_ID!;
    const hashKey = process.env.ECPAY_HASH_KEY!;
    const hashIV = process.env.ECPAY_HASH_IV!;

    console.log(`[MANUAL_VOID] 準備調用 ECPay API:`, {
      merchantTradeNo: depositTransactionNo,
      tradeNo: ecpayTradeNo,
      totalAmount: depositAmount,
      merchantID
    });

    // 調用 ECPay 取消預授權 API
    const ecpayResult = await callECPayRefundAPI({
      merchantTradeNo: depositTransactionNo,
      tradeNo: ecpayTradeNo,
      action: 'N', // N=放棄(取消預授權)
      totalAmount: depositAmount,
      merchantID,
      hashKey,
      hashIV,
      platformID: merchantID,
      isProduction: true
    });

    console.log(`[MANUAL_VOID] ECPay 回應:`, ecpayResult);

    if (ecpayResult.success) {
      // 更新 Google Sheets 狀態為 VOID
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `reservations!U${targetRowIndex}`, // U欄：狀態
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['VOID']],
        },
      });

      return NextResponse.json({
        success: true,
        message: '預授權取消成功',
        data: {
          orderId,
          ecpayResult,
          updatedStatus: 'VOID'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `ECPay 取消失敗: ${ecpayResult.RtnMsg}`,
        data: {
          orderId,
          ecpayResult
        }
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[MANUAL_VOID] 錯誤:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '手動取消失敗'
    }, { status: 500 });
  }
} 