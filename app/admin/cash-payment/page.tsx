'use client';

import { useState, useEffect } from 'react';

interface PendingOrder {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  phoneModel: string;
  startDate: string;
  endDate: string;
  originalAmount: number;
  finalAmount: number;
  paymentStatus: string;
  documentStatus: string;
  invoiceStatus: string;
  rowIndex: number;
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
  orders?: PendingOrder[];
  totalCount?: number;
}

export default function CashPaymentPage() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [lastProcessResult, setLastProcessResult] = useState<ProcessResult[]>([]);

  // 載入pending訂單列表
  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/cash-payment');
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

  // 處理單筆現金支付
  const processCashPayment = async (orderId: string) => {
    const confirmMessage = `確認要將訂單 ${orderId} 標記為現金支付完成嗎？\n\n此操作將：\n1. 更新付款狀態為 PAID\n2. 自動開立電子發票\n3. 發送付款成功通知郵件`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setProcessing(orderId);
    try {
      const response = await fetch('/api/admin/cash-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(`訂單 ${orderId} 現金支付處理成功！`);
        setLastProcessResult([{
          orderId,
          success: true,
          result: result
        }]);
        await loadOrders(); // 重新載入列表
      } else {
        setMessage(`訂單 ${orderId} 現金支付處理失敗: ${result.message}`);
        setLastProcessResult([{
          orderId,
          success: false,
          error: result.message
        }]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      setMessage(`訂單 ${orderId} 現金支付處理失敗: ${errorMessage}`);
      setLastProcessResult([{
        orderId,
        success: false,
        error: errorMessage
      }]);
    } finally {
      setProcessing(null);
    }
  };

  // 批次處理所有pending訂單
  const processAllCashPayments = async () => {
    if (orders.length === 0) {
      setMessage('沒有待處理的訂單');
      return;
    }

    const confirmMessage = `確認要將所有 ${orders.length} 筆待付款訂單標記為現金支付完成嗎？\n\n此操作將：\n1. 更新所有訂單付款狀態為 PAID\n2. 自動開立電子發票\n3. 發送付款成功通知郵件`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setProcessing('all');
    const results: ProcessResult[] = [];

    for (const order of orders) {
      try {
        const response = await fetch('/api/admin/cash-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId: order.orderId }),
        });
        
        const result = await response.json();
        
        results.push({
          orderId: order.orderId,
          success: result.success,
          result: result.success ? result : undefined,
          error: result.success ? undefined : result.message
        });

        // 等待1秒避免API限制
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({
          orderId: order.orderId,
          success: false,
          error: error instanceof Error ? error.message : '未知錯誤'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    setMessage(`批次處理完成！成功：${successCount} 筆，失敗：${failureCount} 筆`);
    setLastProcessResult(results);
    setProcessing(null);
    
    // 重新載入訂單列表
    await loadOrders();
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">手動現金支付管理</h1>
              <p className="text-sm text-gray-500">處理客戶現場現金付款</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* 操作按鈕區域 */}
          <div className="mb-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={loadOrders}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      載入中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      重新載入
                    </>
                  )}
                </button>

                {orders.length > 0 && (
                  <button
                    onClick={processAllCashPayments}
                    disabled={processing === 'all'}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                  >
                    {processing === 'all' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        處理中...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        批次處理 ({orders.length} 筆)
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* 狀態訊息 */}
              {message && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-blue-800">{message}</p>
                </div>
              )}
            </div>
          </div>

          {/* 訂單列表 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                待付款訂單列表 ({orders.length} 筆)
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">載入中...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">沒有待付款訂單</h3>
                  <p className="mt-1 text-sm text-gray-500">所有訂單都已完成付款</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          訂單資訊
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          客戶資訊
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          租賃資訊
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          金額
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.orderId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.orderId}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.phoneModel}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.customerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customerPhone}
                            </div>
                            {order.customerEmail && (
                              <div className="text-sm text-gray-500">
                                {order.customerEmail}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.startDate}
                            </div>
                            <div className="text-sm text-gray-500">
                              至 {order.endDate}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              NT$ {order.finalAmount.toLocaleString()}
                            </div>
                            {order.originalAmount !== order.finalAmount && (
                              <div className="text-sm text-gray-500">
                                原價: NT$ {order.originalAmount.toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => processCashPayment(order.orderId)}
                              disabled={processing === order.orderId}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                            >
                              {processing === order.orderId ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  處理中
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                  現金支付
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 處理結果 */}
          {lastProcessResult.length > 0 && (
            <div className="mt-6 bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  處理結果
                </h3>
                <div className="space-y-2">
                  {lastProcessResult.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md ${
                        result.success
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center">
                        {result.success ? (
                          <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className={`text-sm font-medium ${
                          result.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          訂單 {result.orderId}: {result.success ? '成功' : '失敗'}
                        </span>
                      </div>
                      {result.error && (
                        <p className="mt-1 text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 