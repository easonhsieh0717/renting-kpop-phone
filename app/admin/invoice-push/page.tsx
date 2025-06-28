'use client';

import { useState, useEffect } from 'react';

interface Order {
  orderId: string;
  customerName: string;
  phoneModel: string;
  finalAmount: string;
  invoiceStatus: string;
}

interface DepositOrder {
  orderId: string;
  customerName: string;
  phoneModel: string;
  customerPhone: string;
  depositTransactionNo: string;
  depositAmount: number;
  depositStatus: string;
  refundedAmount: number;
  refundTime: string;
  damageAmount: number;
  maxRefundAmount: number;
  canRefund: boolean;
  startDate: string;
  endDate: string;
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

interface DepositApiResponse {
  success: boolean;
  message: string;
  ordersCount?: number;
  totalDeposits?: number;
  orders?: DepositOrder[];
  summary?: {
    pending: number;
    partial: number;
    completed: number;
    totalAmount: number;
  };
}

export default function InvoicePushPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [depositOrders, setDepositOrders] = useState<DepositOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [depositMessage, setDepositMessage] = useState('');
  const [lastProcessResult, setLastProcessResult] = useState<ProcessResult[]>([]);
  const [activeTab, setActiveTab] = useState<'invoice' | 'deposit'>('invoice');

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

  // 載入保證金訂單列表
  const loadDepositOrders = async () => {
    setDepositLoading(true);
    try {
      const response = await fetch('/api/orders/deposit-status?status=pending');
      const data: DepositApiResponse = await response.json();
      
      if (data.success) {
        setDepositOrders(data.orders || []);
        setDepositMessage(data.message);
      } else {
        setDepositMessage(`載入失敗: ${data.message}`);
      }
    } catch (error) {
      setDepositMessage(`載入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setDepositLoading(false);
    }
  };

  // 處理保證金退刷
  const processRefund = async (orderId: string, refundAmount: number, damageAmount: number = 0) => {
    const confirmMessage = `確認要為訂單 ${orderId} 退刷保證金 NT$${refundAmount}？${damageAmount > 0 ? `\n損壞費用：NT$${damageAmount}` : ''}`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refundAmount,
          damageAmount,
          confirm: true,
          reason: '租賃結束保證金退刷'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setDepositMessage(`訂單 ${orderId} 保證金退刷成功: NT$${result.refundAmount}`);
        await loadDepositOrders(); // 重新載入列表
      } else {
        setDepositMessage(`訂單 ${orderId} 保證金退刷失敗: ${result.message}`);
      }
    } catch (error) {
      setDepositMessage(`訂單 ${orderId} 保證金退刷失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  // 快速退刷（全額）
  const quickRefund = async (order: DepositOrder) => {
    await processRefund(order.orderId, order.maxRefundAmount, 0);
  };

  // 自定義退刷（可輸入損壞費用）
  const customRefund = async (order: DepositOrder) => {
    const damageAmountStr = window.prompt(
      `訂單 ${order.orderId} 保證金退刷\n` +
      `保證金總額：NT$${order.depositAmount}\n` +
      `已退金額：NT$${order.refundedAmount}\n` +
      `可退金額：NT$${order.maxRefundAmount}\n\n` +
      `請輸入損壞費用（0 表示無損壞）：`,
      '0'
    );

    if (damageAmountStr === null) return; // 用戶取消

    const damageAmount = parseInt(damageAmountStr) || 0;
    if (damageAmount < 0) {
      alert('損壞費用不能為負數');
      return;
    }

    if (damageAmount > order.maxRefundAmount) {
      alert(`損壞費用不能超過可退金額 NT$${order.maxRefundAmount}`);
      return;
    }

    const refundAmount = order.maxRefundAmount - damageAmount;
    if (refundAmount <= 0) {
      alert('退刷金額必須大於0');
      return;
    }

    await processRefund(order.orderId, refundAmount, damageAmount);
  };

  // 創建保證金收款
  const createDepositPayment = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
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

        setDepositMessage(`訂單 ${orderId} 保證金收款頁面已開啟，請在新視窗完成付款`);
      } else {
        setDepositMessage(`建立保證金收款失敗: ${result.message}`);
      }
    } catch (error) {
      setDepositMessage(`建立保證金收款失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  useEffect(() => {
    loadOrders();
    loadDepositOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">財務管理系統</h1>
          
          {/* Tab 切換 */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('invoice')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'invoice'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                電子發票管理 ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('deposit')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'deposit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                保證金退刷管理 ({depositOrders.length})
              </button>
            </nav>
          </div>

          {/* 發票管理頁面 */}
          {activeTab === 'invoice' && (
            <>
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
            <h3 className="text-sm font-medium text-blue-900 mb-2">發票管理說明：</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 手動偵測已付款但未開發票的訂單</li>
              <li>• 可以單筆或批次觸發發票補開</li>
              <li>• 批次處理會自動間隔1秒避免API限制</li>
              <li>• 發票開立成功後會自動更新Google Sheet</li>
              <li>• 正式憑證需要在Vercel生產環境才能正常使用</li>
            </ul>
          </div>
            </>
          )}

          {/* 保證金管理頁面 */}
          {activeTab === 'deposit' && (
            <>
              {/* 控制按鈕區 */}
              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  onClick={loadDepositOrders}
                  disabled={depositLoading}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                >
                  {depositLoading ? '載入中...' : '重新載入'}
                </button>
                
                {/* 手動收取保證金 */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="輸入訂單編號"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const orderId = (e.target as HTMLInputElement).value.trim();
                        if (orderId) {
                          createDepositPayment(orderId);
                        }
                      }
                    }}
                  />
                  <span className="text-sm text-gray-500">按Enter創建保證金收款</span>
                </div>
              </div>

              {/* 狀態訊息 */}
              {depositMessage && (
                <div className={`mb-6 p-4 rounded-lg ${
                  depositMessage.includes('失敗') || depositMessage.includes('錯誤') 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {depositMessage}
                </div>
              )}

              {/* 保證金訂單列表 */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  待退刷保證金訂單 ({depositOrders.length}筆)
                </h2>
                
                {depositOrders.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    沒有待退刷的保證金訂單
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
                            租期
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            保證金狀態
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            可退金額
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {depositOrders.map((order) => (
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
                              {order.startDate} ~ {order.endDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                order.depositStatus === 'HELD' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : order.depositStatus === 'PARTIAL_REFUND'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {order.depositStatus === 'HELD' ? '已收取' : 
                                 order.depositStatus === 'PARTIAL_REFUND' ? '部分退刷' : '已退刷'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>
                                <div className="font-medium">NT$ {order.maxRefundAmount}</div>
                                <div className="text-xs text-gray-400">
                                  總額: NT$ {order.depositAmount}
                                  {order.refundedAmount > 0 && ` | 已退: NT$ ${order.refundedAmount}`}
                                  {order.damageAmount > 0 && ` | 損壞: NT$ ${order.damageAmount}`}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => quickRefund(order)}
                                  disabled={!order.canRefund}
                                  className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                                >
                                  全額退刷
                                </button>
                                <button
                                  onClick={() => customRefund(order)}
                                  disabled={!order.canRefund}
                                  className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-50"
                                >
                                  自定義退刷
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 使用說明 */}
              <div className="mt-8 space-y-4">
                {/* 收取保證金流程 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">📱 收取保證金流程（領取時）：</h3>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>客戶到店領取手機，確認訂單已付租金</li>
                    <li>在上方輸入框輸入<strong>訂單編號</strong>，按Enter鍵</li>
                    <li>系統自動開啟ECPay付款頁面（新視窗）</li>
                    <li>客戶在付款頁面刷卡支付<strong>NT$30,000保證金</strong></li>
                    <li>付款完成後，系統自動更新Google Sheet記錄</li>
                    <li>交付手機給客戶</li>
                  </ol>
                </div>

                {/* 退刷保證金流程 */}
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-900 mb-2">💳 退刷保證金流程（歸還時）：</h3>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• <strong>全額退刷</strong>：無損壞情況，直接退還全部保證金</li>
                    <li>• <strong>自定義退刷</strong>：有損壞時，輸入損壞費用，系統自動計算退刷金額</li>
                    <li>• 所有操作都有二次確認機制，避免誤操作</li>
                    <li>• 退刷成功後自動更新Google Sheet記錄</li>
                    <li>• 支援部分退刷，可分多次處理</li>
                  </ul>
                </div>

                {/* 重要提醒 */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="text-sm font-medium text-yellow-900 mb-2">⚠️ 重要提醒：</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• 這是<strong>「類預授權」</strong>功能，實際是先收款後退刷</li>
                    <li>• 保證金收取後，客戶信用卡會立即扣款NT$30,000</li>
                    <li>• 退刷操作會實際退款到客戶信用卡</li>
                    <li>• 請確保在客戶同意的情況下進行操作</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 