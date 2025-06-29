"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Order {
  orderId: string;
  phoneModel: string;
  startDate: string;
  endDate: string;
  customerName: string;
  customerPhone: string;
  paymentStatus: string;
  documentStatus: string;
  createdAt: string;
}

export default function ContractSignPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [showOrderSelection, setShowOrderSelection] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("請輸入手機號碼");
      return;
    }
    
    setLoading(true);
    setError("");
    setOrders([]);
    setShowOrderSelection(false);
    
    try {
      const response = await fetch(`/api/orders/search?phone=${encodeURIComponent(phone)}`);
      const data = await response.json();
      
      // 處理單筆訂單（保持原有相容性）
      if (data.order) {
        router.push(`/orders/${data.order[0]}/contract`);
        return;
      }
      
      // 處理多筆訂單
      if (data.orders && data.orders.length > 0) {
        setOrders(data.orders);
        setShowOrderSelection(true);
      } else {
        setError("查無此手機號碼的訂單，請確認後再試");
      }
    } catch (err) {
      setError("查詢失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = (orderId: string) => {
    router.push(`/orders/${orderId}/contract`);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'text-green-600 bg-green-50';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getDocumentStatusColor = (status: string) => {
    if (status === '已簽署') {
      return 'text-green-600 bg-green-50';
    }
    return 'text-red-600 bg-red-50';
  };

  if (showOrderSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">選擇要簽署的訂單</h1>
            <p className="text-gray-600">找到 {orders.length} 筆訂單，請選擇要簽署合約的訂單</p>
            <button
              onClick={() => {
                setShowOrderSelection(false);
                setOrders([]);
                setPhone("");
              }}
              className="mt-4 text-blue-600 hover:text-blue-800 underline"
            >
              重新搜尋
            </button>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <div
                key={order.orderId}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer border border-gray-200"
                onClick={() => handleOrderSelect(order.orderId)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-800 truncate">
                    {order.orderId}
                  </h3>
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus === 'PAID' ? '已付款' : '待付款'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDocumentStatusColor(order.documentStatus)}`}>
                      {order.documentStatus || '待簽署'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">日期：</span>
                    <span>{formatDate(order.startDate)} - {formatDate(order.endDate)}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">手機：</span>
                    <span className="truncate">{order.customerPhone}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">型號：</span>
                    <span className="truncate font-mono text-xs">{order.phoneModel}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">序號：</span>
                    <span className="truncate font-mono text-xs">{order.phoneModel}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    選擇此訂單簽署
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">手機租賃合約簽署</h1>
          <p className="text-gray-600">請輸入手機號碼開始簽署合約</p>
        </div>
        
        <div className="mb-8 text-center">
          <div className="inline-block p-4 bg-gray-100 rounded-lg">
            <div className="w-48 h-48 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📱</div>
                <p className="text-sm text-gray-500">QR Code</p>
                <p className="text-xs text-gray-400">掃描或輸入手機號碼</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              手機號碼
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="請輸入您的手機號碼"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "查詢中..." : "開始簽署合約"}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            如有問題請聯繫客服人員
          </p>
        </div>
      </div>
    </div>
  );
} 