import { NextRequest, NextResponse } from 'next/server';

// 添加運行時配置
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    
    // 清除認證cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: !request.headers.get('host')?.includes('localhost'),
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
} 