import SearchForm from '../../components/SearchForm'
import { getPhoneModels } from '../../lib/sheets/phones'

export default async function TestPage() {
  const models = await getPhoneModels();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center text-brand-yellow mb-8">元件測試頁面</h1>
      <div className="max-w-4xl mx-auto">
        <SearchForm models={models} searchParams={{}} />
      </div>
    </div>
  )
} 