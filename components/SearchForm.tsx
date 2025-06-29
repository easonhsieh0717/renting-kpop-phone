'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { DateRange } from 'react-day-picker'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { formatDateInTaipei } from '../lib/utils'

interface SearchFormProps {
  models: string[];
  searchParams: {
    from?: string;
    to?: string;
    model?: string;
  }
}

// 輔助函式，確保日期字串被解析為當地時區的午夜，避免時區問題
const parseDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return undefined;
  // 直接使用 YYYY-MM-DD 格式建立 Date 物件，交由 formatDateInTaipei 處理時區
  return new Date(dateStr);
};

const today = new Date();
const fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
const toDate = new Date(today.getFullYear() + 1, 11, 31); // End of next year

const SearchForm = ({ models, searchParams }: SearchFormProps) => {
  const router = useRouter()
  const currentParams = useSearchParams();
  const pathname = usePathname();

  const [range, setRange] = useState<DateRange | undefined>({
    from: parseDate(searchParams.from),
    to: parseDate(searchParams.to),
  })
  const [model, setModel] = useState<string>(searchParams.model || '')

  // 新增的 useEffect hook，用來監聽 searchParams 的變化
  useEffect(() => {
    setRange({
      from: parseDate(searchParams.from),
      to: parseDate(searchParams.to),
    });
    setModel(searchParams.model || '');
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 從現有的 URL 參數開始建立，以保留其他可能的參數
    const params = new URLSearchParams(currentParams.toString())
    if (range?.from) {
      params.set('from', formatDateInTaipei(range.from))
    } else {
      params.delete('from')
    }
    if (range?.to) {
      params.set('to', formatDateInTaipei(range.to))
    } else {
      params.delete('to')
    }
    if (model) {
      params.set('model', model)
    } else {
      params.delete('model')
    }
    router.push(`/?${params.toString()}`)
  }
  
  const dayPickerProps = {
    mode: 'range' as const,
    selected: range,
    onSelect: setRange,
    toDate: toDate,
    defaultMonth: range?.from || today,
    disabled: { before: today },
    modifiersClassNames: {
      selected: 'day-range-selected',
      range_start: 'day-range-start',
      range_end: 'day-range-end',
      range_middle: 'day-range-middle',
      today: 'day-today',
      disabled: 'day-disabled'
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-brand-gray-dark p-8 rounded-xl shadow-2xl space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex justify-center">
          <div>
            <label className="block text-sm font-bold text-brand-gray-light mb-2">租借日期</label>
            <div className="bg-brand-gray-dark p-4 sm:p-6 rounded-lg shadow-inner border border-white/10">
            <DayPicker
              {...dayPickerProps}
              numberOfMonths={1}
            />
            </div>
          </div>
        </div>

        <div className="space-y-6 flex flex-col justify-between">
          <div>
            <label htmlFor="model" className="block text-sm font-bold text-brand-gray-light mb-2">手機型號 (可選)</label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-brand-gray border-brand-gray-dark rounded-md p-3 text-brand-white focus:ring-brand-yellow focus:border-brand-yellow"
            >
              <option value="">所有型號</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="w-full bg-brand-yellow text-brand-black font-bold py-3 px-4 rounded-lg transition-all duration-300 hover:bg-yellow-300 disabled:bg-brand-gray disabled:cursor-not-allowed">
            搜尋可租借手機
          </button>
        </div>
      </div>
    </form>
  )
}

export default SearchForm 