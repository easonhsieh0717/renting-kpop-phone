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
            // 多頁截圖產生 PDF（正確分頁，每頁用 marginTop 位移）
            const pageHeight = 1122; // px, 約等於 A4 @ 96dpi
            const totalHeight = contractNode.scrollHeight;
            const pdf = new jsPDF({ unit: 'px', format: 'a4' });
            let rendered = 0;
            let pageNum = 0;
            while (rendered < totalHeight) {
              // 建立臨時 div，內容同 contractNode
              const tempDiv = contractNode.cloneNode(true) as HTMLElement;
              tempDiv.style.height = `${pageHeight}px`;
              tempDiv.style.overflow = 'hidden';
              tempDiv.style.marginTop = `-${rendered}px`;
              tempDiv.style.background = '#fff';
              document.body.appendChild(tempDiv);
              const canvas = await html2canvas(tempDiv, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#fff'
              });
              document.body.removeChild(tempDiv);
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
              setSigned(true);
              setSignatureUrl(dataUrl);
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

  if (loading) return <div className="p-8 text-center">載入中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!order) return null;

  return (
    <div id="contract-content" className="max-w-4xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-4 text-center text-gray-900">手機租賃合約書</h1>
      <div className="mb-4 text-sm text-gray-700 text-center">訂單編號：{order[0]}</div>
      <div className="space-y-4 text-base leading-relaxed mb-8 text-gray-800">
        <h2 className="text-xl font-bold mb-2 text-gray-900">三星Galaxy S25 Ultra手機租借契約書</h2>
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
        1. <b>租期：</b> {order[2]} 至 {order[3]}<br/>
        2. <b>延租申請：</b> 乙方需於租期結束前24小時以書面（電子郵件或LINE官方帳號）通知甲方，經甲方書面同意後方可延租。延租費用依第三條規定計算。<br/>
        3. <b>最長租期：</b> 本契約單次租期不得超過30日。超過30日，乙方需與甲方重新簽訂新契約。<br/>
        <b>第三條 租金與押金</b><br/>
        1. <b>租金：</b> 每日租金NT$500，乙方應於設備交付時以現金或電子支付方式一次付清全額租金，或依雙方書面約定按日結算。<br/>
        2. <b>押金方案（擇一）：</b><br/>
        &nbsp;&nbsp;- <b>高押金模式（免證件）：</b> 乙方支付押金NT$30,000，於設備交付時以現金或電子支付方式繳納。<br/>
        &nbsp;&nbsp;- <b>低押金模式（需證件及預授權）：</b><br/>
        &nbsp;&nbsp;&nbsp;&nbsp;乙方提供中華民國身分證及第二證件（健保卡或駕照）正本供甲方驗證並留存影本。<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;押金NT$3,000，於設備交付時以現金或電子支付方式繳納。<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;信用卡預授權NT$30,000，於設備交付時完成授權，僅於設備損壞、遺失或違約時扣款。<br/>
        3. <b>退還時限：</b> 租期結束且設備經甲方驗收無損壞或遺失後，押金及預授權將於3個工作日內全額退還或解除。<br/>
        <b>第四條 設備交付與歸還</b><br/>
        1. <b>交付程序：</b> 甲乙雙方於交付時共同檢查設備外觀、功能及配件，簽署《設備交付確認單》（附件二），並拍照存證（包含螢幕、機身、配件完整性）。<br/>
        2. <b>歸還驗收：</b> 乙方應於租期結束當日親自或委託快遞將設備歸還至甲方指定地點。甲方依《損害賠償參考表》（附件一）檢查設備並計算賠償（如適用）。<br/>
        3. <b>逾期處理：</b><br/>
        &nbsp;&nbsp;- 逾期未歸還，每日加收租金NT$500。<br/>
        &nbsp;&nbsp;- 逾期超過3日未歸還，視為設備遺失，甲方將扣除全額押金或預授權金額，並保留向乙方追償損失的權利。<br/>
        4. <b>損壞或遺失賠償：</b> 乙方應賠償設備維修或重置費用（依附件一），並支付營業損失補償（每日NT$500，最高15日，計NT$7,500）。<br/>
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
        3. <b>甲方聯繫方式：</b> 02-8252-7208，電子郵件：example@company.com，地址：台北市板橋區文化路二段385之3號<br/>
        <b>簽署欄位</b><br/>
        甲方簽章：____________________　日期：{order[2]}<br/>
        乙方簽章：____________________　日期：{order[2]}<br/>
        <b>附件一：損害賠償參考表</b><br/>
        - 螢幕破裂：NT$10,000（三星原廠維修費用）<br/>
        - 電池損壞：NT$4,000（三星原廠更換費用）<br/>
        - 設備遺失：NT$34,900（依三星Galaxy S25 Ultra市場零售價）<br/>
        - 配件遺失：<br/>
        &nbsp;&nbsp;- 原廠USB-C充電線：NT$800<br/>
        &nbsp;&nbsp;- 原廠保護殼：NT$1,000<br/>
        &nbsp;&nbsp;- 原廠盒裝：NT$500<br/>
        - 其他損壞：依三星原廠授權維修中心報價單計算。<br/>
        <b>附件二：設備交付確認單</b><br/>
        - 設備型號：三星Galaxy S25 Ultra<br/>
        - IMEI序號：{order[1]}<br/>
        - 交付日期：{order[2]}<br/>
        - 初始狀況：電池健康度95%，外觀無瑕疵，功能正常<br/>
        - 配件清單：原廠USB-C充電線、原廠盒裝、原廠保護殼（若提供）<br/>
        - 甲方簽章：____________________　乙方簽章：____________________<br/>
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

function splitBase64(base64: string, maxSize: number) {
  const header = base64.substring(0, base64.indexOf(',') + 1);
  const data = base64.substring(base64.indexOf(',') + 1);
  const chunks = [];
  for (let i = 0; i < data.length; i += maxSize) {
    chunks.push(header + data.substring(i, i + maxSize));
  }
  return chunks;
} 