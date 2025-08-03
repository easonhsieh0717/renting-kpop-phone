'use client';

import { useState } from 'react';

export default function TestTokenRefreshPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testTokenRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/oauth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: '測試失敗', details: error });
    } finally {
      setLoading(false);
    }
  };

  const testCronRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cron/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer default-secret'
        }
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Cron 測試失敗', details: error });
    } finally {
      setLoading(false);
    }
  };

  const checkTokenStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/oauth/refresh-token');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: '狀態檢查失敗', details: error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Token 刷新測試</h1>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">測試功能</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={checkTokenStatus}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                檢查 Token 狀態
              </button>
              
              <button
                onClick={testTokenRefresh}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {loading ? '測試中...' : '測試 Token 刷新'}
              </button>
              
              <button
                onClick={testCronRefresh}
                disabled={loading}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {loading ? '測試中...' : '測試 Cron 刷新'}
              </button>
            </div>
          </div>

          {result && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">測試結果</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">功能說明</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-gray-700 space-y-2">
                <h3 className="font-semibold">測試功能：</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>檢查 Token 狀態</strong>: 檢查當前 token 是否有效</li>
                  <li><strong>測試 Token 刷新</strong>: 手動執行 token 刷新</li>
                  <li><strong>測試 Cron 刷新</strong>: 測試自動刷新機制</li>
                </ul>
                
                <h3 className="font-semibold mt-4">注意事項：</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>這些測試不會影響現有的手動機制</li>
                  <li>所有測試都會記錄到 Google Sheet</li>
                  <li>測試結果會顯示詳細的 API 回應</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">相關連結</h2>
            <div className="space-y-2">
              <a 
                href="/admin/token-management" 
                className="block text-blue-600 hover:text-blue-800 underline"
              >
                Token 管理頁面
              </a>
              <a 
                href="/oauth-setup" 
                className="block text-blue-600 hover:text-blue-800 underline"
              >
                OAuth 設定頁面
              </a>
              <a 
                href="/admin" 
                className="block text-blue-600 hover:text-blue-800 underline"
              >
                管理後台
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 