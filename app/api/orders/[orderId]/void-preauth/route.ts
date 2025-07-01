import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { callECPayRefundAPI } from '@/lib/ecpay';
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

// 獲取訂單的預授權交易資訊
async function getPreAuthTransactionInfo(orderId: string) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'reservations!A:BB', // 擴大讀取範圍到BB欄
  });

  const rows = response.data.values || [];
  console.log(`[VOID_PREAUTH_DEBUG] 總共有 ${rows.length} 行資料，正在查找訂單: ${orderId}`);
  
  // 先找所有可能包含預授權的行
  const preAuthRows = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[18] && row[18].includes('P')) { // S欄包含P的預授權交易
      preAuthRows.push({
        rowIndex: i + 1,
        orderId: row[0],
        depositTransactionNo: row[18]
      });
    }
  }
  console.log(`[VOID_PREAUTH_DEBUG] 找到 ${preAuthRows.length} 個預授權交易:`, preAuthRows);
  
  // 找到對應的訂單
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const googleSheetsRowNumber = i + 1; // Google Sheets行號（包含標題行）
    console.log(`[VOID_PREAUTH_DEBUG] 檢查陣列索引${i}行 (Google Sheets第${googleSheetsRowNumber}行): 訂單編號="${row[0]}", 查找="${orderId}", 匹配=${row[0] === orderId}`);
    console.log(`[VOID_PREAUTH_DEBUG] 陣列索引${i}行預授權交易編號: "${row[18]}"`);
    
    if (row[0] === orderId) { // A欄是訂單編號
      // 檢查多個可能的ECPay交易編號位置
      const possibleEcpayPositions = [24, 25, 26, 27]; // Y, Z, AA, BB欄
      let ecpayTradeNo = '';
      
      for (const pos of possibleEcpayPositions) {
        if (row[pos] && row[pos].toString().trim().length >= 10) {
          const potentialTradeNo = row[pos].toString().trim();
          // 檢查是否為純數字且長度合理
          if (/^\d{10,}$/.test(potentialTradeNo)) {
            console.log(`[VOID_PREAUTH_DEBUG] 在位置${pos}找到可能的ECPay交易編號: "${potentialTradeNo}"`);
            ecpayTradeNo = potentialTradeNo;
            break;
          }
        }
      }
      
      // 如果上面沒找到，直接檢查Y欄（最常見位置）
      if (!ecpayTradeNo && row[24]) {
        const yColumnValue = row[24].toString().trim();
        console.log(`[VOID_PREAUTH_DEBUG] 直接檢查Y欄值: "${yColumnValue}"`);
        if (yColumnValue.length >= 10) {
          ecpayTradeNo = yColumnValue;
          console.log(`[VOID_PREAUTH_DEBUG] 使用Y欄值作為ECPay交易編號: "${ecpayTradeNo}"`);
        }
      }
      
      const result = {
        orderId: row[0],
        depositTransactionNo: row[18] || '', // S欄：保證金交易編號
        ecpayTradeNo: ecpayTradeNo || row[24] || '', // 使用檢測到的ECPay交易編號
        depositAmount: parseInt(row[19]) || 0, // T欄：保證金金額
        depositStatus: row[20] || '', // U欄：保證金狀態
        captureAmount: parseInt(row[21]) || 0, // V欄：已請款金額
      };
      
      console.log(`[VOID_PREAUTH_DEBUG] 找到匹配行 ${i+1}，讀取到的資料:`, result);
      console.log(`[VOID_PREAUTH_DEBUG] 完整行資料 (所有欄位):`, row);
      console.log(`[VOID_PREAUTH_DEBUG] 檢查ECPay交易編號相關欄位:`);
      console.log(`[VOID_PREAUTH_DEBUG] - 位置24 (Y欄): "${row[24] || ''}"`);
      console.log(`[VOID_PREAUTH_DEBUG] - 位置25 (Z欄): "${row[25] || ''}"`);
      console.log(`[VOID_PREAUTH_DEBUG] - 位置26 (AA欄): "${row[26] || ''}"`);
      console.log(`[VOID_PREAUTH_DEBUG] - 位置27 (BB欄): "${row[27] || ''}"`);
      console.log(`[VOID_PREAUTH_DEBUG] - 最終選擇的ECPay交易編號: "${result.ecpayTradeNo}"`);
      
      return result;
    }
  }
  
  console.log(`[VOID_PREAUTH_DEBUG] 未找到訂單 ${orderId}，將檢查所有包含此訂單ID的行`);
  
  // 如果直接匹配失敗，嘗試查找包含該訂單ID的行
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] && row[0].includes(orderId)) {
      console.log(`[VOID_PREAUTH_DEBUG] 找到包含訂單ID的行 ${i+1}: "${row[0]}"`);
    }
  }
  
  throw new Error(`找不到訂單資訊: ${orderId}`);
}

// 更新預授權取消狀態和所有相關欄位 (U、V、W、X)
// 這是一個OVERWRITE操作 - 直接覆寫，不檢查當前狀態
async function updateVoidStatusWithAllFields(orderId: string, status: string, refundAmount: number) {
  console.log(`[UPDATE_VOID_ALL_FIELDS] 開始更新訂單 ${orderId} 的狀態為 ${status}，退刷金額 ${refundAmount}`);
  
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'reservations!A:Z',
  });

  const rows = response.data.values || [];
  console.log(`[UPDATE_VOID_ALL_FIELDS] 總共有 ${rows.length} 行資料`);
  
  // 找到對應的訂單並更新
  let found = false;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] === orderId) {
      const rowIndex = i + 1; // Google Sheets行號從1開始，且我們跳過了標題行
      found = true;
      
      console.log(`[UPDATE_VOID_ALL_FIELDS] 找到訂單在第 ${rowIndex} 行 (陣列索引 ${i})`);
      console.log(`[UPDATE_VOID_ALL_FIELDS] 更新前狀態: U${rowIndex} =`, row[20]); // U欄是索引20
      
      const updateTime = formatDateTimeInTaipei(new Date());
      console.log(`[UPDATE_VOID_ALL_FIELDS] 準備更新:`);
      console.log(`[UPDATE_VOID_ALL_FIELDS] - U${rowIndex} (保證金狀態) = ${status}`);
      console.log(`[UPDATE_VOID_ALL_FIELDS] - V${rowIndex} (已退刷金額) = ${refundAmount}`);
      console.log(`[UPDATE_VOID_ALL_FIELDS] - W${rowIndex} (退刷時間) = ${updateTime}`);
      console.log(`[UPDATE_VOID_ALL_FIELDS] - X${rowIndex} (損壞費用) = 0`);
      
      try {
        // 同時更新U、V、W、X欄位
        const updateResult = await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: [
              {
                range: `reservations!U${rowIndex}`, // U欄：保證金狀態
                values: [[status]]
              },
              {
                range: `reservations!V${rowIndex}`, // V欄：已退刷金額
                values: [[refundAmount.toString()]]
              },
              {
                range: `reservations!W${rowIndex}`, // W欄：退刷時間
                values: [[updateTime]]
              },
              {
                range: `reservations!X${rowIndex}`, // X欄：損壞費用
                values: [['0']]
              }
            ]
          }
        });
        
        console.log(`[UPDATE_VOID_ALL_FIELDS] 更新成功:`, updateResult.status);
        console.log(`[UPDATE_VOID_ALL_FIELDS] 更新了 ${updateResult.data.totalUpdatedCells} 個儲存格`);
        
        // 驗證更新結果
        const verifyResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `reservations!U${rowIndex}:X${rowIndex}`, // 驗證U到X欄位
        });
        
        const verifyData = verifyResponse.data.values?.[0] || [];
        console.log(`[UPDATE_VOID_ALL_FIELDS] 驗證更新結果:`);
        console.log(`[UPDATE_VOID_ALL_FIELDS] - 狀態: ${verifyData[0] || ''}`);
        console.log(`[UPDATE_VOID_ALL_FIELDS] - 退刷金額: ${verifyData[1] || ''}`);
        console.log(`[UPDATE_VOID_ALL_FIELDS] - 時間: ${verifyData[2] || ''}`);
        console.log(`[UPDATE_VOID_ALL_FIELDS] - 損壞費用: ${verifyData[3] || ''}`);
        
      } catch (updateError: any) {
        console.error(`[UPDATE_VOID_ALL_FIELDS] 更新失敗:`, updateError);
        throw updateError;
      }
      
      break;
    }
  }
  
  if (!found) {
    console.error(`[UPDATE_VOID_ALL_FIELDS] 未找到訂單 ${orderId}`);
    throw new Error(`未找到訂單 ${orderId} 來更新狀態`);
  }
  
  console.log(`[UPDATE_VOID_ALL_FIELDS] 完成更新訂單 ${orderId} 的所有相關欄位`);
}

interface VoidRequest {
  confirm: boolean;
  reason?: string;
}

// POST: 取消預授權
export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    const body: VoidRequest = await req.json();
    
    console.log(`Processing void pre-auth for order ${orderId}:`, body);

    // 確認機制檢查
    if (!body.confirm) {
      return NextResponse.json({
        success: false,
        message: '請確認要取消預授權操作'
      }, { status: 400 });
    }

    // 獲取訂單的預授權交易資訊
    const preAuthInfo = await getPreAuthTransactionInfo(orderId);
    
    // 添加調試信息
    console.log('Pre-auth info retrieved:', preAuthInfo);
    
    if (!preAuthInfo.depositTransactionNo) {
      return NextResponse.json({
        success: false,
        message: '找不到預授權交易記錄'
      }, { status: 404 });
    }

    if (!preAuthInfo.ecpayTradeNo) {
      return NextResponse.json({
        success: false,
        message: `找不到ECPay交易編號，無法取消預授權。讀取到的資料: ${JSON.stringify(preAuthInfo)}`
      }, { status: 404 });
    }

    // 只有成功取消的VOID狀態才阻止重複操作
    // VOID_FAILED狀態允許重試
    if (preAuthInfo.depositStatus === 'VOID') {
      return NextResponse.json({
        success: false,
        message: '此預授權已經取消，無需重複操作'
      }, { status: 400 });
    }

    if (preAuthInfo.captureAmount > 0) {
      return NextResponse.json({
        success: false,
        message: '此預授權已有部分請款，無法取消'
      }, { status: 400 });
    }

    // 準備ECPay取消預授權參數 - 使用與預授權建立時相同的憑證
    const isProduction = true; // 強制使用正式環境，因為預授權是用正式環境建立的
    const merchantID = process.env.ECPAY_MERCHANT_ID!; // 3383324
    const platformID = process.env.ECPAY_MERCHANT_ID!; // 與預授權建立時相同，使用merchantID作為platformID
    const hashKey = process.env.ECPAY_HASH_KEY!;
    const hashIV = process.env.ECPAY_HASH_IV!;
    
    console.log(`[VOID_PREAUTH_DEBUG] 使用商店代號: ${merchantID}, platformID: ${platformID}, 正式環境: ${isProduction}`);

    if (!hashKey || !hashIV) {
      throw new Error('ECPay credentials not configured');
    }

    // 呼叫ECPay取消預授權API - 使用原始預授權交易編號作為MerchantTradeNo
    console.log('[VOID_PREAUTH_DEBUG] 嘗試取消預授權，訂單:', orderId);
    console.log('[VOID_PREAUTH_DEBUG] 使用原始預授權交易編號作為MerchantTradeNo:', {
      merchantTradeNo: preAuthInfo.depositTransactionNo,
      tradeNo: preAuthInfo.ecpayTradeNo,
      totalAmount: preAuthInfo.depositAmount
    });

    let ecpayResult = await callECPayRefundAPI({
      merchantTradeNo: preAuthInfo.depositTransactionNo, // 使用原始預授權交易編號
      tradeNo: preAuthInfo.ecpayTradeNo,
      action: 'N', // N=放棄(取消預授權)
      totalAmount: preAuthInfo.depositAmount,
      merchantID,
      hashKey,
      hashIV,
      platformID, // 添加platformID參數
      isProduction
    });

    console.log('[VOID_PREAUTH_DEBUG] 結果:', ecpayResult);

    // 如果還是失敗，嘗試使用預授權交易編號作為TradeNo
    if (!ecpayResult.success && ecpayResult.RtnMsg === '訂單不存在') {
      console.log('[VOID_PREAUTH_DEBUG] 備用方案 - 使用預授權交易編號作為TradeNo:', {
        merchantTradeNo: preAuthInfo.depositTransactionNo,
        tradeNo: preAuthInfo.depositTransactionNo,
        totalAmount: preAuthInfo.depositAmount
      });

      ecpayResult = await callECPayRefundAPI({
        merchantTradeNo: preAuthInfo.depositTransactionNo,
        tradeNo: preAuthInfo.depositTransactionNo, // 兩個都使用預授權交易編號
        action: 'N', // N=放棄(取消預授權)
        totalAmount: preAuthInfo.depositAmount,
        merchantID,
        hashKey,
        hashIV,
        platformID, // 添加platformID參數
        isProduction
      });

      console.log('[VOID_PREAUTH_DEBUG] 備用方案結果:', ecpayResult);
    }

    console.log('ECPay void result:', ecpayResult);

    if (ecpayResult.success) {
      // ECPay取消成功 → 直接OVERWRITE為VOID，不管Google Sheets當前狀態
      try {
        await updateVoidStatusWithAllFields(orderId, 'VOID', preAuthInfo.depositAmount);
        console.log(`[VOID_PREAUTH_SUCCESS] ECPay取消成功，Google Sheets也已更新所有相關欄位`);
      } catch (updateError: any) {
        console.error(`[VOID_PREAUTH_WARNING] ECPay取消成功，但Google Sheets更新失敗:`, updateError);
        // 即使Google Sheets更新失敗，ECPay已經成功取消，所以仍然回傳成功
        return NextResponse.json({
          success: true,
          message: '預授權取消成功，但狀態更新失敗。請手動檢查。',
          data: {
            orderId,
            voidAmount: preAuthInfo.depositAmount,
            status: 'VOID',
            ecpayResult,
            updateWarning: updateError.message || '更新錯誤'
          }
        });
      }
      
      return NextResponse.json({
        success: true,
        message: '預授權取消成功',
        data: {
          orderId,
          voidAmount: preAuthInfo.depositAmount,
          status: 'VOID',
          ecpayResult
        }
      });
    } else {
      // ECPay取消失敗 → 直接OVERWRITE為VOID_FAILED，記錄失敗狀態
      try {
        await updateVoidStatusWithAllFields(orderId, 'VOID_FAILED', 0); // 失敗時退刷金額為0
        console.log(`[VOID_PREAUTH_FAILED] ECPay取消失敗，已記錄到Google Sheets`);
      } catch (updateError: any) {
        console.error(`[VOID_PREAUTH_ERROR] ECPay取消失敗，Google Sheets更新也失敗:`, updateError);
      }
      
      return NextResponse.json({
        success: false,
        message: `預授權取消失敗: ${ecpayResult.RtnMsg}`,
        error: ecpayResult.RtnMsg
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Void pre-auth error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '取消預授權失敗'
    }, { status: 500 });
  }
} 