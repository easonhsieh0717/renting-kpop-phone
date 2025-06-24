"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ContractPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetch(`/api/orders/${orderId}`)
      .then(res => res.json())
      .then(data => {
        setOrder(data);
        setLoading(false);
      })
      .catch(() => {
        setError("查無此訂單");
        setLoading(false);
      });
  }, [orderId]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 檢查是否有簽名
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasSignature = imageData.data.some(pixel => pixel !== 0);
    
    if (!hasSignature) {
      alert("請先簽名");
      return;
    }
    
    setSigning(true);
    
    try {
      // 這裡可以將簽名圖片上傳到 Google Drive 或儲存到資料庫
      const signatureDataUrl = canvas.toDataURL();
      
      // 更新 Google Sheet 標記為已簽署
      const response = await fetch(`/api/orders/${orderId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: signatureDataUrl })
      });
      
      if (response.ok) {
        setSigned(true);
        alert("合約簽署完成！");
      } else {
        alert("簽署失敗，請稍後再試");
      }
    } catch (err) {
      alert("簽署失敗，請稍後再試");
    } finally {
      setSigning(false);
    }
  };

  if (loading) return <div className="p-8 text-center">載入中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!order) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-4 text-center">手機租賃合約書</h1>
      <div className="mb-4 text-sm text-gray-500 text-center">訂單編號：{order[0]}</div>
      
      <div className="space-y-4 text-base leading-relaxed mb-8">
        <p>本合約由下列雙方簽訂：</p>
        <p>出租方（甲方）：伊森不累手機租借平台</p>
        <p>承租方（乙方）：{order[5]}（電話：{order[7]}，Email：{order[6]}）</p>
        <p>租借手機ID：{order[1]}</p>
        <p>租借期間：{order[2]} 至 {order[3]}</p>
        <p>租金總額：NT$ {order[4]}</p>
        <p>雙方同意依下列條款履行：</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>乙方應於租借時支付全額租金及押金，並於歸還手機時檢查無誤後退還押金。</li>
          <li>乙方應妥善保管租借手機，若有損壞、遺失，應照價賠償。</li>
          <li>乙方不得將手機轉租、轉借或作非法用途。</li>
          <li>乙方如需延長租期，應提前通知甲方並補足差額。</li>
          <li>乙方同意提供有效證件供甲方核對，並同意甲方依個資法妥善保管。</li>
          <li>本合約經雙方簽名後生效，未盡事宜依台灣相關法令處理。</li>
        </ol>
      </div>

      {!signed ? (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">電子簽署</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              乙方簽名（{order[5]}）
            </label>
            <div className="border border-gray-300 rounded-lg p-4">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="border border-gray-200 rounded cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={clearSignature}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  清除簽名
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handleSign}
              disabled={signing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {signing ? "簽署中..." : "確認簽署"}
            </button>
            <button
              onClick={() => router.push("/contract-sign")}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              返回
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t pt-6 text-center">
          <div className="text-green-600 text-lg font-semibold mb-2">✅ 合約簽署完成</div>
          <p className="text-gray-600 mb-4">您的合約已成功簽署並儲存</p>
          <button
            onClick={() => router.push("/contract-sign")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回首頁
          </button>
        </div>
      )}
    </div>
  );
} 