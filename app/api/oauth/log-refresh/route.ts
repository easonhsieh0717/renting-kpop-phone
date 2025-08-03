import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const TOKEN_LOG_SHEET_ID = process.env.GOOGLE_SHEET_ID || '';

interface TokenRefreshLog {
  timestamp: string;
  status: 'success' | 'failed';
  error?: string;
  newRefreshToken?: string;
  expiresIn?: number;
  refreshType: 'manual' | 'automatic';
}

// 記錄 token 刷新到 Google Sheet
async function logTokenRefresh(log: TokenRefreshLog) {
  try {
    if (!TOKEN_LOG_SHEET_ID) {
      console.warn('TOKEN_LOG_SHEET_ID not set, skipping log');
      return { success: false, error: 'TOKEN_LOG_SHEET_ID not set' };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const values = [[
      log.timestamp,
      log.status,
      log.error || '',
      log.newRefreshToken || '',
      log.expiresIn || '',
      log.refreshType
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: TOKEN_LOG_SHEET_ID,
      range: 'token_refresh_log!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values
      }
    });

    console.log('Token refresh logged to Google Sheet');
    return { success: true };
  } catch (error) {
    console.error('Failed to log token refresh:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const logData: TokenRefreshLog = await request.json();
    
    if (!logData.timestamp || !logData.status || !logData.refreshType) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields',
        message: '缺少必要欄位'
      }, { status: 400 });
    }

    const result = await logTokenRefresh(logData);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true,
        message: 'Token 刷新記錄已寫入 Google Sheet'
      });
    } else {
      return NextResponse.json({ 
        success: false,
        error: 'Failed to log to Google Sheet',
        message: '寫入 Google Sheet 失敗',
        details: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Log refresh API error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: '記錄刷新時發生錯誤',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!TOKEN_LOG_SHEET_ID) {
      return NextResponse.json({ 
        success: false,
        error: 'TOKEN_LOG_SHEET_ID not configured',
        message: '未設定 TOKEN_LOG_SHEET_ID'
      }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // 讀取最近的刷新記錄
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: TOKEN_LOG_SHEET_ID,
      range: 'token_refresh_log!A:F',
    });

    const rows = response.data.values || [];
    
    // 轉換為結構化資料
    const logs = rows.slice(1).map((row, index) => ({
      id: index + 1,
      timestamp: row[0] || '',
      status: row[1] || '',
      error: row[2] || '',
      newRefreshToken: row[3] ? `${row[3].substring(0, 20)}...` : '',
      expiresIn: row[4] || '',
      refreshType: row[5] || ''
    }));

    return NextResponse.json({ 
      success: true,
      logs,
      totalCount: logs.length,
      message: '成功讀取刷新記錄'
    });
  } catch (error) {
    console.error('Get refresh logs error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: '讀取刷新記錄時發生錯誤',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 