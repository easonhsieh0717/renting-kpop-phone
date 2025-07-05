import React from 'react';

export default function AINoCodeLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 to-blue-800/20"></div>
        <nav className="relative z-10 container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-white">AI無代碼</div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-white hover:text-purple-300 transition">功能特色</a>
              <a href="#benefits" className="text-white hover:text-purple-300 transition">優勢</a>
              <a href="#contact" className="text-white hover:text-purple-300 transition">聯繫我們</a>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            AI無代碼
            <span className="block text-purple-300">讓創意無限延伸</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
            不需要寫代碼，不需要技術背景，只需要您的想法。
            AI無代碼平台讓每個人都能成為數位創造者。
          </p>
                     <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <a href="mailto:eason0717@gmail.com" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition transform hover:scale-105 text-center">
               📧 立即聯繫
             </a>
             <a href="https://line.me/ti/p/Xi4R5pm6c_" target="_blank" rel="noopener noreferrer" className="border-2 border-white text-white hover:bg-white hover:text-purple-900 px-8 py-4 rounded-lg text-lg font-semibold transition text-center">
               💬 LINE 諮詢
             </a>
           </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white/10 backdrop-blur-sm">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">
            革命性功能
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-2xl font-bold text-white mb-4">AI智能生成</h3>
              <p className="text-gray-300">使用最先進的AI技術，自動生成符合您需求的應用程式和網站。</p>
            </div>
            <div className="text-center p-8 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold text-white mb-4">視覺化設計</h3>
              <p className="text-gray-300">拖拉拽的方式設計界面，所見即所得的編輯體驗。</p>
            </div>
            <div className="text-center p-8 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-white mb-4">快速部署</h3>
              <p className="text-gray-300">一鍵部署到雲端，幾分鐘內讓您的創意上線。</p>
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
                為什麼選擇AI無代碼？
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-600 rounded-full p-2 mt-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">節省90%開發時間</h3>
                    <p className="text-gray-300">傳統開發需要數月，AI無代碼只需數天。</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-600 rounded-full p-2 mt-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">降低80%成本</h3>
                    <p className="text-gray-300">不需要昂貴的開發團隊，一個人就能完成。</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-600 rounded-full p-2 mt-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">零技術門檻</h3>
                    <p className="text-gray-300">不需要學習程式語言，用自然語言描述即可。</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-8 text-white">
                <div className="text-center">
                  <div className="text-6xl font-bold mb-4">10,000+</div>
                  <div className="text-xl">成功案例</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 px-6 bg-gradient-to-r from-purple-800/50 to-blue-800/50">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            準備好開始您的無代碼之旅了嗎？
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            加入數千名創業者的行列，讓AI幫您實現數位化轉型。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:eason0717@gmail.com" className="bg-white text-purple-900 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition transform hover:scale-105 text-center">
              📧 Email 聯繫
            </a>
            <a href="https://line.me/ti/p/Xi4R5pm6c_" target="_blank" rel="noopener noreferrer" className="border-2 border-white text-white hover:bg-white hover:text-purple-900 px-8 py-4 rounded-lg text-lg font-semibold transition text-center">
              💬 LINE 聯繫
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/50 backdrop-blur-sm py-12 px-6">
        <div className="container mx-auto text-center">
          <div className="text-2xl font-bold text-white mb-4">AI無代碼</div>
          <p className="text-gray-400 mb-8">讓每個人都能成為數位創造者</p>
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