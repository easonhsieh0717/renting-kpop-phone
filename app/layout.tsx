import type { Metadata } from 'next'
import { Inter, Noto_Sans_TC } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import ContactButton from '@/components/ContactButton'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-sans-tc',
})

export const metadata: Metadata = {
  title: '手機出租平台｜演唱會、出國旅遊、短期租借',
  description: '專業的手機出租服務，提供最新款 Samsung S24 Ultra 等旗艦手機，滿足您演唱會、出國旅遊、商務等短期租借需求。',
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
        <ContactButton />
      </body>
    </html>
  )
} 