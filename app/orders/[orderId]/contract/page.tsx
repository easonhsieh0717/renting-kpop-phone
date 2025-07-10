"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
// @ts-ignore
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
// import '../../../../../public/NotoSansTC-normal.js'; // 改為動態載入
import FloatingButtons from '@/components/FloatingButtons';
// import { getPhoneById } from '@/lib/sheets/phones'; // 改為API調用

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
  const steps = ["手機外觀", "證件拍照", "個人資料/押金", "保證金處理", "合約簽署"];
  return (
    <div className="flex items-center mb-6">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-white ${step === i + 1 ? 'bg-blue-600' : 'bg-gray-400'}`}>{i + 1}</div>
          <div className="ml-2 mr-4 text-sm font-medium" style={{ color: step === i + 1 ? '#2563eb' : '#374151' }}>{s}</div>
          {i < steps.length - 1 && <div className="w-8 h-1 bg-gray-300" />}
        </div>
      ))}
    </div>
  );
}

// 合約條款渲染（正式版，動態帶入步驟三資訊）
function renderContract(order: any, depositMode: string | null, needCable: boolean, needCharger: boolean, idNumber: string, phoneNumber: string, depositAmount: number = 30000, phoneDepositAmount: number = 30000) {
  const today = new Date();
  const formatDate = (d: Date) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  
  // 統一的字體樣式
  const fontStyle = {
    fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
    color: '#000000',
    fontSize: '16px',
    lineHeight: '1.6',
    WebkitFontSmoothing: 'antialiased' as const,
    MozOsxFontSmoothing: 'grayscale' as const,
    textRendering: 'optimizeLegibility' as const
  };
  
  const boldStyle = {
    ...fontStyle,
    fontWeight: 'bold' as const
  };
  
  const titleStyle = {
    ...fontStyle,
    fontWeight: 'bold' as const,
    fontSize: '20px',
    marginBottom: '16px'
  };
  
  return (
    <div style={{...fontStyle, padding: '20px', backgroundColor: '#ffffff'}}>
      <div style={titleStyle}>
        三星Galaxy S25 Ultra手機租賃契約書
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>第一條 租賃標的</span><br/>
        <span style={fontStyle}>1. </span><span style={boldStyle}>出租人（甲方）：</span><span style={fontStyle}> 愛時代國際股份有限公司</span><br/>
        <span style={fontStyle}>2. </span><span style={boldStyle}>承租人（乙方）：</span><span style={fontStyle}> {order[5]}</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- </span><span style={boldStyle}>身分證字號：</span><span style={fontStyle}> {idNumber || '尚未填寫'}</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- </span><span style={boldStyle}>聯絡電話：</span><span style={fontStyle}> {phoneNumber || '尚未填寫'}</span><br/>
        <span style={fontStyle}>3. </span><span style={boldStyle}>租賃設備：</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 手機品牌與型號：三星Galaxy S25 Ultra</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- IMEI序號：{order[1]}</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 配件：原廠USB-C充電線、專用保護殼</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 初始狀況：外觀無明顯刮痕、無凹陷、無裂痕，功能正常，有特別狀態以照片拍攝為準</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 清潔要求：乙方應保持設備清潔，歸還時不得有污漬、異味或損壞，否則甲方將收取清潔費用NT$500，於押金或預授權中扣除。</span><br/>
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>第二條 租賃期間</span><br/>
        <span style={fontStyle}>1. </span><span style={boldStyle}>租期：</span><span style={fontStyle}> 自{order[2]}起至{order[3]}止。</span><br/>
        <span style={fontStyle}>2. </span><span style={boldStyle}>延租申請：</span><span style={fontStyle}> 乙方需於租期結束前24小時以書面（電子郵件或LINE官方帳號）通知甲方，經甲方書面同意後方可延租。延租費用依第三條規定計算。</span><br/>
        <span style={fontStyle}>3. </span><span style={boldStyle}>最長租期：</span><span style={fontStyle}> 本契約單次租期不得超過30日。超過30日，乙方需與甲方重新簽訂新契約。</span><br/>
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>第三條 租金與押金</span><br/>
        <span style={fontStyle}>1. </span><span style={boldStyle}>租金：</span><span style={fontStyle}> 每日租金NT$600，乙方應於設備交付時以現金或電子支付方式一次付清全額租金，或依雙方書面約定按日結算。</span><br/>
        <span style={fontStyle}>2. </span><span style={boldStyle}>押金方案（已選擇）：</span><br/>
        {depositMode === 'high' && (
          <>
            <span style={fontStyle}>&nbsp;&nbsp;</span><span style={boldStyle}>高押金模式（免證件）</span><br/>
            <span style={fontStyle}>&nbsp;&nbsp;- 押金金額：NT${depositAmount.toLocaleString()}（現金）</span><br/>
            <span style={fontStyle}>&nbsp;&nbsp;- 繳納方式：設備交付時以現金繳納</span><br/>
            <span style={fontStyle}>&nbsp;&nbsp;- 證件要求：無需提供身分證件</span><br/>
          </>
        )}
        {depositMode === 'low' && (
          <>
            <span style={fontStyle}>&nbsp;&nbsp;</span><span style={boldStyle}>低押金模式（需證件正本）：</span><br/>
            <span style={fontStyle}>&nbsp;&nbsp;- 押金金額：NT$3,000（現金）</span><br/>
            <span style={fontStyle}>&nbsp;&nbsp;- 繳納方式：設備交付時以現金繳納</span><br/>
            <span style={fontStyle}>&nbsp;&nbsp;- 證件要求：需提供身分證/護照/駕照正本，三選一</span><br/>
          </>
        )}
        {depositMode === 'preauth' && (
          <>
            <span style={fontStyle}>&nbsp;&nbsp;</span><span style={boldStyle}>預授權模式（需證件正本核對）：</span><br/>
            <span style={fontStyle}>&nbsp;&nbsp;- 預授權金額：NT${depositAmount.toLocaleString()}（信用卡）</span><br/>
            <span style={fontStyle}>&nbsp;&nbsp;- 繳納方式：設備交付前完成信用卡預授權</span><br/>
            <span style={fontStyle}>&nbsp;&nbsp;- 證件要求：無需提供身分證件</span><br/>
          </>
        )}
        <span style={fontStyle}>3. </span><span style={boldStyle}>押金退還：</span><span style={fontStyle}> 設備歸還且驗收無誤後，甲方於24小時內退還押金或解除預授權。</span><br/>
      </div>
      
      {/* 繼續其他條款 - 使用相同的內聯樣式模式 */}
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>第四條 設備交付與歸還</span><br/>
        <span style={fontStyle}>1. </span><span style={boldStyle}>交付程序：</span><span style={fontStyle}> 甲乙雙方於交付時共同檢查設備外觀、功能及配件，簽署《設備交付確認單》（附件二），並拍照存證（包含螢幕、機身、配件完整性）。</span><br/>
        <span style={fontStyle}>2. </span><span style={boldStyle}>歸還驗收：</span><span style={fontStyle}> 乙方應於租期結束當日親自或委託快遞將設備歸還至甲方指定地點。甲方依《損害賠償參考表》（附件一）檢查設備並計算賠償（如適用）。</span><br/>
        <span style={fontStyle}>3. </span><span style={boldStyle}>逾期處理：</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 逾期未歸還，每日加收租金NT$600。</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 逾期超過3日未歸還，視為設備遺失，甲方將扣除全額押金或預授權金額，並保留向乙方追償損失的權利。</span><br/>
        <span style={fontStyle}>4. </span><span style={boldStyle}>損壞或遺失賠償：</span><span style={fontStyle}> 乙方應賠償設備維修或重置費用（依附件一），並支付營業損失補償（每日NT$600，最高15日，計NT$9,000）。</span><br/>
        <span style={fontStyle}>5. </span><span style={boldStyle}>爭議處理：</span><span style={fontStyle}> 若對設備狀況有爭議，雙方同意委託三星原廠授權維修中心進行鑑定，鑑定費用由爭議發起方預付，鑑定結果為最終依據。</span><br/>
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>第五條 雙方責任</span><br/>
        <span style={fontStyle}>1. </span><span style={boldStyle}>甲方責任：</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 保證設備於交付時功能正常，已完成清潔及消毒（符合衛生署標準）。</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 若設備因非人為因素故障，甲方提供同型號備用設備或退還剩餘租金。</span><br/>
        <span style={fontStyle}>2. </span><span style={boldStyle}>乙方責任：</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 妥善保管及使用設備，不得拆解、轉租、刷機、越獄或安裝未經授權軟體。</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 因乙方疏失導致設備損壞或遺失，乙方負全額賠償責任（依附件一）。</span><br/>
        <span style={fontStyle}>3. </span><span style={boldStyle}>不可抗力：</span><span style={fontStyle}> 因天災、戰爭等不可抗力導致設備無法使用或歸還，雙方免責。乙方需於事件發生後24小時內以書面或電子方式通知甲方，雙方協商後續處理。</span><br/>
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>第六條 證件與個人資料管理</span><br/>
        <span style={fontStyle}>1. 低押金模式下，乙方提供身分證及第二證件影本，甲方僅用於本契約身分驗證及履約管理。</span><br/>
        <span style={fontStyle}>2. 甲方依《個人資料保護法》採取加密儲存及限制存取措施，確保乙方個人資料安全。若違反，甲方負法律責任。</span><br/>
        <span style={fontStyle}>3. 租期結束後7日內，甲方銷毀乙方證件影本或歸還正本。乙方有權要求甲方提供書面銷毀證明。</span><br/>
      </div>
      
      {depositMode === 'preauth' && (
        <div style={{marginBottom: '16px'}}>
          <span style={boldStyle}>第七條 預授權規範</span><br/>
          <span style={fontStyle}>1. 預授權模式下，乙方於交付設備前以信用卡完成NT${depositAmount.toLocaleString()}預授權。</span><br/>
          <span style={fontStyle}>2. 設備歸還且驗收無誤後，甲方於3個工作日內解除預授權。</span><br/>
          <span style={fontStyle}>3. 若設備未歸還、損壞或違約，甲方得依附件一執行扣款，並提供扣款明細。</span><br/>
          <span style={fontStyle}>4. 乙方對扣款有異議，應於收到扣款通知後7日內提出，甲方應提供證明文件（包含維修報價單或鑑定報告）。</span><br/>
        </div>
      )}
      
      {depositMode === 'low' && (
        <div style={{marginBottom: '16px'}}>
          <span style={boldStyle}>第七條 證件抵押規範</span><br/>
          <span style={fontStyle}>1. 低押金模式下，乙方需提供身分證/護照/駕照正本作為抵押。</span><br/>
          <span style={fontStyle}>2. 甲方依《個人資料保護法》妥善保管乙方證件，僅用於本契約履約管理。</span><br/>
          <span style={fontStyle}>3. 設備歸還且驗收無誤後，甲方立即歸還身分證/護照/駕照正本。</span><br/>
          <span style={fontStyle}>4. 若設備未歸還、損壞或違約，甲方得扣除押金並保留證件，直至爭議解決。</span><br/>
        </div>
      )}
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>第八條 違約與解約</span><br/>
        <span style={fontStyle}>1. </span><span style={boldStyle}>乙方違約情事：</span><span style={fontStyle}> 包括但不限於逾期未歸還、設備遺失、未經同意轉租、故意損壞設備。甲方得終止契約，扣除押金或預授權，並保留追償權利。</span><br/>
        <span style={fontStyle}>2. </span><span style={boldStyle}>爭議解決：</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 雙方應以協商為原則解決爭議。</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 協商不成，提交中華民國消費者保護委員會或第三方調解機構調解。</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 調解不成，以台灣台北地方法院為第一審管轄法院。</span><br/>
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>第九條 契約效力</span><br/>
        <span style={fontStyle}>1. 本契約依據《中華民國民法》及《消費者保護法》制定，屬定型化契約。</span><br/>
        <span style={fontStyle}>2. 乙方於簽署前享有5日審閱期，簽署即表示同意全部條款。</span><br/>
        <span style={fontStyle}>3. 本契約以中文為準，其他語言版本僅供參考。</span><br/>
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>第十條 契約份數與簽署</span><br/>
        <span style={fontStyle}>1. 本契約一式兩份，甲乙雙方各執一份，具同等法律效力。</span><br/>
        <span style={fontStyle}>2. 電子簽署依《電子簽章法》執行，與手寫簽署具同等效力。</span><br/>
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>第十一條 不可抗力與風險轉移</span><br/>
        <span style={fontStyle}>1. 因不可抗力（如地震、颱風、政府命令）導致設備無法使用或歸還，雙方免責。乙方需於事件發生後24小時內通知甲方，雙方協商後續處理。</span><br/>
        <span style={fontStyle}>2. 租賃期間設備毀損風險由乙方承擔，但因甲方提供瑕疵設備導致損失，由甲方負責賠償。</span><br/>
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>第十二條 通知方式</span><br/>
        <span style={fontStyle}>1. 所有通知（包括延租、違約、爭議）以書面（電子郵件或LINE）送達。</span><br/>
        <span style={fontStyle}>2. 乙方聯繫方式變更，應立即通知甲方，否則視為有效送達。</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 甲方聯繫方式：</span><span style={fontStyle}> 02-8252-7208，電子郵件：a0970580318@gmail.com，地址：台北市板橋區文化路二段385之3號</span><br/>
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>簽署欄位</span><br/>
        <span style={fontStyle}>甲方簽章：____________________　日期：{formatDate(today)}</span><br/>
        <span style={fontStyle}>乙方簽章：____________________　日期：{formatDate(today)}</span><br/>
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <span style={boldStyle}>附件一：損害賠償參考表</span><br/>
        <span style={fontStyle}>- 螢幕破裂：NT$6,400（以三星原廠最終維修報價為主）</span><br/>
        <span style={fontStyle}>- 電池損壞：NT$4,000（以三星原廠最終維修報價為主）</span><br/>
        <span style={fontStyle}>- 設備遺失：NT$43,900（依三星Galaxy S25 Ultra市場當日零售價為主）</span><br/>
        <span style={fontStyle}>- 配件遺失：</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 原廠USB-C充電線：NT$800</span><br/>
        <span style={fontStyle}>&nbsp;&nbsp;- 專用保護殼：NT$800</span><br/>
        <span style={fontStyle}>- 其他損壞：依三星原廠授權維修中心報價單計算。</span><br/>
      </div>
      
      {renderAttachment2(order, depositMode, needCable, needCharger, idNumber, phoneNumber)}
    </div>
  );
}

function renderAttachment2(order: any, depositMode: string | null, needCable: boolean, needCharger: boolean, idNumber: string, phoneNumber: string) {
  const today = new Date();
  
  // 統一的字體樣式
  const fontStyle = {
    fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
    color: '#000000',
    fontSize: '16px',
    lineHeight: '1.6',
    WebkitFontSmoothing: 'antialiased' as const,
    MozOsxFontSmoothing: 'grayscale' as const,
    textRendering: 'optimizeLegibility' as const
  };
  
  const boldStyle = {
    ...fontStyle,
    fontWeight: 'bold' as const
  };
  
  return (
    <div style={{
      ...fontStyle,
      marginTop: '16px',
      padding: '16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      backgroundColor: '#ffffff'
    }}>
      <span style={boldStyle}>附件二：設備交付確認單</span><br/>
      <span style={fontStyle}>- 承租人：{order[5]}</span><br/>
      <span style={fontStyle}>- 身分證字號：{idNumber || '尚未填寫'}</span><br/>
      <span style={fontStyle}>- 聯絡電話：{phoneNumber || '尚未填寫'}</span><br/>
      <span style={fontStyle}>- 設備型號：三星Galaxy S25 Ultra</span><br/>
      <span style={fontStyle}>- IMEI序號：{order[1]}</span><br/>
      <span style={fontStyle}>- 交付日期：{today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日</span><br/>
      <span style={fontStyle}>- 初始狀況：外觀無明顯刮痕、無凹陷、無裂痕，功能正常，有特別狀態以照片拍攝為準</span><br/>
      <span style={fontStyle}>- 配件清單：
        {needCharger && '原廠充電頭，'}
        {needCable && '原廠USB-C充電線，'}
        專用保護殼</span><br/>
      <span style={fontStyle}>- 押金模式：{depositMode === 'high' ? '高押金（免證件）' : depositMode === 'low' ? '低押金（需證件及預授權）' : '未選擇'}</span><br/>
      <span style={fontStyle}>- 甲方簽章：____________________　乙方簽章：____________________</span><br/>
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
  // 3. 押金/配件 + 個人資料
  const [depositMode, setDepositMode] = useState<string | null>(null);
  const [needCable, setNeedCable] = useState(false);
  const [needCharger, setNeedCharger] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processingIdFront, setProcessingIdFront] = useState(false);
  const [processingIdBack, setProcessingIdBack] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ front: 0, back: 0 });
  const [uploadStatus, setUploadStatus] = useState({ front: '', back: '' });
  // 4. 保證金處理
  const [depositAmount, setDepositAmount] = useState(30000);
  const [depositPaid, setDepositPaid] = useState(false);
  const [depositProcessing, setDepositProcessing] = useState(false);
  const [preauthLoading, setPreauthLoading] = useState(false);
  const [phoneDepositAmount, setPhoneDepositAmount] = useState(30000);

  // 身分證格式驗證
  const validateIdNumber = (id: string) => {
    return /^[A-Z][12][0-9]{8}$/.test(id);
  };
  
  // 手機號碼格式驗證
  const validatePhoneNumber = (phone: string) => {
    return /^09[0-9]{8}$/.test(phone);
  };

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetch(`/api/orders/${orderId}`)
      .then(res => res.json())
      .then(async data => {
        setOrder(data);
        
        // 讀取手機型號對應的押金金額
        const phoneModel = data[1]; // 手機型號在第2欄（索引1）
        if (phoneModel) {
          try {
            const phoneResponse = await fetch(`/api/phones/${encodeURIComponent(phoneModel)}`);
            const phoneResult = await phoneResponse.json();
            if (phoneResult.success && phoneResult.data && phoneResult.data.deposit) {
              setPhoneDepositAmount(phoneResult.data.deposit);
            }
          } catch (error) {
            console.error('讀取手機押金金額失敗:', error);
          }
        }
        
        // 檢查是否已簽署與是否有簽名圖
        if (data[13] === "已簽署" && data[14]) {
          setSigned(true);
          setSignatureUrl(data[14]);
        } else {
          setSigned(false);
          setSignatureUrl(null);
        }
        // 從Google Sheet讀取預授權金額（第19欄，索引19）
        const sheetDepositAmount = parseInt(data[19]) || 30000;
        setDepositAmount(sheetDepositAmount);
        
        // 檢查預授權狀態（第20欄，索引20）
        const depositStatus = data[20];
        if (depositStatus === 'HELD') {
          // 預授權已完成
          setDepositPaid(true);
          setDepositProcessing(false);
        } else if (data[18]) {
          // 有預授權交易號但狀態未確定，開始檢查狀態
          checkDepositStatusAfterReturn();
        }
        
        setLoading(false);
      })
      .catch(() => {
        setError("查無此訂單");
        setLoading(false);
      });
  }, [orderId]);

  // 檢查預授權狀態（用於頁面載入或返回時）
  const checkDepositStatusAfterReturn = async () => {
    try {
      setDepositProcessing(true);
      
      const statusResponse = await fetch(`/api/orders/${orderId}/deposit-status`);
      const statusResult = await statusResponse.json();
      
      if (statusResult.success && statusResult.status === 'HELD') {
        // 預授權成功
        setDepositPaid(true);
        setDepositProcessing(false);
        alert('🎉 預授權已完成！您現在可以繼續簽署合約。');
      } else if (statusResult.success && statusResult.status === 'PREAUTH_FAILED') {
        // 預授權失敗
        setDepositProcessing(false);
        alert('❌ 預授權失敗，請重新嘗試。');
      } else if (statusResult.data?.hasPreAuthTransaction) {
        // 有預授權交易但狀態不明，開始定期檢查
        alert('正在檢查您的預授權狀態，請稍候...');
        startPaymentStatusChecker();
      } else {
        setDepositProcessing(false);
      }
    } catch (error) {
      console.error('檢查預授權狀態失敗:', error);
      setDepositProcessing(false);
    }
  };

  // 開始付款狀態檢查器（提取為獨立函數）
  const startPaymentStatusChecker = () => {
    const checkPaymentStatus = async () => {
      try {
        const statusResponse = await fetch(`/api/orders/${orderId}/deposit-status`);
        const statusResult = await statusResponse.json();
        
        if (statusResult.success && statusResult.status === 'HELD') {
          // 預授權成功
          setDepositPaid(true);
          setDepositProcessing(false);
          setPreauthLoading(false);
          alert('🎉 預授權完成！您現在可以繼續簽署合約。');
          return true; // 停止檢查
        } else if (statusResult.success && statusResult.status === 'PREAUTH_FAILED') {
          // 預授權失敗
          setDepositProcessing(false);
          setPreauthLoading(false);
          alert('❌ 預授權失敗，請重新嘗試。');
          return true; // 停止檢查
        }
        return false; // 繼續檢查
      } catch (error) {
        console.error('檢查付款狀態失敗:', error);
        return false; // 繼續檢查
      }
    };

    // 立即檢查一次，然後每10秒檢查一次，最多檢查30次（5分鐘）
    let checkCount = 0;
    const maxChecks = 30;
    
    const statusChecker = setInterval(async () => {
      checkCount++;
      const shouldStop = await checkPaymentStatus();
      
      if (shouldStop || checkCount >= maxChecks) {
        clearInterval(statusChecker);
        if (checkCount >= maxChecks) {
          setDepositProcessing(false);
          setPreauthLoading(false);
          alert('⏰ 付款狀態檢查超時。\n\n如果您已完成付款，請重新整理頁面檢查狀態。\n如果仍有問題，請聯繫客服。');
        }
      }
    }, 10000); // 每10秒檢查一次

    // 立即檢查一次
    setTimeout(async () => {
      const shouldStop = await checkPaymentStatus();
      if (shouldStop) {
        clearInterval(statusChecker);
      }
    }, 2000); // 2秒後進行第一次檢查
  };

  useEffect(() => {
    // 進入合約頁即隱藏浮動按鈕，離開時恢復
    if (typeof window !== 'undefined') {
      const fb = document.querySelector('.fixed.bottom-6.right-6.z-50');
      if (fb) (fb as HTMLElement).style.display = 'none';
      
      // 檢查是否從付款頁面返回
      const savedUrl = sessionStorage.getItem('contractPageUrl');
      if (savedUrl && savedUrl === window.location.href) {
        // 清除保存的URL
        sessionStorage.removeItem('contractPageUrl');
        // 如果有預授權交易，會在頁面載入時自動檢查狀態
      }
      
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
          // 等待字體載入完成
          await document.fonts.ready;
          console.log('字體載入完成，開始生成PDF');
          
          try {
            // 多頁正確分頁：每頁用 transform 位移內容
            const pageHeight = 1122; // px, A4
            const totalHeight = contractNode.scrollHeight;
            const pdf = new jsPDF({ unit: 'px', format: 'a4' });
            let rendered = 0;
            let pageNum = 0;
            
            console.log('合約總高度:', totalHeight);
            
            while (rendered < totalHeight) {
              const pageDiv = document.createElement('div');
              pageDiv.style.width = contractNode.offsetWidth + 'px';
              pageDiv.style.height = pageHeight + 'px';
              pageDiv.style.overflow = 'hidden';
              pageDiv.style.backgroundColor = '#ffffff';
              
              // 只顯示本頁內容
              const inner = contractNode.cloneNode(true) as HTMLElement;
              inner.style.transform = `translateY(-${rendered}px)`;
              pageDiv.appendChild(inner);
              document.body.appendChild(pageDiv);
              
              // 等待渲染完成
              await new Promise(resolve => setTimeout(resolve, 300));
              
              console.log(`渲染第 ${pageNum + 1} 頁`);
              
              // 使用統一的高品質設定
              const canvas = await html2canvas(pageDiv, {
                scale: 2.5,
                useCORS: true,
                backgroundColor: '#ffffff',
                allowTaint: false,
                foreignObjectRendering: false,
                logging: false,
                width: pageDiv.offsetWidth,
                height: pageHeight,
                removeContainer: true,
                imageTimeout: 3000
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
            let allUploadsSuccessful = true;
            
            for (let i = 0; i < chunks.length; i++) {
              console.log('PDF upload part', i + 1, 'size', chunks[i].length);
              const uploadResponse = await fetch(`/api/orders/${orderId}/upload?part=${i + 1}&total=${chunks.length}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: chunks[i], type: 'pdf' })
              });
              
              if (!uploadResponse.ok) {
                allUploadsSuccessful = false;
                console.error(`PDF upload part ${i + 1} failed:`, uploadResponse.status);
                break;
              }
            }
            
            if (allUploadsSuccessful) {
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
    
    try {
      const arr = await Promise.all(files.map(f => toBase64(f)));
      setPhotos([...photos, ...arr]);
      
      // 使用優化的上傳函數，逐個上傳
      for (let i = 0; i < files.length; i++) {
        console.log(`開始上傳第 ${i + 1} 張外觀照片...`);
        
        // 超級激進壓縮：目標 150KB（適合行動網路）
        let compressed = await smartCompressImage(arr[i], 150 * 1024); // 150KB 超小目標
        
        // 使用簡單的重試上傳（外觀照片不分片）
        let uploadSuccess = false;
        for (let attempt = 1; attempt <= 5; attempt++) { // 增加重試次數
          try {
            const response = await fetch(`/api/orders/${orderId}/upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                file: compressed, 
                type: 'photo', 
                name: `外觀${photos.length + i + 1}` 
              })
            });
            
            if (response.ok) {
              console.log(`第 ${i + 1} 張外觀照片上傳成功`);
              uploadSuccess = true;
              break;
            } else {
              throw new Error(`HTTP ${response.status}`);
            }
          } catch (error) {
            console.warn(`第 ${i + 1} 張外觀照片第 ${attempt} 次上傳失敗:`, error);
            if (attempt < 5) {
              await new Promise(resolve => setTimeout(resolve, 1500 * attempt)); // 延長等待時間
            }
          }
        }
        
        if (!uploadSuccess) {
          alert(`第 ${i + 1} 張外觀照片上傳失敗，請稍後重試`);
        }
      }
    } catch (error) {
      console.error('外觀照片處理失敗:', error);
      alert('外觀照片處理失敗，請重新選擇');
    }
  };
  const handlePhotoRemove = (idx: number) => setPhotos(photos.filter((_, i) => i !== idx));

  // 預授權處理
  const handlePreauth = async () => {
    if (preauthLoading) return;
    setPreauthLoading(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          depositAmount: depositAmount, // 修正：傳入正確的金額
          clientBackURL: window.location.href // 傳送當前頁面URL
        })
      });
      const result = await response.json();

      if (result.success) {
        // 檢測是否為手機裝置
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
          // 手機版：顯示付款說明，然後直接跳轉
          if (confirm('即將跳轉到付款頁面，付款完成後請點選「回到商店」回到此頁面。\n\n重要提醒：\n1. 請記住目前的網址以便返回\n2. 付款完成後點選「回到商店」\n3. 或直接開啟新分頁保存此頁面\n\n確定要繼續嗎？')) {
            // 儲存當前頁面URL到sessionStorage，方便用戶返回
            const currentUrl = window.location.href;
            sessionStorage.setItem('contractPageUrl', currentUrl);
            
            // 手機版：直接在同一視窗跳轉到ECPay
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = result.ecpayUrl;
            // 不設定target，直接在同一視窗跳轉

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
            
            // 注意：這裡不能設定setDepositProcessing(true)，因為頁面會跳轉
          } else {
            setPreauthLoading(false);
            return;
          }
        } else {
          // 電腦版：在新分頁開啟
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = result.ecpayUrl;
          form.target = '_blank';

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
          
          // 顯示等待付款狀態
          setDepositProcessing(true);
          alert('付款頁面已在新分頁開啟，請完成付款。\n\n此頁面將開始檢查付款狀態...');
          
          // 開始檢查付款狀態
          startPaymentStatusChecker();
        }
      } else {
        setDepositProcessing(false);
        alert(`預授權失敗: ${result.message}`);
      }
    } catch (error) {
      setDepositProcessing(false);
      alert(`預授權失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setPreauthLoading(false);
    }
  };

  // 改进的文件上传函数 - 支持分片上传和更好的重试策略
  const uploadFileWithChunks = async (
    base64Data: string, 
    type: 'id', 
    name: string,
    onProgress: (progress: number) => void,
    onStatus: (status: string) => void
  ) => {
    const maxChunkSize = 800 * 1024; // 800KB 分片大小，進一步降低傳輸量確保穩定
    const maxRetries = 5; // 增加重试次数
    const baseDelay = 1000; // 基础延迟时间

    onStatus('準備上傳檔案...');
    
    // 暫時停用分片上傳，直接上傳（已壓縮的檔案）
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        onStatus(`第 ${attempt} 次上傳嘗試...`);
        onProgress(Math.min(20 * attempt, 80)); // 顯示進度
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超時
        
        const response = await fetch(`/api/orders/${orderId}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64Data, type, name }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        onProgress(100);
        onStatus('上傳成功！');
        return true;
        
      } catch (error) {
        console.warn(`第 ${attempt} 次上傳失敗:`, error);
        
        if (attempt < maxRetries) {
          // 指數退避策略：每次重試等待時間翻倍
          const delay = baseDelay * Math.pow(2, attempt - 1);
          onStatus(`上傳失敗，${delay/1000}秒後重試...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('上傳失敗，已重試 ' + maxRetries + ' 次');
  };

  // 改进的图片压缩函数 - 添加解析度調整功能
  const smartCompressImage = async (base64: string, targetMaxSize: number = 200 * 1024): Promise<string> => {
    console.log(`開始智能壓縮，原始大小: ${(base64.length / 1024).toFixed(2)}KB，目標: ${(targetMaxSize / 1024).toFixed(2)}KB`);
    
    // 第一步：調整解析度（像 LINE App 一樣限制解析度）
    let resized = await resizeImage(base64, 1200); // 限制最大寬度/高度 1200px
    console.log(`解析度調整完成，大小: ${(resized.length / 1024).toFixed(2)}KB`);
    
    // 第二步：品質壓縮
    let quality = 0.8;
    let compressed = resized;
    let attempts = 0;
    const maxAttempts = 12; // 增加壓縮嘗試次數

    while (compressed.length > targetMaxSize && attempts < maxAttempts && quality > 0.1) {
      compressed = await compressImage(compressed, quality);
      quality -= 0.05; // 更細緻的品質調整
      attempts++;
      console.log(`壓縮第${attempts}次，品質: ${quality.toFixed(2)}, 大小: ${(compressed.length / 1024).toFixed(2)}KB`);
    }

    console.log(`壓縮完成，最終大小: ${(compressed.length / 1024).toFixed(2)}KB，壓縮率: ${((1 - compressed.length / base64.length) * 100).toFixed(1)}%`);
    return compressed;
  };

  // 新增：解析度調整函數（模擬 LINE App 的低解析度相機）
  const resizeImage = async (base64: string, maxSize: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64);
        
        // 計算新尺寸（保持比例，限制最大邊）
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 使用高品質重採樣
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        const resized = canvas.toDataURL('image/jpeg', 0.9);
        console.log(`解析度調整：${img.width}x${img.height} → ${width}x${height}`);
        resolve(resized);
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  // 证件拍照（正面）- 超級優化版本
  const handleIdFront = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    // 放宽文件大小限制到 10MB，但会超級激進壓縮
    if (file.size > 10 * 1024 * 1024) {
      alert('文件过大，请选择小于 10MB 的图片');
      return;
    }
    
    setProcessingIdFront(true);
    setUploadProgress(prev => ({ ...prev, front: 0 }));
    setUploadStatus(prev => ({ ...prev, front: '开始处理...' }));
    
    try {
      console.log('开始处理证件正面...', `文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      
      // 1. 转换为 base64
      setUploadStatus(prev => ({ ...prev, front: '读取文件...' }));
      let base64 = await toBase64(file);
      console.log('原始 base64 长度:', base64.length);
      
      // 2. 超級激進壓縮（150KB 目標）
      setUploadStatus(prev => ({ ...prev, front: '超級壓縮中...' }));
      base64 = await smartCompressImage(base64, 150 * 1024); // 150KB 目標
      console.log('压缩后 base64 长度:', base64.length);
      
      // 3. 加浮水印（降级处理）
      let watermarked = base64;
      try {
        setUploadStatus(prev => ({ ...prev, front: '添加浮水印...' }));
        watermarked = await addWatermark(base64, `仅限手机租赁使用 ${new Date().toLocaleString('zh-TW', { hour12: false })}`);
        console.log('浮水印处理完成');
      } catch (watermarkError) {
        console.warn('浮水印处理失败，使用原图:', watermarkError);
        // 降级：浮水印失败不影响上传
      }
      
      // 4. 上传文件
      await uploadFileWithChunks(
        watermarked, 
        'id', 
        '证件正面',
        (progress) => setUploadProgress(prev => ({ ...prev, front: progress })),
        (status) => setUploadStatus(prev => ({ ...prev, front: status }))
      );
      
      // 5. 显示成功
      setIdFront(watermarked);
      setUploadStatus(prev => ({ ...prev, front: '✅ 上传成功' }));
      
    } catch (err) {
      console.error('证件正面处理失败:', err);
      setUploadStatus(prev => ({ ...prev, front: '❌ 上传失败' }));
      
      // 更友好的错误信息
      let errorMessage = '证件正面上传失败';
      if (err instanceof Error) {
        if (err.message.includes('abort')) {
          errorMessage += '：上传超时，请检查网络连接后重试';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage += '：网络连接中断，请重试';
        } else if (err.message.includes('PAYLOAD_TOO_LARGE')) {
          errorMessage += '：文件过大，请重新拍照或选择更小的图片';
        } else {
          errorMessage += `：${err.message}`;
        }
      }
      alert(errorMessage);
    } finally {
      setProcessingIdFront(false);
    }
  };
  
  // 证件拍照（反面）- 超級優化版本  
  const handleIdBack = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    if (!idFront) {
      alert('请先完成证件正面拍照');
      return;
    }
    
    const file = e.target.files[0];
    
    if (file.size > 10 * 1024 * 1024) {
      alert('文件过大，请选择小于 10MB 的图片');
      return;
    }
    
    setProcessingIdBack(true);
    setUploadProgress(prev => ({ ...prev, back: 0 }));
    setUploadStatus(prev => ({ ...prev, back: '开始处理...' }));
    
    try {
      console.log('开始处理证件反面...', `文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      
      // 1. 转换为 base64
      setUploadStatus(prev => ({ ...prev, back: '读取文件...' }));
      let base64 = await toBase64(file);
      console.log('原始 base64 长度:', base64.length);
      
      // 2. 超級激進壓縮（150KB 目標）
      setUploadStatus(prev => ({ ...prev, back: '超級壓縮中...' }));
      base64 = await smartCompressImage(base64, 150 * 1024); // 150KB 目標
      console.log('压缩后 base64 长度:', base64.length);
      
      // 3. 加浮水印（降级处理）
      let watermarked = base64;
      try {
        setUploadStatus(prev => ({ ...prev, back: '添加浮水印...' }));
        watermarked = await addWatermark(base64, `仅限手机租赁使用 ${new Date().toLocaleString('zh-TW', { hour12: false })}`);
        console.log('浮水印处理完成');
      } catch (watermarkError) {
        console.warn('浮水印处理失败，使用原图:', watermarkError);
        // 降级：浮水印失败不影响上传
      }
      
      // 4. 上传文件
      await uploadFileWithChunks(
        watermarked, 
        'id', 
        '证件反面',
        (progress) => setUploadProgress(prev => ({ ...prev, back: progress })),
        (status) => setUploadStatus(prev => ({ ...prev, back: status }))
      );
      
      // 5. 显示成功
      setIdBack(watermarked);
      setUploadStatus(prev => ({ ...prev, back: '✅ 上传成功' }));
      
    } catch (err) {
      console.error('证件反面处理失败:', err);
      setUploadStatus(prev => ({ ...prev, back: '❌ 上传失败' }));
      
      // 更友好的错误信息
      let errorMessage = '证件反面上传失败';
      if (err instanceof Error) {
        if (err.message.includes('abort')) {
          errorMessage += '：上传超时，请检查网络连接后重试';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage += '：网络连接中断，请重试';
        } else if (err.message.includes('PAYLOAD_TOO_LARGE')) {
          errorMessage += '：文件过大，请重新拍照或选择更小的图片';
        } else {
          errorMessage += `：${err.message}`;
        }
      }
      alert(errorMessage);
    } finally {
      setProcessingIdBack(false);
    }
  };

  // 步驟切換
  const canNext1 = photos.length >= 2;
  const canNext2 = !!idFront && !!idBack;
  const canNext3 = !!depositMode && validateIdNumber(idNumber) && validatePhoneNumber(phoneNumber);
  const canNext4 = depositMode === 'preauth' ? depositPaid : true; // 預授權模式需完成付款，其他模式直接通過

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
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleIdFront} 
              className="mb-2" 
              disabled={processingIdFront}
            />
            {processingIdFront && (
              <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-blue-800 text-sm">{uploadStatus.front}</span>
                </div>
                {uploadProgress.front > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress.front}%` }}
                    ></div>
                  </div>
                )}
                {uploadProgress.front > 0 && (
                  <div className="text-xs text-gray-600 mt-1">{uploadProgress.front}% 完成</div>
                )}
              </div>
            )}
            {idFront && <img src={idFront} alt="證件正面" className="w-64 h-40 object-contain border rounded mb-2" />}
          </div>
          <div className="mb-2">
            <label className="block mb-1">上傳反面：</label>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleIdBack} 
              className="mb-2" 
              disabled={processingIdBack || !idFront}
            />
            {processingIdBack && (
              <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-blue-800 text-sm">{uploadStatus.back}</span>
                </div>
                {uploadProgress.back > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress.back}%` }}
                    ></div>
                  </div>
                )}
                {uploadProgress.back > 0 && (
                  <div className="text-xs text-gray-600 mt-1">{uploadProgress.back}% 完成</div>
                )}
              </div>
            )}
            {!idFront && (
              <div className="mb-2 p-2 bg-gray-100 border border-gray-300 rounded text-gray-500 text-sm">
                請先完成證件正面拍照
              </div>
            )}
            {idBack && <img src={idBack} alt="證件反面" className="w-64 h-40 object-contain border rounded mb-2" />}
          </div>
          <button onClick={() => { 
            setIdFront(null); 
            setIdBack(null); 
            setUploadProgress({ front: 0, back: 0 });
            setUploadStatus({ front: '', back: '' });
          }} className="px-3 py-1 text-sm bg-gray-200 rounded mr-2">重拍</button>
          <button disabled={!canNext2} onClick={() => setStep(3)} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300">下一步</button>
        </div>
      )}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-bold mb-2">3. 填寫個人資料、選擇押金模式與配件</h2>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-3 text-blue-800">請填寫個人資料</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="idNumber" className="block text-sm font-medium text-gray-700 mb-1">身分證字號 *</label>
                <input 
                  type="text" 
                  id="idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                  placeholder="例：A123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={10}
                  pattern="[A-Z][12][0-9]{8}"
                  required
                />
              </div>
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">手機號碼 *</label>
                <input 
                  type="tel" 
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="例：0912345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={10}
                  pattern="09[0-9]{8}"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              * 此資料將記錄於合約中，作為身分識別使用
            </p>
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">押金模式說明：</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start">
                <input type="radio" id="high" checked={depositMode==='high'} onChange={()=>setDepositMode('high')} className="mt-1 mr-2" />
                <label htmlFor="high" className="flex-1">
                  <span className="font-medium">🏦 高押金模式（免證件）：</span>
                  <br/>
                  <span className="text-gray-900">現金 NT${phoneDepositAmount.toLocaleString()}，無需提供身分證件</span>
                </label>
              </div>
              <div className="flex items-start">
                <input type="radio" id="low" checked={depositMode==='low'} onChange={()=>setDepositMode('low')} className="mt-1 mr-2" />
                <label htmlFor="low" className="flex-1">
                  <span className="font-medium">💳 低押金模式（需證件正本）：</span>
                  <br/>
                  <span className="text-gray-900">現金 NT$3,000 + 身分證/護照/駕照正本，三選一</span>
                </label>
              </div>
              <div className="flex items-start">
                <input type="radio" id="preauth" checked={depositMode==='preauth'} onChange={()=>setDepositMode('preauth')} className="mt-1 mr-2" />
                <label htmlFor="preauth" className="flex-1">
                  <span className="font-medium">🔒 預授權模式（需證件正本核對）：</span>
                  <br/>
                  <span className="text-gray-900">信用卡預授權 NT$30,000，需核對證件正本</span>
                </label>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <h3 className="font-semibold mb-2">配件需求：</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" checked={needCable} onChange={e=>setNeedCable(e.target.checked)} className="mr-2" />
                <span className="text-gray-900">需要傳輸線（如損壞NT$800）</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={needCharger} onChange={e=>setNeedCharger(e.target.checked)} className="mr-2" />
                <span className="text-gray-900">需要充電頭（如損壞NT$800）</span>
              </label>
            </div>
          </div>
          <button disabled={!canNext3} onClick={() => setStep(4)} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300">下一步</button>
        </div>
      )}
      {step === 4 && (
        <div>
          <h2 className="text-lg font-bold mb-4">4. 保證金處理</h2>
          
          {depositMode === 'preauth' && (
            <div className="mb-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <h3 className="font-semibold text-green-800 mb-2">🔒 預授權模式</h3>
                <p className="text-green-700 text-sm mb-3">
                  您選擇了預授權模式，需要完成信用卡預授權才能繼續簽署合約。
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">預授權金額</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">NT$</span>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(parseInt(e.target.value) || 30000)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                      min="1000"
                      max="50000"
                      step="1000"
                    />
                    <button
                      onClick={() => setDepositAmount(30000)}
                      className="px-3 py-1 text-xs bg-gray-200 rounded"
                    >
                      重設為30000
                    </button>
                  </div>
                </div>

                {!depositPaid ? (
                  <button
                    onClick={handlePreauth}
                    disabled={depositProcessing}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {depositProcessing ? '處理中...' : '開始預授權刷卡'}
                  </button>
                ) : (
                  <div className="text-green-600 font-medium">
                    ✅ 預授權完成（NT${depositAmount}）
                  </div>
                )}

                {depositProcessing && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-blue-800 text-sm">預授權處理中，請在新開啟的視窗完成刷卡...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {depositMode === 'high' && (
            <div className="mb-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">🏦 高押金模式</h3>
                <p className="text-blue-700 text-sm mb-3">
                  請收取客戶現金押金 NT${depositAmount.toLocaleString()}
                </p>
                <button
                  onClick={() => setDepositPaid(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  確認已收取現金押金
                </button>
              </div>
            </div>
          )}

          {depositMode === 'low' && (
            <div className="mb-6">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">💳 低押金模式</h3>
                <p className="text-purple-700 text-sm mb-3">
                  請收取客戶現金押金 NT$3,000 + 身分證/護照/駕照正本
                </p>
                <button
                  onClick={() => setDepositPaid(true)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  確認已收取押金與證件
                </button>
              </div>
            </div>
          )}

          <button 
            disabled={!canNext4} 
            onClick={() => setStep(5)} 
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300"
          >
            下一步（簽署合約）
          </button>
        </div>
      )}
      {step === 5 && (
        <div>
          <div className="mb-8">
            {renderContract(order, depositMode, needCable, needCharger, idNumber, phoneNumber, depositAmount, phoneDepositAmount)}
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
        
        // 根據圖片解析度自動計算字體大小
        let fontSize;
        
        // 計算圖片的總像素數
        const totalPixels = img.width * img.height;
        const maxDimension = Math.max(img.width, img.height);
        
        console.log('圖片尺寸:', img.width, 'x', img.height);
        console.log('總像素數:', totalPixels);
        console.log('最大尺寸:', maxDimension);
        
        // 根據圖片解析度判斷是手機拍攝還是電腦截圖
        if (totalPixels > 2000000 && maxDimension > 2000) {
          // 高解析度圖片（通常是手機拍攝）- 使用較大字體
          fontSize = Math.max(60, Math.min(120, maxDimension / 15));
          console.log('判斷為高解析度圖片（手機拍攝），使用大字體:', fontSize);
        } else if (maxDimension < 1500) {
          // 低解析度圖片（通常是電腦截圖或壓縮過的圖片）- 使用較小字體
          fontSize = Math.max(24, Math.min(48, maxDimension / 25));
          console.log('判斷為低解析度圖片（電腦截圖），使用小字體:', fontSize);
        } else {
          // 中等解析度 - 使用中等字體
          fontSize = Math.max(36, Math.min(72, maxDimension / 20));
          console.log('判斷為中等解析度圖片，使用中等字體:', fontSize);
        }
        
        ctx.font = `bold ${fontSize}px Arial`;
        
        // 測量文字寬度
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        
        // === 右下角浮水印 ===
        const padding = 40;
        const xBottomRight = Math.max(20, img.width - textWidth - padding);
        const yBottomRight = img.height - padding;
        
        // 右下角背景框
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(xBottomRight - 20, yBottomRight - fontSize - 20, textWidth + 40, fontSize + 40);
        
        // 右下角邊框
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.lineWidth = 4;
        ctx.strokeRect(xBottomRight - 20, yBottomRight - fontSize - 20, textWidth + 40, fontSize + 40);
        
        // 右下角文字
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillText(text, xBottomRight, yBottomRight);
        
        // === 左上角浮水印 ===
        const xTopLeft = 20;
        const yTopLeft = fontSize + 20;
        
        // 左上角背景框
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(xTopLeft - 20, yTopLeft - fontSize - 20, textWidth + 40, fontSize + 40);
        
        // 左上角邊框
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.lineWidth = 4;
        ctx.strokeRect(xTopLeft - 20, yTopLeft - fontSize - 20, textWidth + 40, fontSize + 40);
        
        // 左上角文字
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillText(text, xTopLeft, yTopLeft);
        
        // 使用較低品質但更穩定的壓縮
        const result = canvas.toDataURL('image/jpeg', 0.8);
        console.log('浮水印處理成功，字體大小:', fontSize, '圖片寬度:', img.width);
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