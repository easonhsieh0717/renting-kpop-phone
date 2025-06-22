'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DateRange } from 'react-day-picker'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

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
  // 將 'YYYY-MM-DD' 轉換為本地時區的 Date 物件
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function SearchForm({ models, searchParams }: SearchFormProps) {
  const router = useRouter()
  const currentParams = useSearchParams();

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
      params.set('from', range.from.toISOString().split('T')[0])
    } else {
      params.delete('from')
    }
    if (range?.to) {
      params.set('to', range.to.toISOString().split('T')[0])
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

  return (
    <form onSubmit={handleSubmit} className="bg-brand-gray-dark p-8 rounded-xl shadow-2xl space-y-6">
      <h2 className="text-3xl font-black text-brand-yellow text-center">尋找你的追星神器</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Date Range Picker */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-brand-gray-light mb-2">租借日期</label>
          <DayPicker
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={2}
            className="bg-brand-black/50 p-4 rounded-md text-sm"
             classNames={{
                caption: 'flex justify-center items-center mb-2',
                caption_label: 'text-base font-bold text-brand-yellow',
                nav_button: 'h-6 w-6 flex items-center justify-center rounded-full hover:bg-white/10',
                head_cell: 'text-brand-yellow font-bold w-10 h-10',
                day: 'h-10 w-10 rounded-full transition-colors hover:bg-brand-yellow/20',
                day_selected: 'bg-brand-yellow text-brand-black font-bold',
                day_range_middle: '!bg-brand-yellow/50 !rounded-none text-white',
                day_range_start: 'rounded-full',
                day_range_end: 'rounded-full',
                day_disabled: 'text-brand-gray-dark line-through opacity-50',
            }}
            disabled={{ before: new Date() }}
          />
        </div>

        {/* Model Selector & Submit Button */}
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