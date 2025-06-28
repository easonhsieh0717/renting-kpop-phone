"use client";
import { useState } from "react";
import { formatDateTimeInTaipei } from '@/lib/utils';

const TEST_MERCHANT_ID = "3002607";
const TEST_HASH_KEY = "pwFHCqoQZGmho4w6";
const TEST_HASH_IV = "EkRm7iFT261dpevs";
const TEST_ECPAY_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

function generateCheckMacValue(params: Record<string, any>, hashKey: string, hashIV: string) {
  const sorted = Object.entries(params)
    .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIV}`;
  const encoded = encodeURIComponent(raw)
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2a");
  // @ts-ignore
  return window.CryptoJS.SHA256(encoded.toLowerCase()).toString().toUpperCase();
}

export default function TestModePage() {
  const [orderId, setOrderId] = useState("");
  const [ecpayParams, setEcpayParams] = useState<Record<string, any> | null>(null);
  const [log, setLog] = useState<string>("");

  const createOrder = async () => {
    const now = new Date();
    const merchantTradeDate = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,"0")}/${now.getDate().toString().padStart(2,"0")} ${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
    const oid = `TEST${Date.now()}`;
    setOrderId(oid);
    // 呼叫後端 API 寫入 Google Sheet 並取得金流參數
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: { id: "TEST_PHONE", name: "測試手機", spec: "測試規格" },
        startDate: "2025-07-01",
        endDate: "2025-07-02",
        name: "測試用戶",
        userPhone: "0912345678",
        email: "test@example.com",
        totalAmount: 50,
        originalAmount: 50,
        isTest: true
      }),
    });
    const params = await res.json();
    setEcpayParams(params);
    setLog("已產生測試訂單與金流參數");
  };

  const submitToEcpay = () => {
    if (!ecpayParams) return;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = TEST_ECPAY_URL;
    Object.entries(ecpayParams).forEach(([k, v]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = String(v);
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const simulateCallback = async () => {
    if (!ecpayParams) return;
    const callbackParams = {
      MerchantID: TEST_MERCHANT_ID,
      MerchantTradeNo: ecpayParams.MerchantTradeNo,
      RtnCode: "1",
      RtnMsg: "交易成功",
      TradeNo: "testTradeNo",
      TradeAmt: 50,
      PaymentDate: formatDateTimeInTaipei(new Date()).replace(/\//g, '-').replace(',', ''),
      PaymentType: "Credit_CreditCard",
      PaymentTypeChargeFee: 1,
      TradeDate: ecpayParams.MerchantTradeDate,
      SimulatePaid: 1,
      CheckMacValue: ""
    };
    callbackParams.CheckMacValue = generateCheckMacValue(callbackParams, TEST_HASH_KEY, TEST_HASH_IV);
    const res = await fetch("/api/test-payment", {
      method: "POST",
      body: new URLSearchParams(callbackParams as any),
    });
    setLog(`模擬 callback 結果: ${res.status} ${await res.text()}`);
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-4">ECPay 全方位金流測試模式</h1>
      <button className="bg-blue-600 text-white px-4 py-2 rounded mr-2" onClick={createOrder}>一鍵建立測試訂單</button>
      <button className="bg-green-600 text-white px-4 py-2 rounded mr-2" onClick={submitToEcpay} disabled={!ecpayParams}>送出付款（跳轉綠界測試）</button>
      <button className="bg-yellow-600 text-white px-4 py-2 rounded" onClick={simulateCallback} disabled={!ecpayParams}>模擬 callback</button>
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <div>訂單編號：{orderId}</div>
        <div>金流參數：<pre className="text-xs whitespace-pre-wrap">{JSON.stringify(ecpayParams, null, 2)}</pre></div>
        <div className="text-sm text-gray-700 mt-2">{log}</div>
      </div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
    </div>
  );
} 