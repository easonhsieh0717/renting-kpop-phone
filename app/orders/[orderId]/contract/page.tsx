"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

function SignatureModal({ open, onClose, onSign }: { open: boolean; onClose: () => void; onSign: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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
  const stopDrawing = () => setIsDrawing(false);
  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  const handleSign = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasSignature = imageData.data.some(pixel => pixel !== 0);
    if (!hasSignature) {
      alert("請先簽名");
      return;
    }
    onSign(canvas.toDataURL());
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <h2 className="text-lg font-bold mb-4">電子簽名</h2>
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="border border-gray-200 rounded cursor-crosshair bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        <div className="mt-2 flex gap-2">
          <button onClick={clearSignature} className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">清除簽名</button>
          <button onClick={handleSign} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">確認簽署</button>
          <button onClick={onClose} className="px-3 py-1 text-sm bg-gray-100 text-gray-500 rounded hover:bg-gray-200">取消</button>
        </div>
      </div>
    </div>
  );
}

export default function ContractPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetch(`/api/orders/${orderId}`)
      .then(res => res.json())
      .then(data => {
        setOrder(data);
        // 檢查是否已簽署與是否有簽名圖
        if (data[13] === "已簽署" && data[14]) {
          setSigned(true);
          setSignatureUrl(data[14]);
        } else {
          setSigned(false);
          setSignatureUrl(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("查無此訂單");
        setLoading(false);
      });
  }, [orderId]);

  const handleSign = async (dataUrl: string) => {
    setModalOpen(false);
    try {
      // 1. 先呼叫 /sign，寫入 Google Sheet
      const response = await fetch(`/api/orders/${orderId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: dataUrl })
      });
      // 2. 再呼叫 /upload，寫入 Google Drive
      await fetch(`/api/orders/${orderId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: dataUrl, type: 'sign' })
      });
      if (response.ok) {
        setSigned(true);
        setSignatureUrl(dataUrl);
        alert("合約簽署完成！");
      } else {
        alert("簽署失敗，請稍後再試");
      }
    } catch {
      alert("簽署失敗，請稍後再試");
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
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">電子簽署</h3>
        {signed && signatureUrl ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">乙方簽名（{order[5]}）</label>
            <img src={signatureUrl} alt="簽名圖" className="border border-gray-300 rounded bg-white" style={{ width: 400, height: 200 }} />
            <div className="text-green-600 text-sm mt-2">✅ 已完成簽署</div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">乙方簽名（{order[5]}）</label>
            <div className="text-gray-400 text-sm mb-2">尚未簽署</div>
            <button onClick={() => setModalOpen(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">我要簽名</button>
          </div>
        )}
      </div>
      <SignatureModal open={modalOpen} onClose={() => setModalOpen(false)} onSign={handleSign} />
    </div>
  );
} 