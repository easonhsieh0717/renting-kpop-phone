"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ContractSignPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("請輸入手機號碼");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`/api/orders/search?phone=${encodeURIComponent(phone)}`);
      const data = await response.json();
      
      if (data.order) {
        router.push(`/orders/${data.order[0]}/contract`);
      } else {
        setError("查無此手機號碼的訂單，請確認後再試");
      }
    } catch (err) {
      setError("查詢失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

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