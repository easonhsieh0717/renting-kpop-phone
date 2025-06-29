import { NextResponse } from 'next/server';
import { getPhoneModels } from '../../../lib/sheets/phones';

export async function GET() {
  try {
    const baseUrl = 'https://renting-kpop-phone.vercel.app';
    const models = await getPhoneModels();
    
    const staticPages = [
      '',
      '/contract-sign',
      '/login',
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map(
      (page) => `
  <url>
    <loc>${baseUrl}${page}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>`
    )
    .join('')}
  ${models
    .map(
      (model) => `
  <url>
    <loc>${baseUrl}/?model=${encodeURIComponent(model)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
    )
    .join('')}
</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 