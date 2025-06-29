'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import PriceCalendar from '../../../components/PriceCalendar'
import Link from 'next/link'
import { Phone, Discount } from '../../../types'
import { DateRange } from 'react-day-picker'
import { differenceInCalendarDays, addDays } from 'date-fns'
import { formatDateInTaipei, toYYYYMMDD } from '../../../lib/utils'
import { getBookedDates } from '../../../lib/sheets/reservations'

interface PhoneDetailClientProps {
  phone: Phone;
  vercelEnv: string;
  bookedDates: { from: Date; to: Date }[];
}

// Helper to normalize date
const startOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setUTCHours(0, 0, 0, 0);
  return newDate;
};

export default function PhoneDetailClient({ phone, vercelEnv, bookedDates }: PhoneDetailClientProps) {
  const [reservation, setReservation] = useState<{range: DateRange | undefined, price: number}>({ range: undefined, price: 0 });
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    carrierNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | undefined>('');
  
  // Discount States
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);

  const rentalDays = useMemo(() => {
    if (reservation.range?.from && reservation.range?.to) {
      return differenceInCalendarDays(reservation.range.to, reservation.range.from) + 1;
    }
    return 0;
  }, [reservation.range]);

  const hasGraceDay = rentalDays >= 3;
  const finalReturnDate =
    hasGraceDay && reservation.range?.to ? addDays(reservation.range.to, 1) : reservation.range?.to;

  useEffect(() => {
    let newFinalPrice = reservation.price;
    let newDiscountAmount = 0;
    if (appliedDiscount && reservation.price > 0) {
      switch (appliedDiscount.type) {
        case 'FIXED':
          newDiscountAmount = appliedDiscount.value;
          break;
        case 'UNIQUE_ONCE':
          newDiscountAmount = appliedDiscount.value;
          break;
        case 'PER_DAY':
          newDiscountAmount = appliedDiscount.value * rentalDays;
          break;
      }
      newFinalPrice = Math.max(0, reservation.price - newDiscountAmount);
    }
    setDiscountAmount(newDiscountAmount);
    setFinalPrice(newFinalPrice);
  }, [reservation.price, appliedDiscount, rentalDays]);


  const handleDateChange = useCallback((range: DateRange | undefined, price: number, errorMsg?: string) => {
    setReservation({ range, price });
    setCalendarError(errorMsg);
    // Reset discount if date changes
    setAppliedDiscount(null);
    setDiscountCode('');
    setDiscountError('');
  }, []);

  const handleApplyDiscount = async () => {
    setDiscountError('');
    setAppliedDiscount(null);
    if (!discountCode) {
      setDiscountError('請輸入折扣碼');
      return;
    }
    if (rentalDays <= 0) {
      setDiscountError('請先選擇有效的租借日期');
      return;
    }

    try {
      const response = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode, rentalDays }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || '折扣碼驗證失敗');
      }
      setAppliedDiscount(result);
    } catch (err: any) {
      setDiscountError(err.message);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Final validation before submitting
    if (calendarError) {
      setError('您選擇的日期包含已被預約的時間，請重新選擇。');
      return;
    }
    
    if (!reservation.range?.from || !reservation.range?.to) {
      setError('請選擇租借日期');
      return;
    }
    if (!customer.name || !customer.email || !customer.phone) {
      setError('請填寫所有聯絡資訊');
      return;
    }
    if (customer.carrierNumber && !/^\/[A-Z0-9+-.]{7}$/.test(customer.carrierNumber)) {
      setError('手機載具號碼格式錯誤，請輸入正確的8碼格式（如：/A1B2C3D4）');
      return;
    }

    setIsLoading(true);

    try {
      const adjustedToDate = finalReturnDate;

      if (!reservation.range?.from || !adjustedToDate) {
        console.error('Date range is not fully selected.');
        return;
      }

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          startDate: formatDateInTaipei(reservation.range!.from),
          endDate: formatDateInTaipei(adjustedToDate),
          totalAmount: finalPrice,
          originalAmount: reservation.price,
          discountCode: appliedDiscount?.code,
          discountAmount: discountAmount,
          name: customer.name,
          email: customer.email,
          userPhone: customer.phone,
          carrierNumber: customer.carrierNumber,
          from: toYYYYMMDD(reservation.range!.from),
          to: toYYYYMMDD(adjustedToDate),
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
            <li className="text-brand-white font-bold">{phone.name} ({phone.spec})</li>
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
                  <li>• 首創滿三天歸還日後會送加上1天緩衝日</li>
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
              {/* Discount Code Section */}
              <div className="mb-6">
                <label htmlFor="discount" className="block text-sm font-medium text-brand-gray-light mb-1">折扣碼 (選填)</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    name="discount" 
                    id="discount" 
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    className="w-full bg-brand-gray-dark border-brand-gray rounded-md p-2 text-brand-white focus:ring-brand-yellow focus:border-brand-yellow uppercase"
                    placeholder="請輸入折扣碼"
                    disabled={!!appliedDiscount}
                  />
                  <button 
                    type="button" 
                    onClick={handleApplyDiscount}
                    disabled={!!appliedDiscount || !discountCode || rentalDays <= 0}
                    className="bg-brand-yellow text-brand-black font-bold py-2 px-4 rounded-lg transition-colors hover:bg-yellow-300 disabled:bg-brand-gray disabled:text-brand-gray-light disabled:cursor-not-allowed shrink-0"
                  >
                    {appliedDiscount ? '已套用' : '套用'}
                  </button>
                </div>
                {discountError && <p className="text-red-500 mt-2 text-sm">{discountError}</p>}
                {appliedDiscount && <p className="text-green-500 mt-2 text-sm">{appliedDiscount.description}</p>}
              </div>

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
                <div>
                  <label htmlFor="carrierNumber" className="block text-sm font-medium text-brand-gray-light mb-1">手機載具號碼 (選填)</label>
                  <input 
                    type="text" 
                    name="carrierNumber" 
                    id="carrierNumber" 
                    value={customer.carrierNumber} 
                    onChange={handleInputChange} 
                    className="w-full bg-brand-gray-dark border-brand-gray rounded-md p-2 text-brand-white focus:ring-brand-yellow focus:border-brand-yellow" 
                    placeholder="例：/A1B2C3D4"
                    maxLength={8}
                  />
                  <p className="text-xs text-brand-gray-light mt-1">
                    8碼載具號碼，用於電子發票開立，若不提供將開立雲端發票
                  </p>
                </div>
              </div>

              {error && <p className="text-red-500 mt-4">{error}</p>}
              {calendarError && <p className="text-red-500 mt-4">{calendarError}</p>}
              
              <div className="mt-4 pt-4 border-t border-brand-gray space-y-2">
                <div className="flex justify-between text-brand-gray-light">
                  <span>小計</span>
                  <span>NT$ {reservation.price.toLocaleString()}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-green-400">
                    <span>折扣 ({appliedDiscount.code})</span>
                    <span>- NT$ {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-brand-white font-bold text-xl">
                  <span>總計</span>
                  <span>NT$ {finalPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 text-center text-sm text-brand-gray-light">
                {reservation.range?.from && (
                  <p>{`起租日: ${toYYYYMMDD(reservation.range.from)}`}</p>
                )}
                {reservation.range?.to && (
                  <p>{`歸還日: ${toYYYYMMDD(reservation.range.to)}`}</p>
                )}
                {hasGraceDay && finalReturnDate && (
                  <p className="text-brand-yellow font-bold mt-2">
                    恭喜！租借滿3天，自動延長一天還機緩衝日！
                    <br />
                    最終歸還日: {toYYYYMMDD(finalReturnDate)}
                  </p>
                )}
              </div>

              <div className="mt-6 p-4 bg-black/20 rounded-lg border border-white/10">
                <h3 className="text-lg font-bold text-brand-yellow mb-2">押金選擇</h3>
                <p className="text-sm text-brand-gray-light mb-3 text-center">
                  皆需攜帶身分證或護照正本
                </p>
                <div className="space-y-3 text-sm text-brand-gray-light">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-white">經濟方案：現金 $3,000</div>
                      <div className="text-xs text-gray-400">→證件需抵押至歸還</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-white">信用卡方案：凍結額度 $30,000</div>
                      <div className="text-xs text-gray-400">→證件僅供核對，無需抵押</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-white">現金方案：現金 $30,000</div>
                      <div className="text-xs text-gray-400">→證件僅供核對，無需抵押</div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">
                  歸還時保證24小時內退還押金或解除凍結
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isLoading || reservation.price === 0 || !!calendarError}
                className="w-full mt-6 bg-brand-yellow text-brand-black font-bold py-3 px-4 rounded-lg transition-all duration-300 hover:bg-yellow-300 disabled:bg-brand-gray disabled:cursor-not-allowed">
                {isLoading ? '處理中...' : (calendarError ? '日期無法預約' : `立即預約 (總額 NT$ ${finalPrice.toLocaleString()})`)}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 