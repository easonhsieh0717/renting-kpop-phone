import PhoneCard from '../components/PhoneCard'
import SearchForm from '../components/SearchForm'
import { getPhoneModels } from '../lib/sheets/phones'
import { getAvailablePhones } from '../lib/search'
import { MapPin, Phone, Train } from 'lucide-react'

interface HomePageProps {
  searchParams: {
    from?: string;
    to?: string;
    model?: string;
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { from, to, model } = searchParams;
  
  const [phones, models] = await Promise.all([
    getAvailablePhones(searchParams),
    getPhoneModels()
  ]);

  const isSearching = from || to || model;

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      {/* Header */}
      <header className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-black text-brand-yellow uppercase tracking-widest">
          追星神器
        </h1>
        <p className="text-lg md:text-xl text-brand-gray-light mt-4 font-light">
          演唱會、見面會專用手機租借
        </p>
      </header>

      {/* Search Form */}
      <div className="mb-16 max-w-5xl mx-auto">
        <SearchForm models={models} searchParams={searchParams} />
      </div>

      {/* Search Results Title */}
      {isSearching && (
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white">搜尋結果</h2>
          <p className="text-brand-gray-light mt-2">
            {from && to 
              ? `為您找到 ${phones.length} 支在 ${from} 至 ${to} 期間可用的手機`
              : `為您找到 ${phones.length} 支符合條件的手機`
            }
          </p>
        </div>
      )}

      {/* Phone Grid */}
      {phones.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {phones.map((phone) => (
            <PhoneCard key={phone.id} phone={phone} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-brand-yellow">找不到可用的手機</h3>
          <p className="text-brand-gray-light text-lg mt-4">
            {isSearching ? "請試著調整您的日期或型號，或清除搜尋條件以查看所有手機。" : "目前沒有可供租借的手機，請稍後再來查看。"}
          </p>
        </div>
      )}

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
             <h3 className="text-2xl font-bold text-brand-yellow mb-4">關於本站</h3>
             <p>本站為 G-Dragon Peaceminusone 風格啟發的粉絲專案，僅供展示與測試用途。所有手機租借服務、維修與標價均為虛構情境，實際服務請洽詢 i時代維修中心。</p>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-brand-gray-dark/50 text-brand-gray-light text-sm">
          <p>&copy; {new Date().getFullYear()} i時代維修中心. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  )
} 