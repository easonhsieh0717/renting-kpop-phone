import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    
    if (!refreshToken) {
      return NextResponse.json({ 
        valid: false, 
        error: 'No refresh token found',
        message: '請前往 OAuth 設定頁面重新獲取 refresh token'
      });
    }

    // 創建 OAuth2 客戶端
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // 設定 refresh token
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    try {
      // 嘗試使用 refresh token 獲取新的 access token
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      if (credentials.access_token) {
        return NextResponse.json({ 
          valid: true,
          message: 'Refresh token 有效',
          expires_in: (credentials as any).expires_in,
          token_type: (credentials as any).token_type
        });
      } else {
        return NextResponse.json({ 
          valid: false,
          error: 'Failed to refresh access token',
          message: 'Refresh token 已過期，請重新獲取'
        });
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return NextResponse.json({ 
        valid: false,
        error: 'Token refresh failed',
        message: 'Refresh token 已過期或無效，請前往 OAuth 設定頁面重新獲取',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Token check error:', error);
    return NextResponse.json({ 
      valid: false,
      error: 'Internal server error',
      message: '檢查 token 時發生錯誤',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 