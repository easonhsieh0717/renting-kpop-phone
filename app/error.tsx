'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-brand-gray-dark flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">😵</div>
        <h2 className="text-3xl font-bold text-brand-yellow mb-4">糟糕！出了點問題</h2>
        <p className="text-brand-gray-light mb-6">
          我們遇到了一些技術問題，請稍後再試，或聯繫我們的客服團隊。
        </p>
        <div className="space-y-4">
          <button
            onClick={reset}
            className="w-full bg-brand-yellow text-brand-black font-bold py-3 px-6 rounded-lg transition-all duration-300 hover:bg-yellow-300"
          >
            重新載入
          </button>
          <a
            href="tel:0282527208"
            className="block w-full bg-transparent border-2 border-brand-yellow text-brand-yellow font-bold py-3 px-6 rounded-lg transition-all duration-300 hover:bg-brand-yellow hover:text-brand-black"
          >
            聯繫客服：02-8252-7208
          </a>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="text-brand-gray-light cursor-pointer hover:text-brand-yellow">
              開發者資訊
            </summary>
            <pre className="mt-2 text-xs text-red-400 bg-black p-2 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
} 