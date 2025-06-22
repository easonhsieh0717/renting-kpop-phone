import PhoneCard from '@/components/PhoneCard'
import SearchForm from '@/components/SearchForm'
import { getPhoneModels } from '@/lib/sheets/phones'
import { getAvailablePhones } from '@/lib/search'

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
        <SearchForm models={models} />
      </div>

      {/* Search Results Title */}
      {isSearching && (
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white">搜尋結果</h2>
          <p className="text-brand-gray-light mt-2">
            為您找到 {phones.length} 支在 <span className="text-brand-yellow">{from}</span> 至 <span className="text-brand-yellow">{to || from}</span> 期間可用的手機
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
        <p className="text-brand-gray-light">
          G-Dragon Peaceminusone Inspired Fan-made Project
        </p>
      </footer>
    </div>
  )
} 