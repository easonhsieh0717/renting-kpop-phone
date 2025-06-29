import type { Metadata } from 'next'
import { Inter, Noto_Sans_TC } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import FloatingButtons from '@/components/FloatingButtons'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-sans-tc',
})

export const metadata: Metadata = {
  title: '好星機好心情｜手機租借｜演唱會追星神器｜Samsung iPhone 短期租借｜板橋',
  description: '好星機好心情！專業手機租借服務，提供Samsung S25U/S24U/S23U、iPhone等旗艦手機。演唱會追星、出國旅遊、商務短期租借首選。板橋門市現場取機，押金彈性選擇。',
  keywords: [
    '手機租借', '手機出租', '演唱會手機', '追星神器', '好星機', '好心情',
    'Samsung S25 Ultra', 'Samsung S24 Ultra', 'Samsung S23 Ultra', 'iPhone租借',
    '短期租借', '出國手機', '旅遊手機', '商務手機', '板橋手機租借',
    '新北手機出租', '台北手機租借', '演唱會拍照', '高畫質手機',
    '手機租賃', '3C租借', '旗艦手機', '最新手機', 'i時代維修中心'
  ].join(', '),
  authors: [{ name: 'i時代維修中心' }],
  creator: 'i時代維修中心',
  publisher: 'i時代維修中心',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://renting-kpop-phone.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '好星機好心情｜演唱會追星手機租借｜Samsung iPhone 短期租借',
    description: '好星機好心情！專業手機租借服務，Samsung S25U/S24U/S23U、iPhone等旗艦手機。演唱會追星、出國旅遊首選，板橋門市現場取機。',
    url: 'https://renting-kpop-phone.vercel.app',
    siteName: '好星機好心情 - 手機租借平台',
    locale: 'zh_TW',
    type: 'website',
    images: [
      {
        url: '/images/S25U.png',
        width: 1200,
        height: 630,
        alt: '好星機好心情 - Samsung S25 Ultra 手機租借',
      },
      {
        url: '/images/DEMO.jpg',
        width: 1200,
        height: 630,
        alt: '演唱會追星手機租借服務',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '好星機好心情｜演唱會追星手機租借｜Samsung iPhone',
    description: '專業手機租借服務，Samsung S25U/S24U/S23U、iPhone等旗艦手機。演唱會追星、出國旅遊首選！',
    images: ['/images/S25U.png'],
    creator: '@itimes_repair',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // 需要實際申請
  },
  category: '3C租借服務',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" className={`${inter.variable} ${notoSansTC.variable}`}>
      <body className="bg-brand-gray-dark text-brand-gray-light">
        {children}
        <Analytics />
        <SpeedInsights />
        <FloatingButtons />
      </body>
    </html>
  )
} 