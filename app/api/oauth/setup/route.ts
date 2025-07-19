import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'get_auth_url') {
      // 調試：檢查所有可能的環境變數
      console.log('=== 環境變數調試 ===');
      console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'EXISTS' : 'MISSING');
      console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'EXISTS' : 'MISSING');
      console.log('GOOGLE_OAUTH_CLIENT_ID:', process.env.GOOGLE_OAUTH_CLIENT_ID ? 'EXISTS' : 'MISSING');
      console.log('GOOGLE_OAUTH_CLIENT_SECRET:', process.env.GOOGLE_OAUTH_CLIENT_SECRET ? 'EXISTS' : 'MISSING');
      console.log('OAUTH_CLIENT_ID:', OAUTH_CLIENT_ID ? 'EXISTS' : 'MISSING');
      console.log('OAUTH_CLIENT_SECRET:', OAUTH_CLIENT_SECRET ? 'EXISTS' : 'MISSING');
      console.log('=== 環境變數調試結束 ===');
      
      if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
        return NextResponse.json({ 
          error: 'OAuth configuration missing',
          details: {
            client_id: OAUTH_CLIENT_ID ? 'SET' : 'MISSING',
            client_secret: OAUTH_CLIENT_SECRET ? 'SET' : 'MISSING'
          }
        }, { status: 500 });
      }
      
      // 根據環境決定重導向 URI
      const isProduction = process.env.VERCEL_URL || process.env.NODE_ENV === 'production';
      const redirectUri = isProduction 
        ? `https://renting-kpop-phone.vercel.app/oauth-setup`
        : 'http://localhost:3000/oauth-setup';
      
      // 調試：檢查環境和重定向 URI
      console.log('=== 環境調試 ===');
      console.log('VERCEL_URL:', process.env.VERCEL_URL);
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('isProduction:', isProduction);
      console.log('redirectUri:', redirectUri);
      console.log('=== 環境調試結束 ===');
      
      // 生成授權 URL
      const oauth2Client = new google.auth.OAuth2(
        OAUTH_CLIENT_ID,
        OAUTH_CLIENT_SECRET,
        redirectUri
      );
      
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive'],
        prompt: 'consent' // 強制顯示同意畫面以獲取 refresh token
      });
      
      return NextResponse.json({ 
        authUrl,
        debug: {
          client_id: OAUTH_CLIENT_ID,
          redirect_uri: redirectUri,
          scope: 'https://www.googleapis.com/auth/drive'
        }
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('OAuth setup error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }
    
    // 根據環境決定重導向 URI
    const isProduction = process.env.VERCEL_URL || process.env.NODE_ENV === 'production';
    const redirectUri = isProduction 
      ? `https://renting-kpop-phone.vercel.app/oauth-setup`
      : 'http://localhost:3000/oauth-setup';
    
    // 使用授權碼取得 tokens
    const oauth2Client = new google.auth.OAuth2(
      OAUTH_CLIENT_ID,
      OAUTH_CLIENT_SECRET,
      redirectUri
    );
    
    const { tokens } = await oauth2Client.getToken(code);
    
    return NextResponse.json({ 
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      message: 'OAuth tokens retrieved successfully' 
    });
  } catch (error) {
    console.error('OAuth token exchange error:', error);
    return NextResponse.json({ 
      error: 'Failed to exchange authorization code',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 