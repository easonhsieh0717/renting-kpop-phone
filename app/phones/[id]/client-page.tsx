'use client'

import { useState } from 'react'
import PriceCalendar from '@/components/PriceCalendar'
import Link from 'next/link'
import { Phone } from '@/types'
import { DateRange } from 'react-day-picker'

interface PhoneDetailClientProps {
  phone: Phone;
  vercelEnv: string;
  bookedDates: { from: Date; to: Date }[];
}

export default function PhoneDetailClient({ phone, vercelEnv, bookedDates }: PhoneDetailClientProps) {
  const [reservation, setReservation] = useState<{range: DateRange | undefined, price: number}>({ range: undefined, price: 0 });
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDateChange = (range: DateRange | undefined, price: number) => {
    setReservation({ range, price });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!reservation.range?.from || !reservation.range?.to) {
      setError('請選擇租借日期');
      return;
    }
    if (!customer.name || !customer.email || !customer.phone) {
      setError('請填寫所有聯絡資訊');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          startDate: reservation.range.from.toISOString().split('T')[0],
          endDate: reservation.range.to.toISOString().split('T')[0],
          totalAmount: reservation.price,
          name: customer.name,
          email: customer.email,
          userPhone: customer.phone,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '建立預約失敗');
      }
      
      const ecpayParams = result;
      
      const isProduction = vercelEnv === 'production';
      const ecpayUrl = isProduction 
        ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
        : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';

      // Create a form and submit it to redirect to ECPay
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = ecpayUrl;
      
      Object.entries(ecpayParams).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-base text-brand-gray">
            <li>
              <Link href="/" className="hover:text-brand-yellow transition-colors">
                首頁
              </Link>
            </li>
            <li className="text-brand-gray">/</li>
            <li className="text-brand-white font-bold">{phone.name} ({phone.specs})</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Phone Image */}
          <div className="space-y-4">
            <div className="relative h-96 w-full rounded-lg overflow-hidden shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={phone.imageUrl}
                alt={phone.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Phone Info & Calendar */}
          <div className="space-y-6">
            <div>
              <h1 className="text-5xl font-black text-brand-white mb-2">
                {phone.name}
              </h1>
              <p className="text-2xl text-brand-yellow font-bold mb-6">
                {phone.specs}
              </p>
              <div className="bg-brand-gray-dark p-6 rounded-lg">
                <h3 className="font-bold text-xl text-brand-yellow mb-4">
                  租借說明
                </h3>
                <ul className="text-base text-brand-gray-light space-y-2">
                  <li>• 採用階梯式計價，租越久越便宜</li>
                  <li>• 歸還日後會自動加上1天緩衝日</li>
                  <li>• 現場取機時需支付押金並檢查證件</li>
                  <li>• 請準時歸還，逾期每日加收租金</li>
                  <li>• 確認租借後不予退款</li>
                </ul>
              </div>
            </div>

            {/* Price Calendar */}
            <PriceCalendar phone={phone} onDateChange={handleDateChange} disabledDates={bookedDates} />
            
            {/* Customer Form */}
            <form onSubmit={handleSubmit} className="mt-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-brand-gray-light mb-1">姓名</label>
                  <input type="text" name="name" id="name" value={customer.name} onChange={handleInputChange} className="w-full bg-brand-gray-dark border-brand-gray rounded-md p-2 text-brand-white focus:ring-brand-yellow focus:border-brand-yellow" required />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-brand-gray-light mb-1">Email</label>
                  <input type="email" name="email" id="email" value={customer.email} onChange={handleInputChange} className="w-full bg-brand-gray-dark border-brand-gray rounded-md p-2 text-brand-white focus:ring-brand-yellow focus:border-brand-yellow" required />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-brand-gray-light mb-1">聯絡電話</label>
                  <input type="tel" name="phone" id="phone" value={customer.phone} onChange={handleInputChange} className="w-full bg-brand-gray-dark border-brand-gray rounded-md p-2 text-brand-white focus:ring-brand-yellow focus:border-brand-yellow" required />
                </div>
              </div>

              {error && <p className="text-red-500 mt-4">{error}</p>}
              
              <button 
                type="submit" 
                disabled={isLoading || reservation.price === 0}
                className="w-full mt-6 bg-brand-yellow text-brand-black font-bold py-3 px-4 rounded-lg transition-all duration-300 hover:bg-yellow-300 disabled:bg-brand-gray disabled:cursor-not-allowed">
                {isLoading ? '處理中...' : `立即預約 (總額 $${reservation.price})`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 