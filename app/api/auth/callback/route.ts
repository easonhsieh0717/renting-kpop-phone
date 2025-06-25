import { NextRequest, NextResponse } from 'next/server';

// 添加運行時配置
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('OAuth callback - code:', !!code, 'state:', state, 'error:', error);

    if (error) {
      console.error('OAuth error:', error);
      const baseUrl = request.headers.get('host')?.includes('localhost') 
        ? 'http://localhost:3000' 
        : `https://${request.headers.get('host')}`;
      return NextResponse.redirect(`${baseUrl}/login?error=callback_failed`);
    }

    if (!code) {
      console.error('No authorization code received');
      const baseUrl = request.headers.get('host')?.includes('localhost') 
        ? 'http://localhost:3000' 
        : `https://${request.headers.get('host')}`;
      return NextResponse.redirect(`${baseUrl}/login?error=callback_failed`);
    }

    // 檢查環境變數
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials');
      const baseUrl = request.headers.get('host')?.includes('localhost') 
        ? 'http://localhost:3000' 
        : `https://${request.headers.get('host')}`;
      return NextResponse.redirect(`${baseUrl}/login?error=config_error`);
    }

    // 交換授權碼獲取access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: request.headers.get('host')?.includes('localhost') 
          ? 'http://localhost:3000/api/auth/callback'
          : `https://${request.headers.get('host')}/api/auth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      const baseUrl = request.headers.get('host')?.includes('localhost') 
        ? 'http://localhost:3000' 
        : `https://${request.headers.get('host')}`;
      return NextResponse.redirect(`${baseUrl}/login?error=token_failed`);
    }

    const tokenData = await tokenResponse.json();
    
    // 獲取用戶信息
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch user info');
      const baseUrl = request.headers.get('host')?.includes('localhost') 
        ? 'http://localhost:3000' 
        : `https://${request.headers.get('host')}`;
      return NextResponse.redirect(`${baseUrl}/login?error=callback_failed`);
    }

    const userData = await userResponse.json();
    console.log('User data:', { email: userData.email });

    // 檢查是否為授權用戶
    if (userData.email !== 'eason0717@gmail.com') {
      console.log('Unauthorized email:', userData.email);
      const baseUrl = request.headers.get('host')?.includes('localhost') 
        ? 'http://localhost:3000' 
        : `https://${request.headers.get('host')}`;
      return NextResponse.redirect(`${baseUrl}/login?error=unauthorized`);
    }

    // 創建簡單的認證token（base64編碼的用戶信息）
    const tokenPayload = {
      email: userData.email,
      name: userData.name,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小時
    };
    
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    // 設置cookie並重定向到管理頁面
    const baseUrl = request.headers.get('host')?.includes('localhost') 
      ? 'http://localhost:3000' 
      : `https://${request.headers.get('host')}`;
    
    const response = NextResponse.redirect(`${baseUrl}/admin`);
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: !request.headers.get('host')?.includes('localhost'),
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24小時
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = request.headers.get('host')?.includes('localhost') 
      ? 'http://localhost:3000' 
      : `https://${request.headers.get('host')}`;
    return NextResponse.redirect(`${baseUrl}/login?error=callback_failed`);
  }
} 