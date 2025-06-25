'use client';

import { useState } from 'react';

export default function TestInvoicePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const generateTestOrders = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/test-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`✅ ${result.message}\n\n生成的測試訂單：\n${result.orders?.map((order: any) => 
          `• ${order.id} - ${order.customer} (${order.phone}) - NT$${order.amount} - 載具: ${order.carrier}`
        ).join('\n') || ''}`);
      } else {
        setMessage(`❌ ${result.message || '生成失敗'}\n${result.note || ''}`);
      }
    } catch (error) {
      setMessage('❌ 網路錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">電子發票測試工具</h1>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">步驟1：準備測試資料</h2>
          <p className="text-gray-600 mb-4">
            首先需要在Google Sheet中增加發票相關欄位，然後生成測試訂單來測試補開發票功能。
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            <h3 className="font-medium text-blue-800 mb-2">📋 請先手動在Google Sheet增加以下欄位：</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li><strong>O欄</strong>：手機載具號碼</li>
              <li><strong>P欄</strong>：發票號碼</li>
              <li><strong>Q欄</strong>：發票狀態</li>
              <li><strong>R欄</strong>：發票開立時間</li>
            </ul>
          </div>

          <button
            onClick={generateTestOrders}
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md font-medium ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? '生成中...' : '生成3筆測試訂單'}
          </button>

          {message && (
            <div className="mt-4 p-4 bg-gray-50 rounded border">
              <pre className="text-sm whitespace-pre-wrap">{message}</pre>
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">步驟2：測試補開發票</h2>
          <p className="text-gray-600 mb-4">
            生成測試訂單後，前往管理界面測試補開發票功能：
          </p>
          
          <div className="space-y-3">
            <a
              href="/admin"
              className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              🎯 前往管理界面
            </a>
            
            <div className="text-sm text-gray-500">
              <p>在管理界面中，您將看到生成的測試訂單，可以點擊「補開發票」按鈕來測試功能。</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-medium text-yellow-800 mb-2">⚠️ 注意事項</h3>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• 測試訂單會使用測試環境的綠界API</li>
            <li>• 請確保已設定 ECPAY_INVOICE_HASH_KEY 和 ECPAY_INVOICE_HASH_IV 環境變數</li>
            <li>• 生成的發票為測試發票，不會產生實際費用</li>
            <li>• 測試完成後可手動刪除測試訂單 (TEST001, TEST002, TEST003)</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 