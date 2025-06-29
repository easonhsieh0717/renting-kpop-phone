import { NextResponse } from 'next/server';

export async function GET() {
  const robots = `User-agent: *
Allow: /

# 重要頁面
Allow: /
Allow: /contract-sign
Allow: /?model=*

# 不允許爬取的頁面
Disallow: /admin/
Disallow: /api/
Disallow: /test/
Disallow: /testMode/
Disallow: /orders/*/contract
Disallow: /orders/*/

# Sitemap
Sitemap: https://renting-kpop-phone.vercel.app/sitemap.xml

# 爬取延遲（避免過度負載）
Crawl-delay: 1`;

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
} 