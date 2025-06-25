import { NextRequest, NextResponse } from 'next/server';

// 添加運行時配置
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const host = request.headers.get('host');
    const isLocalhost = host?.includes('localhost');
    
    const redirectUri = isLocalhost 
      ? 'http://localhost:3000/api/auth/callback'
      : `https://${host}/api/auth/callback`;

    // 創建Google OAuth授權URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'email profile');
    authUrl.searchParams.set('access_type', 'offline');

    console.log('Redirecting to Google OAuth:', authUrl.toString());

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Login error:', error);
    const host = request.headers.get('host');
    const baseUrl = host?.includes('localhost') 
      ? 'http://localhost:3000' 
      : `https://${host}`;
    return NextResponse.redirect(`${baseUrl}/login?error=login_failed`);
  }
} 