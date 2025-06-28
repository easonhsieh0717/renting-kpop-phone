"use client";
import { useState } from "react";

interface TimeAnalysis {
  rowNumber: number;
  orderId: string;
  customerName: string;
  createdAt: string;
  invoiceTime: string;
  refundTime: string;
  needsUpdate: boolean;
}

interface CheckResult {
  success: boolean;
  message: string;
  totalRows: number;
  sampleData: TimeAnalysis[];
  needsUpdateCount: number;
}

interface FixResult {
  success: boolean;
  message: string;
  details?: {
    processedCount: number;
    updatedCount: number;
    updatesApplied: number;
  };
}

export default function FixTimePage() {
  const [adminKey, setAdminKey] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);

  const handleCheck = async () => {
    if (!adminKey) {
      alert("請輸入管理員密鑰");
      return;
    }

    setIsChecking(true);
    setCheckResult(null);

    try {
      const response = await fetch(`/api/admin/fix-time-format?adminKey=${encodeURIComponent(adminKey)}`);
      const result = await response.json();
      setCheckResult(result);
    } catch (error) {
      console.error("檢查失敗:", error);
      setCheckResult({
        success: false,
        message: "檢查失敗，請檢查網路連線",
        totalRows: 0,
        sampleData: [],
        needsUpdateCount: 0
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleFix = async () => {
    if (!adminKey) {
      alert("請輸入管理員密鑰");
      return;
    }

    if (!confirm("確定要執行批次時間格式修正嗎？此操作將修改Google Sheet中的資料！")) {
      return;
    }

    setIsFixing(true);
    setFixResult(null);

    try {
      const response = await fetch("/api/admin/fix-time-format", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminKey }),
      });

      const result = await response.json();
      setFixResult(result);
      
      // 修正完成後重新檢查
      if (result.success) {
        setTimeout(() => {
          handleCheck();
        }, 1000);
      }
    } catch (error) {
      console.error("修正失敗:", error);
      setFixResult({
        success: false,
        message: "修正失敗，請檢查網路連線",
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            📅 時間格式修正工具
          </h1>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ 重要提醒</h2>
            <ul className="text-yellow-700 space-y-1">
              <li>• 此工具將修正Google Sheet中的時間格式從UTC轉換為台灣時間</li>
              <li>• 會處理：建立時間、發票開立時間、退刷時間等欄位</li>
              <li>• 請先檢查資料狀態，確認無誤後再執行修正</li>
              <li>• 此操作會直接修改線上資料，請謹慎操作</li>
            </ul>
          </div>

          {/* 管理員密鑰輸入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              管理員密鑰
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="請輸入管理員密鑰"
            />
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleCheck}
              disabled={isChecking || !adminKey}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isChecking ? "檢查中..." : "🔍 檢查資料狀態"}
            </button>
            
            <button
              onClick={handleFix}
              disabled={isFixing || !adminKey || !checkResult?.success}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isFixing ? "修正中..." : "🔧 執行批次修正"}
            </button>
          </div>

          {/* 檢查結果 */}
          {checkResult && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">檢查結果</h2>
              <div className={`p-4 rounded-lg ${checkResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={checkResult.success ? 'text-green-800' : 'text-red-800'}>
                  {checkResult.message}
                </p>
                
                {checkResult.success && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>總計資料行數: {checkResult.totalRows}</p>
                    <p>需要更新的行數: {checkResult.needsUpdateCount}</p>
                  </div>
                )}
              </div>

              {/* 樣本資料表格 */}
              {checkResult.success && checkResult.sampleData.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2">資料樣本 (前20行)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 border text-left">行號</th>
                          <th className="px-4 py-2 border text-left">訂單號</th>
                          <th className="px-4 py-2 border text-left">客戶姓名</th>
                          <th className="px-4 py-2 border text-left">建立時間</th>
                          <th className="px-4 py-2 border text-left">發票時間</th>
                          <th className="px-4 py-2 border text-left">退刷時間</th>
                          <th className="px-4 py-2 border text-left">需要更新</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checkResult.sampleData.map((item, index) => (
                          <tr key={index} className={item.needsUpdate ? 'bg-yellow-50' : ''}>
                            <td className="px-4 py-2 border">{item.rowNumber}</td>
                            <td className="px-4 py-2 border font-mono text-sm">{item.orderId}</td>
                            <td className="px-4 py-2 border">{item.customerName}</td>
                            <td className="px-4 py-2 border text-xs">{item.createdAt}</td>
                            <td className="px-4 py-2 border text-xs">{item.invoiceTime}</td>
                            <td className="px-4 py-2 border text-xs">{item.refundTime}</td>
                            <td className="px-4 py-2 border">
                              {item.needsUpdate ? (
                                <span className="text-orange-600 font-medium">是</span>
                              ) : (
                                <span className="text-green-600">否</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 修正結果 */}
          {fixResult && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">修正結果</h2>
              <div className={`p-4 rounded-lg ${fixResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={fixResult.success ? 'text-green-800' : 'text-red-800'}>
                  {fixResult.message}
                </p>
                
                {fixResult.success && fixResult.details && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>處理行數: {fixResult.details.processedCount}</p>
                    <p>更新行數: {fixResult.details.updatedCount}</p>
                    <p>執行更新: {fixResult.details.updatesApplied}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 說明 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-md font-medium mb-2">操作說明</h3>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. 輸入管理員密鑰</li>
              <li>2. 點擊「檢查資料狀態」查看目前的時間格式</li>
              <li>3. 確認需要更新的資料無誤後，點擊「執行批次修正」</li>
              <li>4. 系統會自動將UTC時間轉換為台灣時間格式</li>
              <li>5. 已經是台灣時間格式的資料不會被重複處理</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
} 