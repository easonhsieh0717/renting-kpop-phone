'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Phone } from '../types'
import { addDays, differenceInDays } from 'date-fns'

// A robust, timezone-safe function to get YYYY-MM-DD format
const toYYYYMMDD = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// A robust, timezone-safe function to normalize a date to the start of its day (local time)
const startOfDay = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

interface PriceCalendarProps {
  phone: Phone;
  onDateChange: (range: DateRange | undefined, price: number, error?: string) => void;
  disabledDates: { from: Date; to: Date }[];
}

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

  const rentalDays = useMemo(() => {
    if (range?.from && range?.to) {
      return differenceInDays(startOfDay(range.to), startOfDay(range.from)) + 1;
    }
    return 0;
  }, [range]);
  
  const hasBufferDay = rentalDays >= 3;

  const rentalPrice = useMemo(() => {
    if (rentalDays > 0) {
      const rate = rentalDays >= 3 ? phone.daily_rate_3_plus : phone.daily_rate_1_2;
      return rentalDays * rate;
    }
    return 0;
  }, [rentalDays, phone]);

  const returnDate = useMemo(() => {
    if (!range?.to) return null;
    const lastDay = startOfDay(range.to);
    const bufferDays = hasBufferDay ? 1 : 0;
    // Use native date manipulation to avoid timezone issues with external libraries
    const returnDay = new Date(lastDay);
    returnDay.setDate(returnDay.getDate() + bufferDays);
    return returnDay;
  }, [range?.to, hasBufferDay]);

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
            <span>租金:</span>
            <span className="font-bold text-white">NT$ {rentalPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center">
              預計歸還日
              {hasBufferDay && <span className="text-xs ml-1 font-light text-brand-gray-light">(含緩衝一日)</span>}
            </span>
            <span className="font-bold text-white">
              {returnDate ? `${toYYYYMMDD(returnDate)} 22:00 前` : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 