import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from './lib/auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // 保護所有 /admin 路由（除了登入相關）
  if (pathname.startsWith('/admin') && !pathname.startsWith('/api/auth')) {
    
    // 檢查是否已認證
    if (!isAuthorized(req)) {
      // 未認證，重定向到登入頁面
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // 保護管理API路由
  if (pathname.startsWith('/api/') && (
    pathname.includes('/admin') || 
    pathname.includes('/invoice') ||
    pathname.includes('/webhooks')
  ) && !pathname.startsWith('/api/auth')) {
    
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/invoice/:path*',
    '/api/webhooks/:path*',
    '/api/test-orders/:path*'
  ]
}; 