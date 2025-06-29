export default function Loading() {
  return (
    <div className="min-h-screen bg-brand-gray-dark flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-brand-yellow border-t-transparent mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-brand-yellow mb-2">載入中...</h2>
        <p className="text-brand-gray-light">正在為您準備最新的手機資訊</p>
      </div>
    </div>
  )
} 