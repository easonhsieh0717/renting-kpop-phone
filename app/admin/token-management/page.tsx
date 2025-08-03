'use client';

import { useState, useEffect } from 'react';

interface TokenStatus {
  hasToken: boolean;
  lastRefreshTime?: string;
  currentTime?: string;
  message: string;
}

interface RefreshResult {
  success: boolean;
  message: string;
  newRefreshToken?: string;
  expiresIn?: number;
  timestamp?: string;
  error?: string;
  details?: string;
}

export default function TokenManagementPage() {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [refreshResult, setRefreshResult] = useState<RefreshResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  // 檢查 token 狀態
  const checkTokenStatus = async () => {
    try {
      const response = await fetch('/api/oauth/refresh-token');
      const data = await response.json();
      setTokenStatus(data);
    } catch (error) {
      console.error('檢查 token 狀態失敗:', error);
    }
  };

  // 手動刷新 token
  const manualRefreshToken = async () => {
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
      setRefreshResult(data);
      
      if (data.success) {
        // 刷新成功後重新檢查狀態
        setTimeout(checkTokenStatus, 1000);
      }
    } catch (error) {
      console.error('手動刷新 token 失敗:', error);
      setRefreshResult({
        success: false,
        message: '手動刷新失敗',
        error: 'Network error'
      });
    } finally {
      setLoading(false);
    }
  };

  // 測試自動刷新 cron
  const testAutoRefresh = async () => {
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
      setRefreshResult(data);
    } catch (error) {
      console.error('測試自動刷新失敗:', error);
      setRefreshResult({
        success: false,
        message: '測試自動刷新失敗',
        error: 'Network error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTokenStatus();
  }, []);

  const formatTime = (timeString?: string) => {
    if (!timeString) return '未設定';
    return new Date(timeString).toLocaleString('zh-TW');
  };

  const getTimeDifference = (timeString?: string) => {
    if (!timeString) return '未知';
    const diff = Date.now() - new Date(timeString).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}天 ${hours}小時`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Token 管理系統</h1>
          
          {/* Token 狀態 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Token 狀態</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              {tokenStatus ? (
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="font-medium">Token 狀態:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${
                      tokenStatus.hasToken ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tokenStatus.hasToken ? '已設定' : '未設定'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">最後刷新時間:</span>
                    <span className="ml-2 text-gray-600">{formatTime(tokenStatus.lastRefreshTime)}</span>
                  </div>
                  {tokenStatus.lastRefreshTime && (
                    <div>
                      <span className="font-medium">距離上次刷新:</span>
                      <span className="ml-2 text-gray-600">{getTimeDifference(tokenStatus.lastRefreshTime)}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">當前時間:</span>
                    <span className="ml-2 text-gray-600">{formatTime(tokenStatus.currentTime)}</span>
                  </div>
                  <div>
                    <span className="font-medium">訊息:</span>
                    <span className="ml-2 text-gray-600">{tokenStatus.message}</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">載入中...</div>
              )}
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">操作</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={checkTokenStatus}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                檢查 Token 狀態
              </button>
              
              <button
                onClick={manualRefreshToken}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {loading ? '刷新中...' : '手動刷新 Token'}
              </button>
              
              <button
                onClick={testAutoRefresh}
                disabled={loading}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {loading ? '測試中...' : '測試自動刷新'}
              </button>
            </div>
          </div>

          {/* 自動刷新設定 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">自動刷新設定</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="autoRefresh" className="font-medium">
                  啟用五天自動刷新
                </label>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• 系統會每五天自動刷新一次 OAuth token</p>
                <p>• 刷新記錄會自動寫入 Google Sheet</p>
                <p>• 需要手動更新 Vercel 環境變數中的新 token</p>
                <p>• 建議設定 CRON_SECRET 環境變數以確保安全</p>
              </div>
            </div>
          </div>

          {/* 刷新結果 */}
          {refreshResult && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">刷新結果</h2>
              <div className={`rounded-lg p-4 ${
                refreshResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">狀態:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${
                      refreshResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {refreshResult.success ? '成功' : '失敗'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">訊息:</span>
                    <span className="ml-2 text-gray-600">{refreshResult.message}</span>
                  </div>
                  {refreshResult.newRefreshToken && (
                    <div>
                      <span className="font-medium">新 Refresh Token:</span>
                      <span className="ml-2 text-gray-600 font-mono text-sm">
                        {refreshResult.newRefreshToken.substring(0, 50)}...
                      </span>
                    </div>
                  )}
                  {refreshResult.expiresIn && (
                    <div>
                      <span className="font-medium">過期時間:</span>
                      <span className="ml-2 text-gray-600">{refreshResult.expiresIn} 秒</span>
                    </div>
                  )}
                  {refreshResult.timestamp && (
                    <div>
                      <span className="font-medium">刷新時間:</span>
                      <span className="ml-2 text-gray-600">{formatTime(refreshResult.timestamp)}</span>
                    </div>
                  )}
                  {refreshResult.error && (
                    <div>
                      <span className="font-medium">錯誤:</span>
                      <span className="ml-2 text-red-600">{refreshResult.error}</span>
                    </div>
                  )}
                  {refreshResult.details && (
                    <div>
                      <span className="font-medium">詳細資訊:</span>
                      <span className="ml-2 text-gray-600">{refreshResult.details}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 使用說明 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">使用說明</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-gray-700 space-y-2">
                <h3 className="font-semibold">手動操作（不變）:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>前往 <code className="bg-gray-100 px-1 rounded">/oauth-setup</code> 頁面進行手動授權</li>
                  <li>使用 <code className="bg-gray-100 px-1 rounded">/api/oauth/check-token</code> 檢查 token 狀態</li>
                  <li>所有現有的手動機制保持不變</li>
                </ul>
                
                <h3 className="font-semibold mt-4">自動刷新功能（新增）:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>每五天自動刷新一次 OAuth token</li>
                  <li>刷新記錄自動寫入 Google Sheet 的 <code className="bg-gray-100 px-1 rounded">token_refresh_log</code> 工作表</li>
                  <li>需要手動更新 Vercel 環境變數中的新 token</li>
                  <li>可通過 <code className="bg-gray-100 px-1 rounded">/api/cron/refresh-token</code> 手動觸發</li>
                </ul>
                
                <h3 className="font-semibold mt-4">環境變數設定:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><code className="bg-gray-100 px-1 rounded">CRON_SECRET</code>: 定時任務安全金鑰（建議設定）</li>
                  <li><code className="bg-gray-100 px-1 rounded">LAST_TOKEN_REFRESH_TIME</code>: 最後刷新時間（自動更新）</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 