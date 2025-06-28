'use client';

import { useState, useEffect } from 'react';

interface PreAuthInfo {
  orderId: string;
  depositTransactionNo: string;
  ecpayTradeNo: string;
  depositAmount: number;
  depositStatus: string;
  captureAmount: number;
}

interface OrderData {
  orderId: string;
  customerName: string;
  phoneModel: string;
  paymentStatus: string;
  preAuthInfo?: PreAuthInfo;
}

export default function PreAuthManagementPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [captureAmount, setCaptureAmount] = useState<number>(0);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // 載入訂單資料 - 確保不使用緩存，每次都從Google Sheets讀取最新資料
  const loadOrders = async () => {
    setLoading(true);
    try {
      // 添加時間戳和no-cache headers確保每次都獲取最新資料
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/admin/preauth-orders?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const result = await response.json();
      
      if (result.success) {
        setOrders(result.data);
        setLastUpdate(new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }));
        console.log(`[PREAUTH_MANAGEMENT] 載入了 ${result.data.length} 筆預授權訂單資料`);
        setMessage(''); // 清除之前的錯誤訊息
      } else {
        setMessage(`載入失敗: ${result.message}`);
      }
    } catch (error) {
      setMessage(`載入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  // 執行預授權請款
  const handleCapture = async (orderId: string, amount: number) => {
    if (!confirm(`確定要對訂單 ${orderId} 執行預授權請款 NT$${amount} 嗎？`)) {
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
        loadOrders(); // 重新載入資料
        setShowCaptureModal(false);
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
  const handleVoidPreAuth = async (orderId: string) => {
    if (!confirm(`確定要取消訂單 ${orderId} 的預授權嗎？此操作不可復原！`)) {
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
        setMessage(`預授權取消成功！`);
        loadOrders(); // 重新載入資料
      } else {
        setMessage(`預授權取消失敗: ${result.message}`);
      }
    } catch (error) {
      setMessage(`預授權取消失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  };

  // 開啟請款對話框
  const openCaptureModal = (order: OrderData) => {
    setSelectedOrder(order.orderId);
    const remainingAmount = (order.preAuthInfo?.depositAmount || 0) - (order.preAuthInfo?.captureAmount || 0);
    setCaptureAmount(remainingAmount);
    setShowCaptureModal(true);
  };

  // 獲取狀態顯示文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'HELD': return '預授權成功';
      case 'PREAUTH': return '預授權成功';
      case 'CAPTURED': return '已請款';
      case 'PARTIAL_CAPTURED': return '部分請款';
      case 'VOID': return '已取消';
      case 'VOID_FAILED': return '取消失敗';
      case 'CAPTURE_FAILED': return '請款失敗';
      default: return status || '狀態未知';
    }
  };

  // 獲取狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HELD': return 'text-blue-600';
      case 'PREAUTH': return 'text-blue-600';
      case 'CAPTURED': return 'text-green-600';
      case 'PARTIAL_CAPTURED': return 'text-yellow-600';
      case 'VOID': return 'text-gray-600';
      case 'VOID_FAILED': return 'text-red-600';
      case 'CAPTURE_FAILED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  useEffect(() => {
    // 頁面載入時立即獲取最新資料
    loadOrders();
    
    // 每30秒自動刷新一次，確保資料保持最新
    const interval = setInterval(() => {
      if (!loading) {
        loadOrders();
      }
    }, 30000);
    
    // 清理定時器
    return () => clearInterval(interval);
  }, [loading]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ECPay 預授權管理</h1>
        <p className="text-gray-600">管理手機租賃保證金的預授權和請款操作</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${message.includes('成功') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="mb-4 flex gap-4 items-center">
        <button
          onClick={loadOrders}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '載入中...' : '重新載入'}
        </button>
        {lastUpdate && (
          <div className="text-sm text-gray-600">
            最後更新：{lastUpdate} <span className="text-green-600">（直接從Google Sheets讀取，無緩存）</span>
          </div>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                預授權金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                已請款金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                剩餘金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                狀態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => {
              const preAuth = order.preAuthInfo;
              const remainingAmount = (preAuth?.depositAmount || 0) - (preAuth?.captureAmount || 0);
              
              return (
                <tr key={order.orderId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.orderId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.phoneModel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    NT${preAuth?.depositAmount?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    NT${preAuth?.captureAmount?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    NT${remainingAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${getStatusColor(preAuth?.depositStatus || '')}`}>
                      {getStatusText(preAuth?.depositStatus || '')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {preAuth?.depositStatus === 'HELD' && remainingAmount > 0 && (
                        <button
                          onClick={() => openCaptureModal(order)}
                          className="text-green-600 hover:text-green-900"
                        >
                          請款
                        </button>
                      )}
                      {preAuth?.depositStatus === 'PARTIAL_CAPTURED' && remainingAmount > 0 && (
                        <button
                          onClick={() => openCaptureModal(order)}
                          className="text-green-600 hover:text-green-900"
                        >
                          繼續請款
                        </button>
                      )}
                      {(preAuth?.depositStatus === 'HELD' || preAuth?.depositStatus === 'PARTIAL_CAPTURED') && (
                        <button
                          onClick={() => handleVoidPreAuth(order.orderId)}
                          className="text-red-600 hover:text-red-900"
                        >
                          取消預授權
                        </button>
                      )}
                      {preAuth?.depositStatus === 'VOID_FAILED' && (
                        <button
                          onClick={() => handleVoidPreAuth(order.orderId)}
                          className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded border border-red-200"
                        >
                          重試取消
                        </button>
                      )}
                      {preAuth?.depositStatus === 'VOID' && (
                        <span className="text-gray-500 text-sm">已取消</span>
                      )}
                      {preAuth?.depositStatus === 'CAPTURED' && (
                        <span className="text-green-500 text-sm">已完成</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {orders.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            沒有找到預授權訂單
          </div>
        )}
      </div>

      {/* 請款對話框 */}
      {showCaptureModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                預授權請款
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                訂單編號: {selectedOrder}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  請款金額 (NT$)
                </label>
                <input
                  type="number"
                  value={captureAmount}
                  onChange={(e) => setCaptureAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleCapture(selectedOrder, captureAmount)}
                  disabled={loading || captureAmount <= 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? '處理中...' : '確認請款'}
                </button>
                <button
                  onClick={() => setShowCaptureModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 