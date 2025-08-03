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

    // 檢查是否需要刷新 token
    const lastRefreshTime = process.env.LAST_TOKEN_REFRESH_TIME;
    const now = new Date();
    const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000; // 5天

    if (lastRefreshTime) {
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
    
    // 確保 URL 有正確的協議前綴
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const refreshResponse = await fetch(`${baseUrl}/api/oauth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force: true })
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('Refresh token API error:', refreshResponse.status, errorText);
      return NextResponse.json({ 
        success: false,
        error: 'Refresh token API failed',
        message: 'Token 刷新 API 失敗',
        details: `HTTP ${refreshResponse.status}: ${errorText.substring(0, 200)}`
      }, { status: 500 });
    }

    let refreshResult;
    try {
      refreshResult = await refreshResponse.json();
    } catch (error) {
      const errorText = await refreshResponse.text();
      console.error('Failed to parse refresh response:', error, errorText);
      return NextResponse.json({ 
        success: false,
        error: 'Invalid JSON response',
        message: 'Token 刷新回應格式錯誤',
        details: `JSON 解析失敗: ${errorText.substring(0, 200)}`
      }, { status: 500 });
    }

    if (refreshResult.success) {
      console.log('Token refresh completed successfully');
      
      // 記錄自動刷新到 Google Sheet
      try {
        await fetch(`${baseUrl}/api/oauth/log-refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timestamp: now.toISOString(),
            status: 'success',
            newRefreshToken: refreshResult.newRefreshToken,
            expiresIn: refreshResult.expiresIn,
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
    } else {
      console.error('Token refresh failed:', refreshResult);
      
      // 記錄失敗的自動刷新
      try {
        await fetch(`${baseUrl}/api/oauth/log-refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timestamp: now.toISOString(),
            status: 'failed',
            error: refreshResult.error || 'Unknown error',
            refreshType: 'automatic'
          })
        });
      } catch (error) {
        console.error('Failed to log automatic refresh failure:', error);
      }
      
      return NextResponse.json({ 
        success: false,
        error: 'Token refresh failed',
        message: 'Token 自動刷新失敗',
        details: refreshResult
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