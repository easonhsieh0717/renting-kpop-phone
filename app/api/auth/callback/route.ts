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
    console.log('Request headers:', {
      host: request.headers.get('host'),
      'user-agent': request.headers.get('user-agent'),
      origin: request.headers.get('origin')
    });

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
      console.error('Missing Google OAuth credentials:', {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
      });
      const baseUrl = request.headers.get('host')?.includes('localhost') 
        ? 'http://localhost:3000' 
        : `https://${request.headers.get('host')}`;
      return NextResponse.redirect(`${baseUrl}/login?error=config_error`);
    }

    // 構建重定向URI
    const redirectUri = request.headers.get('host')?.includes('localhost') 
      ? 'http://localhost:3000/api/auth/callback'
      : `https://${request.headers.get('host')}/api/auth/callback`;
    
    console.log('Using redirect URI:', redirectUri);

    // 交換授權碼獲取access token
    const tokenRequestBody = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    console.log('Token request body:', {
      client_id: process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...',
      redirect_uri: redirectUri,
      code: code.substring(0, 10) + '...'
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody,
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData
      });
      const baseUrl = request.headers.get('host')?.includes('localhost') 
        ? 'http://localhost:3000' 
        : `https://${request.headers.get('host')}`;
      return NextResponse.redirect(`${baseUrl}/login?error=token_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token data received:', {
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type
    });
    
    // 獲取用戶信息
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    console.log('User info response status:', userResponse.status);

    if (!userResponse.ok) {
      console.error('Failed to fetch user info:', {
        status: userResponse.status,
        statusText: userResponse.statusText
      });
      const baseUrl = request.headers.get('host')?.includes('localhost') 
        ? 'http://localhost:3000' 
        : `https://${request.headers.get('host')}`;
      return NextResponse.redirect(`${baseUrl}/login?error=callback_failed`);
    }

    const userData = await userResponse.json();
    console.log('User data:', { 
      email: userData.email,
      name: userData.name,
      verified_email: userData.verified_email
    });

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
    console.log('Created auth token for:', userData.email);

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

    console.log('Redirecting to admin with auth cookie set');
    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = request.headers.get('host')?.includes('localhost') 
      ? 'http://localhost:3000' 
      : `https://${request.headers.get('host')}`;
    return NextResponse.redirect(`${baseUrl}/login?error=callback_failed`);
  }
} 