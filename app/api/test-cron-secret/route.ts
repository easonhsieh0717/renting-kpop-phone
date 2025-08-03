import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const lastRefreshTime = process.env.LAST_TOKEN_REFRESH_TIME;
    
    return NextResponse.json({
      success: true,
      cronSecret: cronSecret ? `${cronSecret.substring(0, 10)}...` : 'NOT_SET',
      lastRefreshTime: lastRefreshTime || 'NOT_SET',
      message: '環境變數檢查完成'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: '檢查環境變數時發生錯誤',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 