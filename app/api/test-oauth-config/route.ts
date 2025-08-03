import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const oauthClientId = process.env.OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const oauthClientSecret = process.env.OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    const oauthRefreshToken = process.env.OAUTH_REFRESH_TOKEN || process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
    
    const config = {
      oauthClientId: oauthClientId ? `${oauthClientId.substring(0, 10)}...` : 'NOT_SET',
      oauthClientSecret: oauthClientSecret ? `${oauthClientSecret.substring(0, 10)}...` : 'NOT_SET',
      oauthRefreshToken: oauthRefreshToken ? `${oauthRefreshToken.substring(0, 10)}...` : 'NOT_SET',
      hasAllConfig: !!(oauthClientId && oauthClientSecret && oauthRefreshToken)
    };
    
    return NextResponse.json({
      success: true,
      config,
      message: 'OAuth 配置檢查完成'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: '檢查 OAuth 配置時發生錯誤',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 