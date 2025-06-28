'use client';

import { useState } from 'react';

export default function TestPreAuthPage() {
  const [orderId, setOrderId] = useState('');
  const [depositAmount, setDepositAmount] = useState(30000);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [preAuthInfo, setPreAuthInfo] = useState<any>(null);

  // 創建測試預授權
  const createTestPreAuth = async () => {
    if (!orderId) {
      setMessage('請輸入訂單編號');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: depositAmount
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('預授權訂單創建成功！正在跳轉到ECPay...');
        
        // 創建ECPay表單並自動提交
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = result.ecpayUrl;
        form.target = '_blank'; // 在新視窗開啟

        // 添加所有ECPay參數
        Object.entries(result.paymentParams).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        // 顯示參數信息
        setPreAuthInfo({
          preAuthOrderId: result.preAuthOrderId,
          depositAmount: result.depositAmount,
          isPreAuth: result.isPreAuth,
          paymentParams: result.paymentParams
        });
      } else {
        setMessage(`創建預授權失敗: ${result.message}`);
      }
    } catch (error) {
      setMessage(`創建預授權失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  // 檢查預授權狀態
  const checkPreAuthStatus = async () => {
    if (!orderId) {
      setMessage('請輸入訂單編號');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/capture`);
      const result = await response.json();
      
      if (result.success) {
        setMessage(`預授權狀態: ${JSON.stringify(result.data, null, 2)}`);
        setPreAuthInfo(result.data);
      } else {
        setMessage(`查詢失敗: ${result.message}`);
      }
    } catch (error) {
      setMessage(`查詢失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  // 執行預授權請款
  const capturePreAuth = async (amount: number) => {
    if (!orderId) {
      setMessage('請輸入訂單編號');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          captureAmount: amount,
          confirm: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(`預授權請款成功！已請款 NT$${amount}`);
        setPreAuthInfo(result.data);
      } else {
        setMessage(`預授權請款失敗: ${result.message}`);
      }
    } catch (error) {
      setMessage(`預授權請款失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  // 取消預授權
  const voidPreAuth = async () => {
    if (!orderId) {
      setMessage('請輸入訂單編號');
      return;
    }

    if (!confirm('確定要取消預授權嗎？此操作不可復原！')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/void-preauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirm: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('預授權取消成功！');
        setPreAuthInfo(result.data);
      } else {
        setMessage(`預授權取消失敗: ${result.message}`);
      }
    } catch (error) {
      setMessage(`預授權取消失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ECPay HoldTradeAMT 預授權測試</h1>
        <p className="text-gray-600">測試ECPay的延遲撥款（預授權）功能</p>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">測試參數</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              訂單編號
            </label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="輸入已付款的訂單編號"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              預授權金額 (NT$)
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={createTestPreAuth}
            disabled={loading || !orderId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '處理中...' : '創建預授權'}
          </button>
          
          <button
            onClick={checkPreAuthStatus}
            disabled={loading || !orderId}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            查詢狀態
          </button>
          
          <button
            onClick={() => capturePreAuth(10000)}
            disabled={loading || !orderId}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            請款 NT$10,000
          </button>
          
          <button
            onClick={() => capturePreAuth(depositAmount)}
            disabled={loading || !orderId}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            全額請款
          </button>
          
          <button
            onClick={voidPreAuth}
            disabled={loading || !orderId}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            取消預授權
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md ${message.includes('成功') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <pre className="whitespace-pre-wrap">{message}</pre>
        </div>
      )}

      {preAuthInfo && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">預授權資訊</h3>
          <pre className="bg-white p-4 rounded border text-sm overflow-auto">
            {JSON.stringify(preAuthInfo, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">功能說明</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li><strong>創建預授權：</strong>使用HoldTradeAMT參數創建預授權，不會立即扣款</li>
          <li><strong>查詢狀態：</strong>檢查預授權的當前狀態和可請款金額</li>
          <li><strong>部分請款：</strong>對預授權進行部分金額的請款（實際扣款）</li>
          <li><strong>全額請款：</strong>對預授權進行全額請款</li>
          <li><strong>取消預授權：</strong>取消未請款的預授權，釋放客戶信用額度</li>
        </ul>
      </div>
    </div>
  );
} 