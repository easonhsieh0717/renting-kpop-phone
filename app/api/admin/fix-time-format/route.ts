import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { formatDateTimeInTaipei } from '@/lib/utils';

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

// 轉換UTC時間字串為台灣時間格式
function convertUTCToTaipei(utcString: string): string {
  if (!utcString || utcString === '') return '';
  
  try {
    // 檢查是否已經是台灣時間格式 (包含 / 或中文)
    if (utcString.includes('/') || utcString.includes('年') || utcString.includes('月') || utcString.includes('日')) {
      return utcString; // 已經是台灣時間格式，不需要轉換
    }
    
    // 嘗試解析UTC時間
    const date = new Date(utcString);
    if (isNaN(date.getTime())) {
      console.log(`無法解析時間格式: ${utcString}`);
      return utcString; // 無法解析，保持原樣
    }
    
    // 轉換為台灣時間格式
    return formatDateTimeInTaipei(date);
  } catch (error) {
    console.error(`時間轉換錯誤: ${utcString}`, error);
    return utcString; // 轉換失敗，保持原樣
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminKey } = body;
    
    // 簡單的管理員驗證
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ 
        success: false, 
        message: '無權限執行此操作' 
      }, { status: 403 });
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    console.log('開始批次修正時間格式...');

    // 獲取所有資料
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:Z',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return NextResponse.json({
        success: false,
        message: '沒有找到需要處理的資料'
      });
    }

    const updates = [];
    let processedCount = 0;
    let updatedCount = 0;

    // 處理每一行資料（跳過標題行）
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      let hasUpdates = false;
      const updatedRow = [...row];

      // 檢查並轉換各個時間欄位
      const timeColumns = [
        { index: 9, name: '建立時間', column: 'J' },      // J欄：建立時間
        { index: 17, name: '發票開立時間', column: 'R' },  // R欄：發票開立時間
        { index: 22, name: '退刷時間', column: 'W' }       // W欄：退刷時間
      ];

      for (const timeCol of timeColumns) {
        if (row[timeCol.index]) {
          const originalTime = row[timeCol.index];
          const convertedTime = convertUTCToTaipei(originalTime);
          
          if (convertedTime !== originalTime) {
            updatedRow[timeCol.index] = convertedTime;
            hasUpdates = true;
            console.log(`行 ${rowNumber} ${timeCol.name}: ${originalTime} -> ${convertedTime}`);
          }
        }
      }

      if (hasUpdates) {
        // 準備批次更新
        updates.push({
          range: `reservations!A${rowNumber}:Z${rowNumber}`,
          values: [updatedRow]
        });
        updatedCount++;
      }
      
      processedCount++;
    }

    // 執行批次更新
    if (updates.length > 0) {
      console.log(`準備更新 ${updates.length} 行資料...`);
      
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates
        }
      });

      console.log('批次更新完成！');
    }

    return NextResponse.json({
      success: true,
      message: `處理完成！處理了 ${processedCount} 行資料，更新了 ${updatedCount} 行時間格式`,
      details: {
        processedCount,
        updatedCount,
        updatesApplied: updates.length
      }
    });

  } catch (error) {
    console.error('批次修正時間格式失敗:', error);
    return NextResponse.json({
      success: false,
      message: `處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    }, { status: 500 });
  }
}

// 獲取當前資料狀態（用於檢查）
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const adminKey = url.searchParams.get('adminKey');
    
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ 
        success: false, 
        message: '無權限執行此操作' 
      }, { status: 403 });
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'reservations!A:Z',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return NextResponse.json({
        success: true,
        message: '沒有資料',
        data: []
      });
    }

    // 分析時間格式
    const timeAnalysis = [];
    
    for (let i = 1; i < Math.min(rows.length, 21); i++) { // 只檢查前20行
      const row = rows[i];
      const analysis = {
        rowNumber: i + 1,
        orderId: row[0] || '',
        customerName: row[5] || '',
        createdAt: row[9] || '',
        invoiceTime: row[17] || '',
        refundTime: row[22] || '',
        needsUpdate: false
      };

      // 檢查是否需要更新
      const timeFields = [row[9], row[17], row[22]];
      analysis.needsUpdate = timeFields.some(time => 
        time && !time.includes('/') && !time.includes('年') && 
        time.includes('T') && time.includes('Z')
      );

      timeAnalysis.push(analysis);
    }

    return NextResponse.json({
      success: true,
      message: '資料檢查完成',
      totalRows: rows.length - 1,
      sampleData: timeAnalysis,
      needsUpdateCount: timeAnalysis.filter(item => item.needsUpdate).length
    });

  } catch (error) {
    console.error('檢查資料失敗:', error);
    return NextResponse.json({
      success: false,
      message: `檢查失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    }, { status: 500 });
  }
} 