"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ContractPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) return <div className="p-8 text-center">載入中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!order) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-4 text-center">手機租賃合約書</h1>
      <div className="mb-4 text-sm text-gray-500 text-center">訂單編號：{order[0]}</div>
      <div className="space-y-4 text-base leading-relaxed">
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
        <p className="mt-6">甲方簽章：__________________________</p>
        <p>乙方簽章：__________________________</p>
        <p className="mt-4 text-xs text-gray-400">本合約以電子方式簽署，具有同等法律效力。</p>
      </div>
    </div>
  );
} 