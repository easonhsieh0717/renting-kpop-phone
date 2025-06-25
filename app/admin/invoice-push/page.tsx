'use client';

import { useState, useEffect } from 'react';

interface Order {
  orderId: string;
  customerName: string;
  phoneModel: string;
  finalAmount: string;
  invoiceStatus: string;
}

interface ProcessResult {
  orderId: string;
  success: boolean;
  result?: any;
  error?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  ordersCount?: number;
  orders?: Order[];
  totalOrders?: number;
  successCount?: number;
  failureCount?: number;
  processedOrders?: ProcessResult[];
}

export default function InvoicePushPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [lastProcessResult, setLastProcessResult] = useState<ProcessResult[]>([]);

  // 載入需要補開發票的訂單列表
  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/webhooks/sheet-update');
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setOrders(data.orders || []);
        setMessage(data.message);
      } else {
        setMessage(`載入失敗: ${data.message}`);
      }
    } catch (error) {
      setMessage(`載入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  // 觸發批次補開發票
  const triggerBatchInvoice = async () => {
    setProcessing(true);
    setLastProcessResult([]);
    try {
      const response = await fetch('/api/webhooks/sheet-update', {
        method: 'POST',
      });
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        setLastProcessResult(data.processedOrders || []);
        // 重新載入訂單列表
        await loadOrders();
      } else {
        setMessage(`批次處理失敗: ${data.message}`);
      }
    } catch (error) {
      setMessage(`批次處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setProcessing(false);
    }
  };

  // 單筆補開發票
  const triggerSingleInvoice = async (orderId: string) => {
    try {
      const response = await fetch('/api/invoice/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(`訂單 ${orderId} 發票開立成功: ${result.invoiceNumber}`);
        await loadOrders(); // 重新載入列表
      } else {
        setMessage(`訂單 ${orderId} 發票開立失敗: ${result.message}`);
      }
    } catch (error) {
      setMessage(`訂單 ${orderId} 發票開立失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">電子發票補開管理</h1>
          
          {/* 控制按鈕區 */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={loadOrders}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '載入中...' : '重新載入'}
            </button>
            
            <button
              onClick={triggerBatchInvoice}
              disabled={processing || orders.length === 0}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {processing ? '處理中...' : `批次補開發票 (${orders.length}筆)`}
            </button>
          </div>

          {/* 狀態訊息 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('失敗') || message.includes('錯誤') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {message}
            </div>
          )}

          {/* 需要補開發票的訂單列表 */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              需要補開發票的訂單 ({orders.length}筆)
            </h2>
            
            {orders.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                沒有需要補開發票的訂單
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        訂單編號
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        客戶姓名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        手機型號
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        金額
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        發票狀態
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.orderId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.phoneModel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          NT$ {order.finalAmount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.invoiceStatus.includes('失敗') 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.invoiceStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => triggerSingleInvoice(order.orderId)}
                            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                          >
                            單筆補開
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 最後一次批次處理結果 */}
          {lastProcessResult.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                最後一次批次處理結果
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        訂單編號
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        處理狀態
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        結果
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lastProcessResult.map((result) => (
                      <tr key={result.orderId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {result.orderId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            result.success 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {result.success ? '成功' : '失敗'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {result.success 
                            ? `發票號碼: ${result.result?.invoiceNumber || '已開立'}` 
                            : result.error || result.result?.message || '未知錯誤'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 使用說明 */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">使用說明：</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 手動偵測已付款但未開發票的訂單</li>
              <li>• 可以單筆或批次觸發發票補開</li>
              <li>• 批次處理會自動間隔1秒避免API限制</li>
              <li>• 發票開立成功後會自動更新Google Sheet</li>
              <li>• 正式憑證需要在Vercel生產環境才能正常使用</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 