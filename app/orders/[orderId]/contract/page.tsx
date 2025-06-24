"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
// @ts-ignore
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
// import '../../../../../public/NotoSansTC-normal.js'; // 改為動態載入
import FloatingButtons from '@/components/FloatingButtons';

function SignatureModal({ open, onClose, onSign }: { open: boolean; onClose: () => void; onSign: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  // 新增：根據裝置自動調整 canvas 尺寸
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 200 });
  useEffect(() => {
    if (!open) return;
    const isMobile = window.innerWidth < 600;
    if (isMobile) {
      // 強制橫式，盡可能全螢幕
      const w = Math.min(window.innerWidth, window.innerHeight * 1.8, 600);
      const h = Math.min(window.innerHeight * 0.5, 320);
      setCanvasSize({ width: w, height: h });
    } else {
      setCanvasSize({ width: 400, height: 200 });
    }
  }, [open]);

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
      <div className="bg-white rounded-lg shadow-lg p-2 w-full max-w-2xl relative flex flex-col items-center">
        <h2 className="text-lg font-bold mb-4">電子簽名</h2>
        <div style={{ width: canvasSize.width, height: canvasSize.height, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="border border-gray-200 rounded bg-white touch-none"
            style={{ touchAction: 'none', width: canvasSize.width, height: canvasSize.height, display: 'block' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startTouch}
            onTouchMove={drawTouch}
            onTouchEnd={stopTouch}
          />
        </div>
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

// 合約條款渲染（正式版，動態帶入步驟三資訊）
function renderContract(order: any, depositMode: string | null, needCable: boolean, needCharger: boolean) {
  const today = new Date();
  const formatDate = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return (
    <div className="space-y-4 text-base leading-relaxed mb-8 text-gray-800">
      <h2 className="text-xl font-bold mb-2 text-gray-900">三星Galaxy S25 Ultra手機租賃契約書</h2>
      <b>第一條 租賃標的</b><br/>
      1. <b>出租人（甲方）：</b> 伊森不累手機租借平台<br/>
      2. <b>承租人（乙方）：</b> {order[5]}<br/>
      3. <b>租賃設備：</b><br/>
      &nbsp;&nbsp;- 手機品牌與型號：三星Galaxy S25 Ultra<br/>
      &nbsp;&nbsp;- IMEI序號：{order[1]}<br/>
      &nbsp;&nbsp;- 配件：原廠USB-C充電線、原廠盒裝、原廠保護殼（若提供）<br/>
      &nbsp;&nbsp;- 初始狀況：電池健康度95%，外觀無刮痕、無凹陷、無裂痕，功能正常，經雙方確認無既有瑕疵<br/>
      &nbsp;&nbsp;- 清潔要求：乙方應保持設備清潔，歸還時不得有污漬、異味或殞損，否則甲方將收取清潔費用NT$500，於押金或預授權中扣除。<br/>
      <b>第二條 租賃期間</b><br/>
      1. <b>租期：</b> 自{order[2]}起至{order[3]}止。<br/>
      2. <b>延租申請：</b> 乙方需於租期結束前24小時以書面（電子郵件或LINE官方帳號）通知甲方，經甲方書面同意後方可延租。延租費用依第三條規定計算。<br/>
      3. <b>最長租期：</b> 本契約單次租期不得超過30日。超過30日，乙方需與甲方重新簽訂新契約。<br/>
      <b>第三條 租金與押金</b><br/>
      1. <b>租金：</b> 每日租金NT$600，乙方應於設備交付時以現金或電子支付方式一次付清全額租金，或依雙方書面約定按日結算。<br/>
      2. <b>押金方案（擇一）：</b><br/>
      &nbsp;&nbsp;<b>方案一：高押金（免證件）</b><br/>
      &nbsp;&nbsp;- 押金金額：NT$30,000（現金）<br/>
      &nbsp;&nbsp;- 繳納方式：設備交付時以現金繳納<br/>
      &nbsp;&nbsp;- 證件要求：無需提供身分證件<br/>
      &nbsp;&nbsp;<b>方案二：低押金（需證件）</b><br/>
      &nbsp;&nbsp;- 押金金額：NT$3,000（現金）+ 身分證正本<br/>
      &nbsp;&nbsp;- 或信用卡預授權：NT$30,000<br/>
      &nbsp;&nbsp;- 繳納方式：設備交付時繳納<br/>
      &nbsp;&nbsp;- 證件要求：需提供身分證正本及第二證件影本<br/>
      3. <b>押金退還：</b> 設備歸還且驗收無誤後，甲方於24小時內退還押金或解除預授權。<br/>
      <b>第四條 設備交付與歸還</b><br/>
      1. <b>交付程序：</b> 甲乙雙方於交付時共同檢查設備外觀、功能及配件，簽署《設備交付確認單》（附件二），並拍照存證（包含螢幕、機身、配件完整性）。<br/>
      2. <b>歸還驗收：</b> 乙方應於租期結束當日親自或委託快遞將設備歸還至甲方指定地點。甲方依《損害賠償參考表》（附件一）檢查設備並計算賠償（如適用）。<br/>
      3. <b>逾期處理：</b><br/>
      &nbsp;&nbsp;- 逾期未歸還，每日加收租金NT$600。<br/>
      &nbsp;&nbsp;- 逾期超過3日未歸還，視為設備遺失，甲方將扣除全額押金或預授權金額，並保留向乙方追償損失的權利。<br/>
      4. <b>損壞或遺失賠償：</b> 乙方應賠償設備維修或重置費用（依附件一），並支付營業損失補償（每日NT$600，最高15日，計NT$9,000）。<br/>
      5. <b>爭議處理：</b> 若對設備狀況有爭議，雙方同意委託三星原廠授權維修中心進行鑑定，鑑定費用由爭議發起方預付，鑑定結果為最終依據。<br/>
      <b>第五條 雙方責任</b><br/>
      1. <b>甲方責任：</b><br/>
      &nbsp;&nbsp;- 保證設備於交付時功能正常，已完成清潔及消毒（符合衛生署標準）。<br/>
      &nbsp;&nbsp;- 若設備因非人為因素故障，甲方提供同型號備用設備或退還剩餘租金。<br/>
      2. <b>乙方責任：</b><br/>
      &nbsp;&nbsp;- 妥善保管及使用設備，不得拆解、轉租、刷機、越獄或安裝未經授權軟體。<br/>
      &nbsp;&nbsp;- 因乙方疏失導致設備損壞或遺失，乙方負全額賠償責任（依附件一）。<br/>
      3. <b>不可抗力：</b> 因天災、戰爭等不可抗力導致設備無法使用或歸還，雙方免責。乙方需於事件發生後24小時內以書面或電子方式通知甲方，雙方協商後續處理。<br/>
      <b>第六條 證件與個人資料管理</b><br/>
      1. 低押金模式下，乙方提供身分證及第二證件影本，甲方僅用於本契約身分驗證及履約管理。<br/>
      2. 甲方依《個人資料保護法》採取加密儲存及限制存取措施，確保乙方個人資料安全。若違反，甲方負法律責任。<br/>
      3. 租期結束後7日內，甲方銷毀乙方證件影本或歸還正本。乙方有權要求甲方提供書面銷毀證明。<br/>
      <b>第七條 預授權規範</b><br/>
      1. 低押金模式下，乙方於交付設備前以信用卡完成NT$30,000預授權。<br/>
      2. 設備歸還且驗收無誤後，甲方於3個工作日內解除預授權。<br/>
      3. 若設備未歸還、損壞或違約，甲方得依附件一執行扣款，並提供扣款明細。<br/>
      4. 乙方對扣款有異議，應於收到扣款通知後7日內提出，甲方應提供證明文件（包含維修報價單或鑑定報告）。<br/>
      <b>第八條 違約與解約</b><br/>
      1. <b>乙方違約情事：</b> 包括但不限於逾期未歸還、設備遺失、未經同意轉租、故意損壞設備。甲方得終止契約，扣除押金或預授權，並保留追償權利。<br/>
      2. <b>爭議解決：</b><br/>
      &nbsp;&nbsp;- 雙方應以協商為原則解決爭議。<br/>
      &nbsp;&nbsp;- 協商不成，提交中華民國消費者保護委員會或第三方調解機構調解。<br/>
      &nbsp;&nbsp;- 調解不成，以台灣台北地方法院為第一審管轄法院。<br/>
      <b>第九條 契約效力</b><br/>
      1. 本契約依據《中華民國民法》及《消費者保護法》制定，屬定型化契約。<br/>
      2. 乙方於簽署前享有5日審閱期，簽署即表示同意全部條款。<br/>
      3. 本契約以中文為準，其他語言版本僅供參考。<br/>
      <b>第十條 契約份數與簽署</b><br/>
      1. 本契約一式兩份，甲乙雙方各執一份，具同等法律效力。<br/>
      2. 電子簽署依《電子簽章法》執行，與手寫簽署具同等效力。<br/>
      <b>第十一條 不可抗力與風險轉移</b><br/>
      1. 因不可抗力（如地震、颱風、政府命令）導致設備無法使用或歸還，雙方免責。乙方需於事件發生後24小時內通知甲方，雙方協商後續處理。<br/>
      2. 租賃期間設備毀損風險由乙方承擔，但因甲方提供瑕疵設備導致損失，由甲方負責賠償。<br/>
      <b>第十二條 通知方式</b><br/>
      1. 所有通知（包括延租、違約、爭議）以書面（電子郵件或LINE）送達。<br/>
      2. 乙方聯繫方式變更，應立即通知甲方，否則視為有效送達。<br/>
      3. <b>甲方聯繫方式：</b> 02-8252-7208，電子郵件：a0970580318@gmail.com，地址：台北市板橋區文化路二段385之3號<br/>
      <b>簽署欄位</b><br/>
      甲方簽章：____________________　日期：{formatDate(today)}<br/>
      乙方簽章：____________________　日期：{formatDate(today)}<br/>
      <b>附件一：損害賠償參考表</b><br/>
      - 螢幕破裂：NT$6,400（以三星原廠最終維修報價為主）<br/>
      - 電池損壞：NT$4,000（以三星原廠最終維修報價為主）<br/>
      - 設備遺失：NT$43,900（依三星Galaxy S25 Ultra市場當日零售價為主）<br/>
      - 配件遺失：<br/>
      &nbsp;&nbsp;- 原廠USB-C充電線：NT$800<br/>
      &nbsp;&nbsp;- 原廠保護殼：NT$1,000<br/>
      &nbsp;&nbsp;- 原廠盒裝：NT$500<br/>
      - 其他損壞：依三星原廠授權維修中心報價單計算。<br/>
      {renderAttachment2(order, depositMode, needCable, needCharger)}
    </div>
  );
}

function renderAttachment2(order: any, depositMode: string | null, needCable: boolean, needCharger: boolean) {
  const today = new Date();
  return (
    <div className="mt-4 p-4 border border-gray-300 rounded bg-white text-gray-900">
      <b>附件二：設備交付確認單</b><br/>
      - 設備型號：三星Galaxy S25 Ultra<br/>
      - IMEI序號：{order[1]}<br/>
      - 交付日期：{today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日<br/>
      - 初始狀況：電池健康度95%，外觀無瑕疵，功能正常<br/>
      - 配件清單：
        {needCharger && '原廠充電頭，'}
        {needCable && '原廠USB-C充電線，'}
        原廠保護殼（標配）<br/>
      - 押金模式：{depositMode === 'high' ? '高押金（免證件）' : depositMode === 'low' ? '低押金（需證件及預授權）' : '未選擇'}<br/>
      - 甲方簽章：____________________　乙方簽章：____________________<br/>
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
  const [isUploading, setIsUploading] = useState(false);
  // 1. 手機外觀
  const [photos, setPhotos] = useState<string[]>([]);
  // 2. 證件
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
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

  useEffect(() => {
    // 進入合約頁即隱藏浮動按鈕，離開時恢復
    if (typeof window !== 'undefined') {
      const fb = document.querySelector('.fixed.bottom-6.right-6.z-50');
      if (fb) (fb as HTMLElement).style.display = 'none';
      return () => { if (fb) (fb as HTMLElement).style.display = ''; };
    }
  }, []);

  const handleSign = async (dataUrl: string) => {
    setModalOpen(false);
    setSigned(true);
    setSignatureUrl(dataUrl);
    setIsUploading(true);
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
          contractNode.style.fontFamily = 'Noto Sans TC, Inter, system-ui, sans-serif';
          contractNode.querySelectorAll('*').forEach(el => {
            (el as HTMLElement).style.fontFamily = 'Noto Sans TC, Inter, system-ui, sans-serif';
          });
          const computedFont = window.getComputedStyle(contractNode).fontFamily;
          if (!computedFont.includes('Noto Sans TC')) {
            alert('字型未正確套用，PDF 可能會醜，請重新整理頁面再存檔！');
          }
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
              setIsUploading(false);
              alert("合約簽署完成！");
            } else {
              setIsUploading(false);
              alert("簽署失敗，請稍後再試");
            }
          } catch (err) {
            console.error('PDF upload error', err);
            setIsUploading(false);
            alert("PDF 產生失敗，請稍後再試");
          }
        } else {
          console.log('PDF upload failed: contract-content not found');
          setIsUploading(false);
        }
      }, 1000);
    } catch {
      setIsUploading(false);
      alert("簽署失敗，請稍後再試");
    }
  };

  // 拍照/上傳手機外觀，並自動上傳到 Google Drive
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 6) return alert('最多6張');
    const arr = await Promise.all(files.map(f => toBase64(f)));
    setPhotos([...photos, ...arr]);
    // 自動上傳
    for (let i = 0; i < files.length; i++) {
      await fetch(`/api/orders/${orderId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: arr[i], type: 'photo', name: `外觀${photos.length + i + 1}` })
      });
    }
  };
  const handlePhotoRemove = (idx: number) => setPhotos(photos.filter((_, i) => i !== idx));
  // 證件拍照（正面）
  const handleIdFront = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    // 檢查檔案大小（限制 3MB，降低限制）
    if (file.size > 3 * 1024 * 1024) {
      alert('檔案太大，請選擇小於 3MB 的圖片');
      return;
    }
    
    try {
      console.log('開始處理證件正面...', `檔案大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      
      // 先轉換為 base64 並壓縮
      let base64 = await toBase64(file);
      console.log('原始 base64 長度:', base64.length);
      
      // 壓縮圖片
      base64 = await compressImage(base64, 0.7); // 壓縮到 70% 品質
      console.log('壓縮後 base64 長度:', base64.length);
      
      let watermarked;
      try {
        // 嘗試加浮水印
        console.log('開始加浮水印...');
        watermarked = await addWatermark(base64, `僅限手機租賃使用 ${new Date().toLocaleString('zh-TW', { hour12: false })}`);
        console.log('浮水印處理完成');
      } catch (watermarkError) {
        console.warn('浮水印處理失敗，使用原圖:', watermarkError);
        watermarked = base64; // 降級：如果浮水印失敗就用原圖
      }
      
      // 重試上傳機制
      let uploadSuccess = false;
      let lastError;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`第 ${attempt} 次上傳嘗試...`);
          
          const uploadResponse = await fetch(`/api/orders/${orderId}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: watermarked, type: 'id', name: '證件正面' })
          });
          
          if (!uploadResponse.ok) {
            throw new Error(`上傳失敗: ${uploadResponse.status}`);
          }
          
          console.log('證件正面上傳成功！');
          uploadSuccess = true;
          break;
          
        } catch (uploadError) {
          console.warn(`第 ${attempt} 次上傳失敗:`, uploadError);
          lastError = uploadError;
          
          if (attempt < 3) {
            // 等待後重試
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      if (!uploadSuccess) {
        throw lastError;
      }
      
      // 顯示加浮水印的圖片
      setIdFront(watermarked);
      
    } catch (err) {
      console.error('證件正面處理失敗:', err);
      alert('證件正面上傳失敗，請檢查網路連線後重新嘗試');
    }
  };
  
  // 證件拍照（反面）
  const handleIdBack = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    // 檢查檔案大小（限制 3MB，降低限制）
    if (file.size > 3 * 1024 * 1024) {
      alert('檔案太大，請選擇小於 3MB 的圖片');
      return;
    }
    
    try {
      console.log('開始處理證件反面...', `檔案大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      
      // 先轉換為 base64 並壓縮
      let base64 = await toBase64(file);
      console.log('原始 base64 長度:', base64.length);
      
      // 壓縮圖片
      base64 = await compressImage(base64, 0.7); // 壓縮到 70% 品質
      console.log('壓縮後 base64 長度:', base64.length);
      
      let watermarked;
      try {
        // 嘗試加浮水印
        console.log('開始加浮水印...');
        watermarked = await addWatermark(base64, `僅限手機租賃使用 ${new Date().toLocaleString('zh-TW', { hour12: false })}`);
        console.log('浮水印處理完成');
      } catch (watermarkError) {
        console.warn('浮水印處理失敗，使用原圖:', watermarkError);
        watermarked = base64; // 降級：如果浮水印失敗就用原圖
      }
      
      // 重試上傳機制
      let uploadSuccess = false;
      let lastError;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`第 ${attempt} 次上傳嘗試...`);
          
          const uploadResponse = await fetch(`/api/orders/${orderId}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: watermarked, type: 'id', name: '證件反面' })
          });
          
          if (!uploadResponse.ok) {
            throw new Error(`上傳失敗: ${uploadResponse.status}`);
          }
          
          console.log('證件反面上傳成功！');
          uploadSuccess = true;
          break;
          
        } catch (uploadError) {
          console.warn(`第 ${attempt} 次上傳失敗:`, uploadError);
          lastError = uploadError;
          
          if (attempt < 3) {
            // 等待後重試
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      if (!uploadSuccess) {
        throw lastError;
      }
      
      // 顯示加浮水印的圖片
      setIdBack(watermarked);
      
    } catch (err) {
      console.error('證件反面處理失敗:', err);
      alert('證件反面上傳失敗，請檢查網路連線後重新嘗試');
    }
  };
  // 步驟切換
  const canNext1 = photos.length >= 2;
  const canNext2 = !!idFront && !!idBack;
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
          <h2 className="text-lg font-bold mb-2">2. 請拍攝身分證（正面與反面，自動加浮水印）</h2>
          <div className="mb-2">
            <label className="block mb-1">上傳正面：</label>
            <input type="file" accept="image/*" capture="environment" onChange={handleIdFront} className="mb-2" />
            {idFront && <img src={idFront} alt="證件正面" className="w-64 h-40 object-contain border rounded mb-2" />}
          </div>
          <div className="mb-2">
            <label className="block mb-1">上傳反面：</label>
            <input type="file" accept="image/*" capture="environment" onChange={handleIdBack} className="mb-2" />
            {idBack && <img src={idBack} alt="證件反面" className="w-64 h-40 object-contain border rounded mb-2" />}
          </div>
          <button onClick={() => { setIdFront(null); setIdBack(null); }} className="px-3 py-1 text-sm bg-gray-200 rounded mr-2">重拍</button>
          <button disabled={!canNext2} onClick={() => setStep(3)} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300">下一步</button>
        </div>
      )}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-bold mb-2">3. 選擇押金模式與配件</h2>
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">押金模式說明：</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <input type="radio" id="high" checked={depositMode==='high'} onChange={()=>setDepositMode('high')} className="mt-1 mr-2" />
                <label htmlFor="high" className="flex-1">
                  <span className="font-medium">高押金（免證件）：</span>
                  <br/>
                  <span className="text-gray-600">現金 NT$30,000，無需提供身分證件</span>
                </label>
              </div>
              <div className="flex items-start">
                <input type="radio" id="low" checked={depositMode==='low'} onChange={()=>setDepositMode('low')} className="mt-1 mr-2" />
                <label htmlFor="low" className="flex-1">
                  <span className="font-medium">低押金（需證件）：</span>
                  <br/>
                  <span className="text-gray-600">身分證正本 + NT$3,000 現金，或信用卡預授權 NT$30,000</span>
                </label>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <h3 className="font-semibold mb-2">配件需求：</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" checked={needCable} onChange={e=>setNeedCable(e.target.checked)} className="mr-2" />
                <span>需要傳輸線（NT$800）</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={needCharger} onChange={e=>setNeedCharger(e.target.checked)} className="mr-2" />
                <span>需要充電頭（NT$1,000）</span>
              </label>
            </div>
          </div>
          <button disabled={!canNext3} onClick={() => setStep(4)} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300">下一步</button>
        </div>
      )}
      {step === 4 && (
        <div>
          <div className="mb-8">
            {renderContract(order, depositMode, needCable, needCharger)}
          </div>
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">電子簽署</h3>
            {isUploading && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                  <div>
                    <div className="text-blue-800 font-medium">上傳作業中...</div>
                    <div className="text-blue-600 text-sm">請稍候，不要離開畫面</div>
                  </div>
                </div>
              </div>
            )}
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
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous'; // 防止跨域問題
    
    img.onload = async () => {
      try {
        // 減少延遲，提高處理速度
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('無法取得 canvas context');
          return resolve(base64);
        }
        
        // 繪製原始圖片
        ctx.drawImage(img, 0, 0);
        
        // 簡化字體大小計算
        const fontSize = Math.max(18, Math.min(36, img.width / 20));
        ctx.font = `bold ${fontSize}px Arial`;
        
        // 測量文字寬度
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        
        // 簡化位置計算
        const padding = 20;
        const x = Math.max(10, img.width - textWidth - padding);
        const y = img.height - padding;
        
        // 簡化浮水印樣式，減少處理步驟
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // 白色背景
        ctx.fillRect(x - 10, y - fontSize - 10, textWidth + 20, fontSize + 20);
        
        // 黑色邊框
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 10, y - fontSize - 10, textWidth + 20, fontSize + 20);
        
        // 繪製文字（去掉陰影，減少處理）
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillText(text, x, y);
        
        // 使用較低品質但更穩定的壓縮
        const result = canvas.toDataURL('image/jpeg', 0.8);
        console.log('浮水印處理成功');
        resolve(result);
        
      } catch (error) {
        console.error('浮水印處理失敗:', error);
        // 如果浮水印失敗，返回原始圖片
        resolve(base64);
      }
    };
    
    img.onerror = (error) => {
      console.error('圖片載入失敗:', error);
      resolve(base64);
    };
    
    // 設定圖片來源
    img.src = base64;
  });
}

// 浮水印工具
async function compressImage(base64: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous'; // 防止跨域問題
    
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('無法取得 canvas context');
          return resolve(base64);
        }
        
        // 繪製原始圖片
        ctx.drawImage(img, 0, 0);
        
        // 壓縮圖片
        const compressedData = canvas.toDataURL('image/jpeg', quality);
        console.log('圖片壓縮完成，大小:', compressedData.length);
        resolve(compressedData);
        
      } catch (error) {
        console.error('圖片壓縮失敗:', error);
        resolve(base64);
      }
    };
    
    img.onerror = (error) => {
      console.error('圖片載入失敗:', error);
      resolve(base64);
    };
    
    // 設定圖片來源
    img.src = base64;
  });
} 