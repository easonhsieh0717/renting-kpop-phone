import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 只保護 /admin 路徑
  if (request.nextUrl.pathname.startsWith('/admin')) {
    try {
      const token = request.cookies.get('auth-token')?.value;
      
      if (!token) {
        console.log('No auth token found, redirecting to login');
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // 驗證JWT token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      
      if (!decoded || decoded.email !== 'eason0717@gmail.com') {
        console.log('Invalid token or unauthorized email, redirecting to login');
        return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
      }

      // Token有效，允許訪問
      return NextResponse.next();
    } catch (error) {
      console.error('Middleware auth error:', error);
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
}; 