import PhoneCard from '../components/PhoneCard'
import SearchForm from '../components/SearchForm'
import { getPhoneModels } from '../lib/sheets/phones'
import { getPhonesWithAvailability } from '../lib/search'
import { MapPin, Phone, Train } from 'lucide-react'
import Image from 'next/image'

interface HomePageProps {
  searchParams: {
    from?: string;
    to?: string;
    model?: string;
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { from, to, model } = searchParams;
  const models = await getPhoneModels();
  const phones = await getPhonesWithAvailability({ from, to, model });

  return (
    <main className="container mx-auto px-4 py-8">
      {/* 超級顯眼的標語區塊 */}
      <div className="text-center mb-16 py-12 relative overflow-hidden">
        {/* 背景光暈效果 */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-yellow-400/20 blur-3xl"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-yellow/10 to-transparent"></div>
        
        {/* 主標語 */}
        <div className="relative z-10">
          <div className="text-8xl md:text-9xl lg:text-[12rem] font-black leading-none">
            <div className="bg-gradient-to-r from-yellow-300 via-pink-500 to-purple-600 bg-clip-text text-transparent drop-shadow-2xl animate-pulse">
              好星機
            </div>
            <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-yellow-300 bg-clip-text text-transparent drop-shadow-2xl animate-pulse delay-150">
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
        <h1 className="text-5xl font-bold text-brand-yellow drop-shadow-lg">
          追星神器
        </h1>
        <p className="text-xl text-brand-gray-light mt-2">
          演唱會、見面會專用手機租借
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-12 mb-16">
        <div className="rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src="/images/DEMO.jpg"
            alt="Concert scene with phone"
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
          >
            <source src="/images/video.MP4" type="video/mp4" />
            您的瀏覽器不支援影片播放。
          </video>
        </div>
        <div className="bg-brand-gray-dark/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-brand-gray-dark">
          <h2 className="text-3xl font-bold text-center mb-6 text-brand-yellow">
            尋找你的追星神器
          </h2>
          <SearchForm models={models} searchParams={searchParams} />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6 text-brand-yellow text-center">
          {model ? `${model} - 搜尋結果` : '所有可租借手機'}
        </h2>

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
      </div>

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
  )
} 