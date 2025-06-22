'use client'

import React, { useState, useEffect } from 'react'
import { DateRange, DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { clsx } from 'clsx'
import { Phone } from '@/types'
import { format, differenceInDays, addDays } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Calendar, CalendarDays, AlertCircle } from 'lucide-react'

interface PriceCalendarProps {
  phone: Phone
  onDateChange: (range: DateRange | undefined, price: number) => void;
  disabledDates: { from: Date; to: Date }[];
}

export default function PriceCalendar({ phone, onDateChange, disabledDates }: PriceCalendarProps) {
  const [selectedRange, setSelectedRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({ from: undefined, to: undefined })

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // 計算租借天數
  const calculateDays = () => {
    if (!selectedRange.from || !selectedRange.to) return 0
    return Math.ceil((selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const daysCount = calculateDays()

  // 計算每日租金
  const getDailyRate = () => {
    if (daysCount === 0) return phone.daily_rate_1_2
    if (daysCount <= 2) {
      return phone.daily_rate_1_2
    }
    return phone.daily_rate_3_plus
  }

  const dailyRate = getDailyRate()
  const totalPrice = dailyRate * daysCount

  const handleDateSelect = (range: any) => {
    setSelectedRange(range)
    if (range?.from && range?.to) {
      setIsCalendarOpen(false)
    }
  }

  useEffect(() => {
    onDateChange(selectedRange, totalPrice);
  }, [selectedRange, totalPrice, onDateChange]);

  let footer = (
    <div className="text-center p-4 bg-brand-gray-dark rounded-b-lg">
      <p className="text-brand-gray-light">請選擇租借的起始與結束日期。</p>
    </div>
  )

  if (selectedRange.from && !selectedRange.to) {
    footer = (
      <div className="text-center p-4 bg-brand-gray-dark rounded-b-lg">
        <p className="text-brand-gray-light">請選擇租借的結束日期。</p>
      </div>
    )
  } else if (selectedRange.from && selectedRange.to && phone) {
    const finalDay = format(addDays(selectedRange.to!, 1), 'yyyy-MM-dd')

    footer = (
      <div className="text-center p-6 bg-brand-gray-dark rounded-b-lg">
        <div className="flex justify-between items-center mb-4">
          <span className="text-brand-gray-light">租借天數:</span>
          <span className="text-brand-white font-bold">{daysCount} 天</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-brand-gray-light">押金 (現場支付):</span>
          <span className="text-brand-white font-bold">${phone.deposit}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-brand-gray-light">預計歸還日 (緩衝一日):</span>
          <span className="text-brand-white font-bold">{finalDay}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-brand-gray-dark p-6 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-brand-yellow">
          選擇租借日期
        </h3>
        <button
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="flex items-center space-x-2 text-brand-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md transition-colors"
        >
          <Calendar className="w-5 h-5" />
          <span>{isCalendarOpen ? '關閉日曆' : '選擇日期'}</span>
        </button>
      </div>

      {isCalendarOpen && (
        <div className="bg-brand-black/50 p-4 rounded-md">
          <DayPicker
            id="price-calendar"
            mode="range"
            selected={selectedRange}
            onSelect={handleDateSelect}
            footer={footer}
            className="bg-brand-gray-dark p-6 rounded-lg text-brand-white"
            classNames={{
              caption: 'flex justify-center items-center mb-4',
              caption_label: 'text-lg font-bold text-brand-yellow',
              nav_button: 'h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10',
              head_cell: 'text-brand-yellow font-bold',
              day: 'hover:bg-brand-yellow hover:text-brand-black rounded-full transition-colors',
              day_selected: 'bg-brand-yellow text-brand-black font-bold rounded-full',
              day_range_middle: 'bg-brand-yellow/50 text-brand-white rounded-none',
              day_range_start: 'rounded-l-full',
              day_range_end: 'rounded-r-full',
              day_disabled: 'text-brand-gray-dark line-through',
            }}
            disabled={[
              { before: new Date() },
              ...disabledDates
            ]}
          />
        </div>
      )}

      {/* 價格與押金說明 */}
      <div className="text-sm space-y-2 p-4 bg-brand-black/30 rounded-lg">
        <h4 className="font-bold text-lg mb-2 text-brand-yellow">租金與押金</h4>
        <div className="flex justify-between text-brand-gray-light">
          <span>1~2 天租金:</span>
          <span className="font-medium">NT$ {phone.daily_rate_1_2} / 日</span>
        </div>
        <div className="flex justify-between text-brand-gray-light">
          <span>3 天或以上租金:</span>
          <span className="font-medium">NT$ {phone.daily_rate_3_plus} / 日</span>
        </div>
        <div className="flex justify-between border-t border-white/20 pt-2 mt-2 text-brand-gray-light">
          <span>押金 (現場支付):</span>
          <span className="font-medium">NT$ {phone.deposit}</span>
        </div>
      </div>

      {/* 預約結果 */}
      {totalPrice > 0 && (
        <div className="p-4 space-y-4 bg-brand-black/30 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-brand-gray-light">
            <CalendarDays className="w-4 h-4 text-brand-yellow" />
            <span>
              {format(selectedRange.from!, 'yyyy/MM/dd')} - 
              {format(selectedRange.to!, 'yyyy/MM/dd')}
            </span>
          </div>
          
          <div className="space-y-2 text-brand-gray-light">
            <div className="flex justify-between text-base">
              <span>租借天數：</span>
              <span className="font-bold">{daysCount} 天</span>
            </div>
            <div className="flex justify-between text-base">
              <span>每日平均單價：</span>
              <span className="font-bold">NT$ {dailyRate}</span>
            </div>
            <div className="border-t border-white/20 pt-3 mt-3">
              <div className="flex justify-between font-bold text-xl">
                <span className="text-brand-yellow">應付總額：</span>
                <span className="text-brand-yellow">NT$ {totalPrice}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2 text-sm text-brand-black p-3 bg-brand-yellow rounded-lg">
        <AlertCircle className="w-5 h-5" />
        <p className="font-medium">確認租借後不予退款。</p>
      </div>

      {footer}
    </div>
  )
} 