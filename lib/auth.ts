import { NextRequest } from 'next/server';

// 允許的管理員信箱
const ADMIN_EMAIL = 'eason0717@gmail.com';

// 簡單的JWT token驗證（在生產環境建議使用更完整的JWT庫）
export function createToken(email: string): string {
  const payload = {
    email,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24小時過期
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function verifyToken(token: string): { email: string; valid: boolean } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    const isExpired = Date.now() > payload.exp;
    const isValidEmail = payload.email === ADMIN_EMAIL;
    
    return {
      email: payload.email,
      valid: !isExpired && isValidEmail
    };
  } catch {
    return { email: '', valid: false };
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  // 從cookie中獲取token
  const token = req.cookies.get('admin_token')?.value;
  return token || null;
}

export function isAuthorized(req: NextRequest): boolean {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  
  const { valid } = verifyToken(token);
  return valid;
}

// Google OAuth配置
export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  redirectUri: process.env.NODE_ENV === 'production' 
    ? 'https://renting-kpop-phone.vercel.app/api/auth/callback'
    : 'http://localhost:3000/api/auth/callback',
  scope: 'openid email profile',
};

export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId!,
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    scope: GOOGLE_OAUTH_CONFIG.scope,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
} 