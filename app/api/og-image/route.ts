import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 生成 SVG 格式的 Open Graph 圖片
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#000000;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#1a1a1a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="text" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#ec4899;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- 背景 -->
        <rect width="100%" height="100%" fill="url(#bg)"/>
        
        <!-- 主標題 -->
        <text x="600" y="200" font-family="Arial, sans-serif" font-size="80" font-weight="bold" text-anchor="middle" fill="url(#text)">
          好星機好心情
        </text>
        
        <!-- 副標題 -->
        <text x="600" y="280" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="#fbbf24">
          演唱會追星手機租借
        </text>
        
        <!-- 描述 -->
        <text x="600" y="350" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#d1d5db">
          Samsung S25U/S24U/S23U 等旗艦手機
        </text>
        <text x="600" y="390" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#d1d5db">
          板橋門市現場取機 | 押金彈性選擇
        </text>
        
        <!-- 底部資訊 -->
        <text x="600" y="500" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#9ca3af">
          i時代維修中心 | 捷運江子翠站6號出口
        </text>
        
        <!-- 裝飾元素 -->
        <circle cx="150" cy="150" r="8" fill="#fbbf24" opacity="0.8"/>
        <circle cx="1050" cy="200" r="6" fill="#ec4899" opacity="0.8"/>
        <circle cx="200" cy="480" r="10" fill="#8b5cf6" opacity="0.8"/>
        <circle cx="1000" cy="450" r="7" fill="#fbbf24" opacity="0.8"/>
      </svg>
    `;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('OG Image generation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 