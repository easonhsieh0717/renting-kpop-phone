import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_OAUTH_CONFIG, createToken } from '../../../../lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.redirect('/admin?error=no_code');
    }

    // 使用授權碼交換access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_OAUTH_CONFIG.clientId!,
        client_secret: GOOGLE_OAUTH_CONFIG.clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return NextResponse.redirect('/admin?error=token_failed');
    }

    // 使用access token獲取用戶信息
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    
    // 檢查是否為允許的管理員信箱
    if (userData.email !== 'eason0717@gmail.com') {
      return NextResponse.redirect('/admin?error=unauthorized');
    }

    // 創建認證token
    const token = createToken(userData.email);
    
    // 設置cookie並重定向到管理頁面
    const response = NextResponse.redirect('/admin');
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24小時
    });
    
    return response;

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect('/admin?error=callback_failed');
  }
} 