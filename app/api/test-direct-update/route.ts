import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

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

// 時間格式化函數
function formatDateTimeInTaipei(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date).replace(/\//g, '/');
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, newStatus } = await req.json();
    
    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: '請提供訂單編號'
      }, { status: 400 });
    }

    const statusToUpdate = newStatus || 'VOID';
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({
        success: false,
        message: 'GOOGLE_SHEET_ID is not configured'
      }, { status: 500 });
    }

    console.log(`[DIRECT_UPDATE] 開始直接更新訂單 ${orderId} 的狀態為 ${statusToUpdate}`);

    // 1. 先找到訂單所在的行
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:A', // 只讀取A欄的訂單編號
    });

    const rows = response.data.values || [];
    let targetRow = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === orderId) {
        targetRow = i + 1; // Google Sheets行號從1開始
        break;
      }
    }

    if (targetRow === -1) {
      return NextResponse.json({
        success: false,
        message: `找不到訂單 ${orderId}`
      }, { status: 404 });
    }

    console.log(`[DIRECT_UPDATE] 找到訂單 ${orderId} 在第 ${targetRow} 行`);

    // 2. 讀取當前狀態
    const currentStatusResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `reservations!U${targetRow}`, // U欄：保證金狀態
    });

    const currentStatus = currentStatusResponse.data.values?.[0]?.[0] || '';
    console.log(`[DIRECT_UPDATE] 當前狀態: ${currentStatus}`);

    // 3. 讀取當前預授權金額作為退刷金額
    const currentAmountResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `reservations!T${targetRow}`, // T欄：保證金金額
    });

    const refundAmount = currentAmountResponse.data.values?.[0]?.[0] || '0';
    console.log(`[DIRECT_UPDATE] 預授權金額: ${refundAmount}`);

    // 4. 直接更新多個相關欄位
    const updateTime = formatDateTimeInTaipei(new Date());
    console.log(`[DIRECT_UPDATE] 準備更新:`);
    console.log(`[DIRECT_UPDATE] - U${targetRow} (保證金狀態) = ${statusToUpdate}`);
    console.log(`[DIRECT_UPDATE] - V${targetRow} (已退刷金額) = ${refundAmount}`);
    console.log(`[DIRECT_UPDATE] - W${targetRow} (退刷時間) = ${updateTime}`);
    console.log(`[DIRECT_UPDATE] - X${targetRow} (損壞費用) = 0`);

    const updateResult = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `reservations!U${targetRow}`, // U欄：保證金狀態
            values: [[statusToUpdate]]
          },
          {
            range: `reservations!V${targetRow}`, // V欄：已退刷金額
            values: [[refundAmount]]
          },
          {
            range: `reservations!W${targetRow}`, // W欄：退刷時間
            values: [[updateTime]]
          },
          {
            range: `reservations!X${targetRow}`, // X欄：損壞費用
            values: [['0']]
          }
        ]
      }
    });

    console.log(`[DIRECT_UPDATE] 更新結果狀態碼: ${updateResult.status}`);
    console.log(`[DIRECT_UPDATE] 更新的儲存格數量: ${updateResult.data.totalUpdatedCells}`);

    // 5. 驗證更新結果
    const verifyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `reservations!U${targetRow}:X${targetRow}`, // U到X欄位
    });

    const verifyData = verifyResponse.data.values?.[0] || [];
    const actualStatus = verifyData[0] || '';        // U欄：狀態
    const actualRefundAmount = verifyData[1] || '';  // V欄：退刷金額
    const actualTime = verifyData[2] || '';          // W欄：時間
    const actualDamage = verifyData[3] || '';        // X欄：損壞費用

    console.log(`[DIRECT_UPDATE] 驗證結果:`);
    console.log(`[DIRECT_UPDATE] - 狀態: ${actualStatus}`);
    console.log(`[DIRECT_UPDATE] - 退刷金額: ${actualRefundAmount}`);
    console.log(`[DIRECT_UPDATE] - 時間: ${actualTime}`);
    console.log(`[DIRECT_UPDATE] - 損壞費用: ${actualDamage}`);

    return NextResponse.json({
      success: true,
      message: `成功更新訂單 ${orderId} 的狀態和相關欄位`,
      data: {
        orderId,
        targetRow,
        updates: {
          status: {
            old: currentStatus,
            new: statusToUpdate,
            actual: actualStatus,
            success: actualStatus === statusToUpdate
          },
          refundAmount: {
            expected: refundAmount,
            actual: actualRefundAmount,
            success: actualRefundAmount === refundAmount
          },
          time: {
            expected: updateTime,
            actual: actualTime
          },
          damageAmount: {
            expected: '0',
            actual: actualDamage,
            success: actualDamage === '0'
          }
        },
        updatedCells: updateResult.data.totalUpdatedCells,
        allUpdatesSuccess: actualStatus === statusToUpdate && actualRefundAmount === refundAmount && actualDamage === '0'
      }
    });

  } catch (error: any) {
    console.error('[DIRECT_UPDATE] 錯誤:', error);
    return NextResponse.json({
      success: false,
      message: error.message || '直接更新失敗',
      error: error.toString()
    }, { status: 500 });
  }
} 