import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
const OAUTH_REFRESH_TOKEN = process.env.OAUTH_REFRESH_TOKEN || process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '';

// 記錄 token 刷新時間的 Google Sheet ID
const TOKEN_LOG_SHEET_ID = process.env.GOOGLE_SHEET_ID || '';

interface TokenRefreshLog {
  timestamp: string;
  status: 'success' | 'failed';
  error?: string;
  newRefreshToken?: string;
  expiresIn?: number;
}

// 記錄 token 刷新到 Google Sheet
async function logTokenRefresh(log: TokenRefreshLog) {
  try {
    // 使用專門的記錄 API
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/oauth/log-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...log,
        refreshType: 'manual'
      })
    });

    if (response.ok) {
      console.log('Token refresh logged successfully');
    } else {
      console.warn('Failed to log token refresh');
    }
  } catch (error) {
    console.error('Failed to log token refresh:', error);
  }
}

// 更新 Vercel 環境變數（需要 Vercel CLI 或 API）
async function updateVercelEnvironmentVariable(key: string, value: string) {
  try {
    // 注意：這需要 Vercel API 權限，實際實現可能需要使用 Vercel CLI 或 API
    console.log(`Would update Vercel env var: ${key} = ${value.substring(0, 20)}...`);
    
    // 這裡只是記錄，實際更新需要 Vercel API 權限
    // 你可以手動更新或使用 Vercel CLI
    return true;
  } catch (error) {
    console.error('Failed to update Vercel environment variable:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { force = false } = await request.json();
    
    if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REFRESH_TOKEN) {
      const error = 'OAuth configuration missing';
      await logTokenRefresh({
        timestamp: new Date().toISOString(),
        status: 'failed',
        error
      });
      
      return NextResponse.json({ 
        success: false,
        error,
        message: 'OAuth 配置不完整，請檢查環境變數'
      }, { status: 400 });
    }

    // 創建 OAuth2 客戶端
    const oauth2Client = new google.auth.OAuth2(
      OAUTH_CLIENT_ID,
      OAUTH_CLIENT_SECRET
    );

    // 設定 refresh token
    oauth2Client.setCredentials({
      refresh_token: OAUTH_REFRESH_TOKEN
    });

    try {
      // 使用 refresh token 獲取新的 tokens
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      if (credentials.refresh_token) {
        // 記錄成功刷新
        await logTokenRefresh({
          timestamp: new Date().toISOString(),
          status: 'success',
          newRefreshToken: credentials.refresh_token,
          expiresIn: (credentials as any).expires_in
        });

        // 嘗試更新 Vercel 環境變數
        await updateVercelEnvironmentVariable('GOOGLE_OAUTH_REFRESH_TOKEN', credentials.refresh_token);

        return NextResponse.json({ 
          success: true,
          message: 'Token 刷新成功',
          newRefreshToken: credentials.refresh_token,
          expiresIn: (credentials as any).expires_in,
          timestamp: new Date().toISOString()
        });
      } else {
        const error = 'No new refresh token received';
        await logTokenRefresh({
          timestamp: new Date().toISOString(),
          status: 'failed',
          error
        });

        return NextResponse.json({ 
          success: false,
          error,
          message: '未收到新的 refresh token'
        }, { status: 400 });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await logTokenRefresh({
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: errorMessage
      });

      return NextResponse.json({ 
        success: false,
        error: 'Token refresh failed',
        message: 'Refresh token 已過期或無效，請重新授權',
        details: errorMessage
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Token refresh API error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: 'Token 刷新時發生錯誤',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    
    if (!refreshToken) {
      return NextResponse.json({ 
        hasToken: false,
        lastRefreshTime: null,
        currentTime: new Date().toISOString(),
        message: '沒有設定 refresh token'
      });
    }

    // 檢查是否需要刷新（這裡可以加入時間檢查邏輯）
    const lastRefreshTime = process.env.LAST_TOKEN_REFRESH_TIME;
    const now = new Date();
    
    return NextResponse.json({ 
      hasToken: true,
      lastRefreshTime,
      currentTime: now.toISOString(),
      message: 'Token 狀態檢查完成'
    });
  } catch (error) {
    console.error('Token status check error:', error);
    return NextResponse.json({ 
      hasToken: false,
      lastRefreshTime: null,
      currentTime: new Date().toISOString(),
      error: 'Internal server error',
      message: '檢查 token 狀態時發生錯誤'
    }, { status: 500 });
  }
} 