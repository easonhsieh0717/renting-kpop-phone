"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
// @ts-ignore
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
// import '../../../../../public/NotoSansTC-normal.js'; // 改為動態載入

function SignatureModal({ open, onClose, onSign }: { open: boolean; onClose: () => void; onSign: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // 滑鼠事件
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastPos.current = { x, y };
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
    }
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && lastPos.current) {
      ctx.lineTo(x, y);
      ctx.stroke();
      lastPos.current = { x, y };
    }
  };
  const stopDrawing = () => setIsDrawing(false);
  // 觸控事件
  const startTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    lastPos.current = { x, y };
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
    }
  };
  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && lastPos.current) {
      ctx.lineTo(x, y);
      ctx.stroke();
      lastPos.current = { x, y };
    }
  };
  const stopTouch = () => setIsDrawing(false);
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
  return open ? (
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
          onTouchStart={startTouch}
          onTouchMove={drawTouch}
          onTouchEnd={stopTouch}
        />
        <div className="mt-2 flex gap-2">
          <button onClick={clearSignature} className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">清除簽名</button>
          <button onClick={handleSign} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">確認簽署</button>
          <button onClick={onClose} className="px-3 py-1 text-sm bg-gray-100 text-gray-500 rounded hover:bg-gray-200">取消</button>
        </div>
      </div>
    </div>
  ) : null;
}

function Stepper({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  const steps = ["手機外觀", "證件拍照", "押金/配件", "合約簽署"];
  return (
    <div className="flex items-center mb-6">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-white ${step === i + 1 ? 'bg-blue-600' : 'bg-gray-400'}`}>{i + 1}</div>
          <div className="ml-2 mr-4 text-sm font-medium" style={{ color: step === i + 1 ? '#2563eb' : '#888' }}>{s}</div>
          {i < steps.length - 1 && <div className="w-8 h-1 bg-gray-300" />}
        </div>
      ))}
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
  const [step, setStep] = useState(1);
  // 1. 手機外觀
  const [photos, setPhotos] = useState<string[]>([]);
  // 2. 證件
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  // 3. 押金/配件
  const [depositMode, setDepositMode] = useState<'high' | 'low' | null>(null);
  const [needCable, setNeedCable] = useState(false);
  const [needCharger, setNeedCharger] = useState(false);

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
    setSigned(true);
    setSignatureUrl(dataUrl);
    await new Promise(r => setTimeout(r, 200)); // 等待 DOM 更新
    try {
      // 1. 先呼叫 /sign，寫入 Google Sheet
      const response = await fetch(`/api/orders/${orderId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: dataUrl })
      });
      // 2. 再呼叫 /upload，寫入 Google Drive（簽名圖）
      await fetch(`/api/orders/${orderId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: dataUrl, type: 'sign' })
      });
      // 3. 產生 PDF 並分片上傳
      setTimeout(async () => {
        const contractNode = document.getElementById('contract-content');
        if (contractNode) {
          try {
            // 多頁正確分頁：每頁用 transform 位移內容
            const pageHeight = 1122; // px, A4
            const totalHeight = contractNode.scrollHeight;
            const pdf = new jsPDF({ unit: 'px', format: 'a4' });
            let rendered = 0;
            let pageNum = 0;
            while (rendered < totalHeight) {
              const pageDiv = document.createElement('div');
              pageDiv.style.width = contractNode.offsetWidth + 'px';
              pageDiv.style.height = pageHeight + 'px';
              pageDiv.style.overflow = 'hidden';
              pageDiv.style.background = '#fff';
              // 只顯示本頁內容
              const inner = contractNode.cloneNode(true) as HTMLElement;
              inner.style.transform = `translateY(-${rendered}px)`;
              pageDiv.appendChild(inner);
              document.body.appendChild(pageDiv);
              const canvas = await html2canvas(pageDiv, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#fff'
              });
              document.body.removeChild(pageDiv);
              const imgData = canvas.toDataURL('image/png');
              if (pageNum > 0) pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
              rendered += pageHeight;
              pageNum++;
            }
            const pdfData = pdf.output('dataurlstring');
            const maxSize = 3.5 * 1024 * 1024; // 3.5MB
            const chunks = splitBase64(pdfData, maxSize);
            for (let i = 0; i < chunks.length; i++) {
              console.log('PDF upload part', i + 1, 'size', chunks[i].length);
              await fetch(`/api/orders/${orderId}/upload?part=${i + 1}&total=${chunks.length}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: chunks[i], type: 'pdf' })
              });
            }
            if (response.ok) {
              alert("合約簽署完成！");
            } else {
              alert("簽署失敗，請稍後再試");
            }
          } catch (err) {
            console.error('PDF upload error', err);
          }
        } else {
          console.log('PDF upload failed: contract-content not found');
        }
      }, 1000);
    } catch {
      alert("簽署失敗，請稍後再試");
    }
  };

  // 拍照/上傳手機外觀
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 6) return alert('最多6張');
    Promise.all(files.map(f => toBase64(f))).then(arr => setPhotos([...photos, ...arr]));
  };
  const handlePhotoRemove = (idx: number) => setPhotos(photos.filter((_, i) => i !== idx));
  // 身分證拍照（加浮水印）
  const idInputRef = useRef<HTMLInputElement>(null);
  const handleIdPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    toBase64(file).then(base64 => {
      // 加浮水印
      addWatermark(base64, `RENT ${orderId}`).then(watermarked => setIdPhoto(watermarked));
    });
  };
  // 步驟切換
  const canNext1 = photos.length >= 2;
  const canNext2 = !!idPhoto;
  const canNext3 = !!depositMode;

  if (loading) return <div className="p-8 text-center">載入中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!order) return null;

  return (
    <div id="contract-content" className="max-w-4xl mx-auto p-6 bg-white rounded shadow mt-8">
      <Stepper step={step} setStep={setStep} />
      {step === 1 && (
        <div>
          <h2 className="text-lg font-bold mb-2">1. 請拍攝手機外觀（最少正反兩張，最多6張）</h2>
          <input type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoUpload} className="mb-2" />
          <div className="flex flex-wrap gap-2 mb-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p} alt="外觀" className="w-32 h-32 object-cover border rounded" />
                <button onClick={() => handlePhotoRemove(i)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6">×</button>
              </div>
            ))}
          </div>
          <button disabled={!canNext1} onClick={() => setStep(2)} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300">下一步</button>
        </div>
      )}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-bold mb-2">2. 請拍攝身分證（自動加浮水印）</h2>
          <input type="file" accept="image/*" capture="environment" ref={idInputRef} onChange={handleIdPhoto} className="mb-2" />
          {idPhoto && <img src={idPhoto} alt="證件" className="w-64 h-40 object-contain border rounded mb-2" />}
          <button onClick={() => setIdPhoto(null)} className="px-3 py-1 text-sm bg-gray-200 rounded mr-2">重拍</button>
          <button disabled={!canNext2} onClick={() => setStep(3)} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300">下一步</button>
        </div>
      )}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-bold mb-2">3. 選擇押金模式與配件</h2>
          <div className="mb-2">
            <label className="mr-4"><input type="radio" checked={depositMode==='high'} onChange={()=>setDepositMode('high')} /> 高押金（免證件）</label>
            <label><input type="radio" checked={depositMode==='low'} onChange={()=>setDepositMode('low')} /> 低押金（需證件）</label>
          </div>
          <div className="mb-2">
            <label className="mr-4"><input type="checkbox" checked={needCable} onChange={e=>setNeedCable(e.target.checked)} /> 需要傳輸線</label>
            <label><input type="checkbox" checked={needCharger} onChange={e=>setNeedCharger(e.target.checked)} /> 需要充電頭</label>
          </div>
          <button disabled={!canNext3} onClick={() => setStep(4)} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300">下一步</button>
        </div>
      )}
      {step === 4 && (
        <div>
          <div className="mb-8">
            {/* 合約內容區塊（可抽成 renderContract(order, photos, idPhoto, depositMode, needCable, needCharger)） */}
            <h1 className="text-2xl font-bold mb-4 text-center text-gray-900">手機租賃合約書</h1>
            <div className="mb-4 text-sm text-gray-700 text-center">訂單編號：{order[0]}</div>
            <div className="space-y-4 text-base leading-relaxed mb-8 text-gray-800">
              {/* ...合約條款內容... 可帶入 photos, idPhoto, depositMode, needCable, needCharger 資訊 */}
              {/* ...原本合約內容... */}
            </div>
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
        </div>
      )}
      <SignatureModal open={modalOpen} onClose={() => setModalOpen(false)} onSign={handleSign} />
    </div>
  );
}

function splitBase64(base64: string, maxSize: number) {
  const header = base64.substring(0, base64.indexOf(',') + 1);
  const data = base64.substring(base64.indexOf(',') + 1);
  const chunks = [];
  for (let i = 0; i < data.length; i += maxSize) {
    chunks.push(header + data.substring(i, i + maxSize));
  }
  return chunks;
}

// base64 工具
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 浮水印工具
async function addWatermark(base64: string, text: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);
      ctx.drawImage(img, 0, 0);
      ctx.font = 'bold 32px sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillText(text, 20, img.height - 40);
      resolve(canvas.toDataURL());
    };
    img.src = base64;
  });
} 