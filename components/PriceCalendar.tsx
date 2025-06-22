'use client'

import { useState, useEffect, useMemo } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Phone } from '../types'
import { addDays, differenceInDays } from 'date-fns'

interface PriceCalendarProps {
  phone: Phone;
  onDateChange: (range: DateRange | undefined, price: number, error?: string) => void;
  disabledDates: { from: Date; to: Date }[];
}

// Helper to normalize date to the start of the day to prevent timezone issues
const startOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setUTCHours(0, 0, 0, 0);
  return newDate;
};

export default function PriceCalendar({ phone, onDateChange, disabledDates }: PriceCalendarProps) {
  const [range, setRange] = useState<DateRange | undefined>()

  // Memoize disabled dates to prevent recalculation on every render
  const disabledDays = useMemo(() => {
    // We need to re-create date objects as they are not serialized through client components
    return disabledDates.map(r => ({ from: startOfDay(new Date(r.from)), to: startOfDay(new Date(r.to)) }));
  }, [disabledDates]);

  useEffect(() => {
    let price = 0;
    let days = 0;
    let currentError: string | undefined = undefined;

    if (range?.from && range?.to) {
      const from = startOfDay(range.from);
      const to = startOfDay(range.to);
      days = differenceInDays(to, from) + 1;

      if (days > 0) {
        const rate = days >= 3 ? phone.daily_rate_3_plus : phone.daily_rate_1_2;
        price = days * rate;
      }

      // Check for overlap with disabled dates
      const isOverlapping = disabledDays.some(disabledRange => 
        (from <= disabledRange.to && to >= disabledRange.from)
      );
      
      if (isOverlapping) {
        currentError = '注意：您選取的日期與現有預約重疊！';
        onDateChange(range, 0, currentError); // Pass error up
        return;
      }
    }
    
    onDateChange(range, price, currentError);
  }, [range, phone, onDateChange, disabledDays]);

  const returnDate = range?.to ? addDays(startOfDay(range.to), 1) : null;
  const rentalDays = range?.from && range?.to ? differenceInDays(startOfDay(range.to), startOfDay(range.from)) + 1 : 0;

  return (
    <div className="bg-brand-gray-dark p-4 sm:p-6 rounded-lg shadow-inner">
      <DayPicker
        mode="range"
        selected={range}
        onSelect={setRange}
        numberOfMonths={1}
        disabled={[{ before: startOfDay(new Date()) }, ...disabledDays]}
        modifiersClassNames={{
          selected: 'day-range-selected',
          range_start: 'day-range-start',
          range_end: 'day-range-end',
          today: 'day-today'
        }}
      />
      <div className="mt-4 pt-4 border-t border-brand-gray">
        <div className="space-y-2 text-sm text-brand-gray-light">
          <div className="flex justify-between">
            <span>租借天數:</span>
            <span className="font-bold text-white">{rentalDays > 0 ? `${rentalDays} 天` : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>押金 (現場支付):</span>
            <span className="font-bold text-white">NT$ {phone.deposit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center">
              預計歸還日
              <span className="text-xs ml-1">(緩衝一日):</span>
            </span>
            <span className="font-bold text-white">
              {returnDate ? returnDate.toISOString().split('T')[0] : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 