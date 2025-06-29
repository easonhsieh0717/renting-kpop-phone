import PhoneCard from '../components/PhoneCard'
import SearchForm from '../components/SearchForm'
import { getPhoneModels } from '../lib/sheets/phones'
import { getPhonesWithAvailability } from '../lib/search'
import { MapPin, Phone, Train } from 'lucide-react'
import Image from 'next/image'
import { Metadata } from 'next'

interface HomePageProps {
  searchParams: {
    from?: string;
    to?: string;
    model?: string;
  }
}

// 生成動態 metadata
export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const { model } = searchParams;
  
  if (model) {
    return {
      title: `${model} 手機租借｜好星機好心情｜演唱會追星專用｜板橋門市`,
      description: `${model} 手機租借服務，好星機好心情提供最新${model}短期租借。演唱會追星、出國旅遊首選，板橋門市現場取機，押金彈性選擇。`,
      openGraph: {
        title: `${model} 手機租借｜好星機好心情｜演唱會追星專用`,
        description: `${model} 手機租借服務，演唱會追星、出國旅遊首選！`,
      },
    };
  }
  
  return {};
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { from, to, model } = searchParams;
  const models = await getPhoneModels();
  const phones = await getPhonesWithAvailability({ from, to, model });

  // 結構化資料
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://renting-kpop-phone.vercel.app/#organization",
        "name": "i時代維修中心",
        "alternateName": "好星機好心情",
        "url": "https://renting-kpop-phone.vercel.app",
        "logo": {
          "@type": "ImageObject",
          "url": "https://renting-kpop-phone.vercel.app/images/S25U.png"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+886-2-8252-7208",
          "contactType": "customer service",
          "areaServed": "TW",
          "availableLanguage": "zh-TW"
        },
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "文化路二段385之3號",
          "addressLocality": "板橋區",
          "addressRegion": "新北市",
          "postalCode": "220",
          "addressCountry": "TW"
        },
        "sameAs": [
          "https://maps.app.goo.gl/umQrCN8UPruTJNaH9"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://renting-kpop-phone.vercel.app/#website",
        "url": "https://renting-kpop-phone.vercel.app",
        "name": "好星機好心情 - 手機租借平台",
        "description": "專業手機租借服務，Samsung、iPhone等旗艦手機短期租借",
        "publisher": {
          "@id": "https://renting-kpop-phone.vercel.app/#organization"
        },
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://renting-kpop-phone.vercel.app/?model={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        ]
      },
      {
        "@type": "Service",
        "name": "手機租借服務",
        "description": "提供Samsung S25U/S24U/S23U、iPhone等旗艦手機短期租借服務",
        "provider": {
          "@id": "https://renting-kpop-phone.vercel.app/#organization"
        },
        "areaServed": {
          "@type": "Place",
          "name": "台灣"
        },
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "手機租借方案",
          "itemListElement": phones.map((phone, index) => ({
            "@type": "Offer",
            "itemOffered": {
              "@type": "Product",
              "name": phone.name,
              "description": `${phone.name} 手機租借服務`,
              "image": phone.imageUrl
            },
            "price": phone.daily_rate_1_2,
            "priceCurrency": "TWD",
            "availability": "https://schema.org/InStock"
          }))
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "手機租借需要什麼條件？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "需要攜帶身分證或護照正本進行身份驗證，並選擇押金方案（現金3000元需抵押證件、信用卡凍結30000元、現金30000元）。"
            }
          },
          {
            "@type": "Question", 
            "name": "租借期間如何計算？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "採用階梯式計價，租越久越便宜。滿三天租借會贈送一天緩衝日，讓您更彈性安排歸還時間。"
            }
          },
          {
            "@type": "Question",
            "name": "可以租借哪些手機型號？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "提供Samsung S25 Ultra、S24 Ultra、S23 Ultra等最新旗艦手機，適合演唱會拍攝、出國旅遊等需求。"
            }
          }
        ]
      }
    ]
  };

  return (
    <>
      {/* 結構化資料 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      {/* 額外的 Open Graph meta 標籤 */}
      <head>
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:secure_url" content="https://renting-kpop-phone.vercel.app/images/DEMO.jpg" />
        <meta name="twitter:image" content="https://renting-kpop-phone.vercel.app/images/DEMO.jpg" />
        <meta name="twitter:image:alt" content="好星機好心情 - 演唱會追星手機租借服務" />
        
        {/* LINE 特殊支援 */}
        <meta property="line:title" content="好星機好心情｜演唱會追星手機租借" />
        <meta property="line:description" content="Samsung S25U/S24U/S23U等旗艦手機租借，演唱會追星首選！板橋門市現場取機。" />
        <meta property="line:image" content="https://renting-kpop-phone.vercel.app/images/DEMO.jpg" />
      </head>
      
      <main className="container mx-auto px-4 py-8">
        {/* 超級顯眼的標語區塊 */}
        <div className="text-center mb-16 py-12 relative overflow-hidden">
          {/* 背景光暈效果 */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-yellow-400/20 blur-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-yellow/10 to-transparent"></div>
          
          {/* 主標語 */}
          <div className="relative z-10">
            <div className="text-8xl md:text-9xl lg:text-[12rem] font-black leading-none">
              <div className="handwriting-brush bg-gradient-to-r from-yellow-300 via-pink-500 to-purple-600 bg-clip-text text-transparent drop-shadow-2xl animate-pulse transform rotate-1">
                好星機
              </div>
              <div className="handwriting-playful bg-gradient-to-r from-purple-600 via-pink-500 to-yellow-300 bg-clip-text text-transparent drop-shadow-2xl animate-pulse delay-150 transform -rotate-1">
                好心情
              </div>
            </div>
            
            {/* 副標語 */}
            <div className="mt-6 text-2xl md:text-4xl lg:text-5xl font-bold">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent drop-shadow-lg">
              </span>
            </div>
            
            {/* 閃爍特效 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full">
              <div className="absolute top-0 left-0 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute top-1/4 right-0 w-3 h-3 bg-pink-500 rounded-full animate-ping opacity-75 delay-300"></div>
              <div className="absolute bottom-0 left-1/4 w-5 h-5 bg-purple-500 rounded-full animate-ping opacity-75 delay-700"></div>
              <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-yellow-300 rounded-full animate-ping opacity-75 delay-1000"></div>
            </div>
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="handwriting-title text-5xl font-bold text-brand-yellow drop-shadow-lg transform rotate-1">
            追星神器
          </h1>
          <h2 className="text-xl text-brand-gray-light mt-2">
            演唱會、見面會專用手機租借
          </h2>
          <p className="text-lg text-brand-gray-light mt-4 max-w-2xl mx-auto">
            好星機好心情提供最新Samsung S25 Ultra、S24 Ultra、S23 Ultra等旗艦手機租借服務。
            專為演唱會追星、出國旅遊、商務需求設計，板橋門市現場取機，押金方案彈性選擇。
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12 mb-16">
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="/images/DEMO.jpg"
              alt="演唱會手機租借 - 好星機好心情追星神器拍攝現場"
              width={1200}
              height={1600}
              className="object-cover w-full h-full"
              priority
            />
          </div>
          
          {/* 影片區塊 */}
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <video
              className="w-full h-auto object-cover"
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
              poster="/images/DEMO.jpg"
              aria-label="手機租借服務介紹影片 - Samsung旗艦手機演唱會拍攝效果展示"
            >
              <source src="/images/video.MP4" type="video/mp4" />
              您的瀏覽器不支援影片播放。
            </video>
          </div>
          
          {/* SEO 內容區塊 */}
          <section className="bg-brand-gray-dark/30 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-brand-gray-dark">
            <h2 className="handwriting-title text-3xl font-bold text-center mb-6 text-brand-yellow transform -rotate-1">
              為什麼選擇好星機好心情？
            </h2>
            <div className="grid md:grid-cols-3 gap-6 text-brand-gray-light">
              <div className="text-center">
                <h3 className="text-xl font-bold text-brand-yellow mb-3">🎵 演唱會專用</h3>
                <p>Samsung S25U/S24U/S23U超強夜拍功能，演唱會現場完美捕捉每個精彩瞬間，追星必備神器！</p>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-brand-yellow mb-3">💰 押金彈性</h3>
                <p>三種押金方案任選：現金3000元、信用卡凍結30000元、現金30000元，滿足不同需求。</p>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-brand-yellow mb-3">🚇 交通便利</h3>
                <p>板橋門市位於捷運江子翠站6號出口，交通便利，現場取機歸還超方便！</p>
              </div>
            </div>
          </section>
          
          <div className="bg-brand-gray-dark/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-brand-gray-dark">
            <h2 className="handwriting-playful text-3xl font-bold text-center mb-6 text-brand-yellow transform rotate-1">
              尋找你的追星神器
            </h2>
            <SearchForm models={models} searchParams={searchParams} />
          </div>
        </div>

        <section>
          <h2 className="handwriting-title text-2xl font-bold mb-6 text-brand-yellow text-center transform -rotate-1">
            {model ? `${model} 手機租借 - 搜尋結果` : '熱門手機租借方案'}
          </h2>
          
          {model && (
            <p className="text-center text-brand-gray-light mb-8">
              為您精選的 {model} 手機租借方案，適合演唱會拍攝、出國旅遊等各種需求
            </p>
          )}

          {phones && phones.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {phones.map((phone) => (
                <PhoneCard key={phone.id} phone={phone} />
              ))}
            </div>
          ) : (
            <div className="text-center text-brand-gray-light py-20">
              <h3 className="text-3xl font-bold">查無結果</h3>
              <p className="mt-2">很抱歉，目前沒有符合條件「{model}」的手機。</p>
            </div>
          )}
        </section>

        {/* Footer Info */}
        <footer className="text-center mt-20 pt-10 border-t border-brand-gray-dark">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="text-2xl font-bold text-brand-yellow mb-4">i時代維修中心 - 板橋門市</h3>
              <ul className="space-y-3 text-brand-gray-light">
                <li className="flex items-start">
                  <MapPin className="w-5 h-5 mr-3 mt-1 text-brand-yellow flex-shrink-0" />
                  <a href="https://maps.app.goo.gl/umQrCN8UPruTJNaH9" target="_blank" rel="noopener noreferrer" className="hover:text-brand-yellow transition-colors">
                    220新北市板橋區文化路二段385之3號
                  </a>
                </li>
                <li className="flex items-center">
                  <Train className="w-5 h-5 mr-3 text-brand-yellow flex-shrink-0" />
                  <span>捷運江子翠站 6號出口</span>
                </li>
                <li className="flex items-center">
                  <Phone className="w-5 h-5 mr-3 text-brand-yellow flex-shrink-0" />
                  <a href="tel:0282527208" className="hover:text-brand-yellow transition-colors">02-8252-7208</a>
                </li>
              </ul>
            </div>
            <div className="text-brand-gray-light text-sm">
               <h3 className="text-2xl font-bold text-brand-yellow mb-4">關於 i時代</h3>
               <p>i時代維修中心提供專業、可靠的手機租借與維修服務。本站所有資訊僅供參考，最新優惠與服務詳情請以門市現場公告為準。</p>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-brand-gray-dark/50 text-brand-gray-light text-sm">
            <p>&copy; {new Date().getFullYear()} i時代維修中心. All Rights Reserved.</p>
          </div>
        </footer>
      </main>
    </>
  )
} 