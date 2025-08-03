import { NextRequest, NextResponse } from 'next/server';

// 安全金鑰驗證
const CRON_SECRET = process.env.CRON_SECRET || 'default-secret';

export async function GET(request: NextRequest) {
  try {
    // 驗證安全金鑰
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized',
        message: '未授權的請求'
      }, { status: 401 });
    }

    // 檢查是否需要刷新 token（測試時跳過時間檢查）
    const lastRefreshTime = process.env.LAST_TOKEN_REFRESH_TIME;
    const now = new Date();
    const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000; // 5天

    // 檢查是否為測試模式（從 URL 參數或請求頭判斷）
    const url = new URL(request.url);
    const isTestMode = url.searchParams.get('test') === 'true' || 
                      request.headers.get('x-test-mode') === 'true';

    if (lastRefreshTime && !isTestMode) {
      const lastRefresh = new Date(lastRefreshTime);
      const timeSinceLastRefresh = now.getTime() - lastRefresh.getTime();
      
      if (timeSinceLastRefresh < fiveDaysInMs) {
        return NextResponse.json({ 
          success: true,
          message: 'Token 還未到刷新時間',
          lastRefreshTime,
          nextRefreshTime: new Date(lastRefresh.getTime() + fiveDaysInMs).toISOString(),
          timeRemaining: Math.floor((fiveDaysInMs - timeSinceLastRefresh) / (1000 * 60 * 60 * 24)) // 剩餘天數
        });
      }
    }

    // 執行 token 刷新
    console.log('Starting automatic token refresh...');
    
    // 直接調用 OAuth 刷新功能，避免 API 調用問題
    try {
      const { google } = await import('googleapis');
      
      const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
      const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
      const OAUTH_REFRESH_TOKEN = process.env.OAUTH_REFRESH_TOKEN || process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '';
      
      if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REFRESH_TOKEN) {
        throw new Error('OAuth configuration missing');
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
      
      // 使用 refresh token 獲取新的 tokens
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      if (!credentials.refresh_token) {
        throw new Error('No new refresh token received');
      }
      
      const refreshResult = {
        success: true,
        message: 'Token 刷新成功',
        newRefreshToken: credentials.refresh_token,
        expiresIn: (credentials as any).expires_in,
        timestamp: new Date().toISOString()
      };
      
      console.log('Token refresh completed successfully');
      
      // 記錄自動刷新到 Google Sheet
      try {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000';
          
        await fetch(`${baseUrl}/api/oauth/log-refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timestamp: now.toISOString(),
            status: 'success',
            newRefreshToken: credentials.refresh_token,
            expiresIn: (credentials as any).expires_in,
            refreshType: 'automatic'
          })
        });
      } catch (error) {
        console.error('Failed to log automatic refresh:', error);
      }
      
      // 更新最後刷新時間（這裡需要手動更新環境變數）
      console.log('LAST_TOKEN_REFRESH_TIME should be updated to:', now.toISOString());
      
      return NextResponse.json({ 
        success: true,
        message: 'Token 自動刷新成功',
        refreshResult,
        lastRefreshTime: now.toISOString()
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Automatic token refresh failed:', errorMessage);
      
      // 記錄失敗的自動刷新
      try {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000';
          
        await fetch(`${baseUrl}/api/oauth/log-refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timestamp: now.toISOString(),
            status: 'failed',
            error: errorMessage,
            refreshType: 'automatic'
          })
        });
      } catch (logError) {
        console.error('Failed to log automatic refresh failure:', logError);
      }
      
      return NextResponse.json({ 
        success: false,
        error: 'Token refresh failed',
        message: 'Token 自動刷新失敗',
        details: errorMessage
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Cron token refresh error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: '定時任務執行時發生錯誤',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // POST 方法用於手動觸發
  return GET(request);
} 