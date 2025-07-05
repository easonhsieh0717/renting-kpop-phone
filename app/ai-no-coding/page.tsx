import React from 'react';

export default function AINoCodeLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20"></div>
        <nav className="relative z-10 container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-white">AI無代碼</div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-white hover:text-emerald-200 transition">功能特色</a>
              <a href="#benefits" className="text-white hover:text-emerald-200 transition">優勢</a>
              <a href="#contact" className="text-white hover:text-emerald-200 transition">聯繫我們</a>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            AI無代碼
            <span className="block text-emerald-100">快速接單，低成本創業</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto">
            3天內完成專業網站，零前期投資，<span className="font-bold text-emerald-100">只收成交金額的百分比</span>。
            讓AI幫您快速接單，專注賺錢！
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:eason0717@gmail.com" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition transform hover:scale-105 text-center">
              📧 立即聯繫
            </a>
            <a href="https://line.me/ti/p/Xi4R5pm6c_" target="_blank" rel="noopener noreferrer" className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 px-8 py-4 rounded-lg text-lg font-semibold transition text-center">
              💬 LINE 諮詢
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white/10 backdrop-blur-sm">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">
            快速接單三步驟
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-2xl font-bold text-white mb-4">零前期投資</h3>
              <p className="text-white/90">無需任何前期費用，只在您成功接單後收取成交金額的百分比。</p>
            </div>
            <div className="text-center p-8 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-white mb-4">3天快速交付</h3>
              <p className="text-white/90">AI智能生成，3天內完成專業網站，快速展示給客戶。</p>
            </div>
            <div className="text-center p-8 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-4">持續賺錢</h3>
              <p className="text-white/90">客戶滿意後續約，您持續獲得收益分成。</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
                為什麼選擇我們的模式？
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-emerald-600 rounded-full p-2 mt-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">零風險創業</h3>
                    <p className="text-white/90">無需投資，只有成功接單才收費，完全無風險。</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-emerald-600 rounded-full p-2 mt-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">超快交付</h3>
                    <p className="text-white/90">3天完成，比傳統開發快20倍，快速打動客戶。</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-emerald-600 rounded-full p-2 mt-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">持續收益</h3>
                    <p className="text-white/90">客戶滿意續約，您獲得長期穩定收益分成。</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg p-8 text-white">
                <div className="text-center">
                  <div className="text-6xl font-bold mb-4">100%</div>
                  <div className="text-xl">成功案例</div>
                  <div className="text-sm mt-2 opacity-90">已完成案例皆成功接單</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Case Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-emerald-600/30 to-teal-600/30">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">
            🎯 成功案例展示
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-white mb-4">好星機好心情 - 演唱會手機租借平台</h3>
                <p className="text-xl text-white/90">3天完成，零代碼開發，成功接單並持續獲利</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-white">✨ 實現功能</h4>
                  <ul className="space-y-2 text-white/90">
                    <li>• 手機租借預約系統</li>
                    <li>• 智能價格計算器</li>
                    <li>• 線上支付整合</li>
                    <li>• 訂單管理系統</li>
                    <li>• 客戶合約簽署</li>
                    <li>• 庫存管理系統</li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-white">📊 成果數據</h4>
                  <ul className="space-y-2 text-white/90">
                    <li>• <span className="text-emerald-200 font-bold">3天</span> 完成開發</li>
                    <li>• <span className="text-emerald-200 font-bold">零代碼</span> 純AI生成</li>
                    <li>• <span className="text-emerald-200 font-bold">100%</span> 功能完整</li>
                    <li>• <span className="text-emerald-200 font-bold">響應式</span> 設計</li>
                    <li>• <span className="text-emerald-200 font-bold">SEO優化</span> 完整</li>
                    <li>• <span className="text-emerald-200 font-bold">成功接單</span> 並持續獲利</li>
                  </ul>
                </div>
              </div>
              
              <div className="text-center">
                <a href="https://renting-kpop-phone.vercel.app/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition transform hover:scale-105">
                  🚀 查看實際案例
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-teal-600/50 to-emerald-600/50">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            💰 收費模式
          </h2>
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-6xl font-bold text-white mb-4">0元</div>
              <div className="text-2xl text-white mb-6">前期投資</div>
              <div className="text-xl text-white/90 mb-8">
                只在您成功接單後，收取<span className="font-bold text-emerald-200">成交金額的百分比</span>
              </div>
              <div className="space-y-4 text-white/90">
                <div>✅ 零前期費用</div>
                <div>✅ 3天快速交付</div>
                <div>✅ 成功才收費</div>
                <div>✅ 持續技術支援</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 px-6 bg-gradient-to-r from-emerald-700/50 to-teal-700/50">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            準備好開始賺錢了嗎？
          </h2>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
            零風險創業，3天快速交付，成功接單才收費。
            讓AI幫您快速接單賺錢！
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:eason0717@gmail.com" className="bg-white text-emerald-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition transform hover:scale-105 text-center">
              📧 Email 聯繫
            </a>
            <a href="https://line.me/ti/p/Xi4R5pm6c_" target="_blank" rel="noopener noreferrer" className="border-2 border-white text-white hover:bg-white hover:text-emerald-600 px-8 py-4 rounded-lg text-lg font-semibold transition text-center">
              💬 LINE 聯繫
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/50 backdrop-blur-sm py-12 px-6">
        <div className="container mx-auto text-center">
          <div className="text-2xl font-bold text-white mb-4">AI無代碼</div>
          <p className="text-gray-400 mb-8">快速接單，零風險創業</p>
          <div className="flex justify-center space-x-6">
            <a href="mailto:eason0717@gmail.com" className="text-gray-400 hover:text-white transition">📧 Email</a>
            <a href="https://line.me/ti/p/Xi4R5pm6c_" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">💬 LINE</a>
            <a href="#" className="text-gray-400 hover:text-white transition">隱私政策</a>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-gray-400">
            © 2025 AI無代碼. 保留所有權利。
          </div>
        </div>
      </footer>
    </div>
  );
} 