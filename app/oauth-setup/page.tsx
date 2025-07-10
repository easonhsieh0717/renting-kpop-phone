'use client';

import { useState, useEffect } from 'react';

export default function OAuthSetup() {
  const [authUrl, setAuthUrl] = useState<string>('');
  const [authCode, setAuthCode] = useState<string>('');
  const [refreshToken, setRefreshToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // 從 URL 獲取授權碼
  const getCodeFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setAuthCode(code);
      // 清理 URL
      window.history.replaceState({}, document.title, '/oauth-setup');
    }
  };

  // 頁面加載時檢查 URL 中的授權碼
  useEffect(() => {
    getCodeFromUrl();
  }, []);

  const handleGetAuthUrl = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/oauth/setup?action=get_auth_url');
      const data = await response.json();
      
      if (response.ok) {
        setAuthUrl(data.authUrl);
        setDebugInfo(data.debug);
      } else {
        setError(`錯誤 ${response.status}: ${data.error}`);
        if (data.details) {
          setError(prev => `${prev}\n詳細信息: ${JSON.stringify(data.details, null, 2)}`);
        }
      }
    } catch (err) {
      setError(`網絡錯誤: ${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeCode = async () => {
    if (!authCode.trim()) {
      setError('請先輸入授權碼');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/oauth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode.trim() })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setRefreshToken(data.refresh_token);
        setError('');
      } else {
        setError(`錯誤 ${response.status}: ${data.error}`);
        if (data.details) {
          setError(prev => `${prev}\n詳細信息: ${data.details}`);
        }
      }
    } catch (err) {
      setError(`網絡錯誤: ${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            Google OAuth 設置
          </h1>
          
          {/* 步驟 1: 獲取授權 URL */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">步驟 1: 獲取授權 URL</h2>
            <button
              onClick={handleGetAuthUrl}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? '處理中...' : '開始 OAuth 設置'}
            </button>
          </div>
          
          {/* 調試信息 */}
          {debugInfo && (
            <div className="mb-8 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">調試信息:</h3>
              <pre className="text-sm text-gray-700">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
          
          {/* 授權 URL */}
          {authUrl && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">步驟 2: 訪問 Google 授權頁面</h2>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-700 mb-2">
                  點擊下方連結進行 Google 授權，完成後您將被重定向回此頁面：
                </p>
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {authUrl}
                </a>
              </div>
              <a
                href={authUrl}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 inline-block"
              >
                前往 Google 授權頁面
              </a>
            </div>
          )}
          
          {/* 授權碼輸入 */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">步驟 3: 輸入授權碼</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="授權碼會自動填入，如果沒有請手動輸入"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleExchangeCode}
                disabled={loading || !authCode.trim()}
                className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 disabled:bg-gray-400"
              >
                {loading ? '處理中...' : '獲取 Token'}
              </button>
            </div>
          </div>
          
          {/* 結果顯示 */}
          {refreshToken && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">✅ 成功！</h2>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-700 mb-2">
                  Refresh Token (請保存到環境變數):
                </p>
                <div className="bg-white p-3 rounded border font-mono text-sm">
                  <strong>GOOGLE_OAUTH_REFRESH_TOKEN=</strong>{refreshToken}
                </div>
                <p className="text-green-700 mt-2 text-sm">
                  請將此 token 添加到您的 .env.local 文件和 Vercel 環境變數中。
                </p>
              </div>
            </div>
          )}
          
          {/* 錯誤顯示 */}
          {error && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-red-600">❌ 錯誤</h2>
              <div className="bg-red-50 p-4 rounded-lg">
                <pre className="text-red-700 whitespace-pre-wrap text-sm">
                  {error}
                </pre>
                
                {error.includes('403') && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                    <h3 className="font-semibold text-yellow-800">403 錯誤解決方案:</h3>
                    <ul className="text-yellow-700 text-sm mt-2 space-y-1">
                      <li>• 確保 Google Drive API 已啟用</li>
                      <li>• 配置 OAuth 同意畫面</li>
                      <li>• 將 eason0717@gmail.com 添加為測試用戶</li>
                      <li>• 檢查應用程序域名配置</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 說明 */}
          <div className="text-sm text-gray-600">
            <h3 className="font-semibold mb-2">說明:</h3>
            <ul className="space-y-1">
              <li>• 此工具用於獲取 Google Drive OAuth refresh token</li>
              <li>• 完成後請將 refresh token 保存到環境變數</li>
              <li>• 如遇到問題，請檢查 Google Cloud Console 設置</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 