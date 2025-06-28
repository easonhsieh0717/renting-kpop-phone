'use client';

import { useState, useEffect } from 'react';

interface CalendarData {
  date: string;
  rentedCount: number;
  availableCount: number;
  totalCount: number;
}

interface Rental {
  orderId: string;
  phoneId: string;
  customerName: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface RentalCalendarChartProps {
  phones: any[];
  rentals: Rental[];
}

export default function RentalCalendarChart({ phones, rentals }: RentalCalendarChartProps) {
  const [calendarData, setCalendarData] = useState<CalendarData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    generateCalendarData();
  }, [phones, rentals]);

  const generateCalendarData = () => {
    // 生成未來30天的數據
    const data: CalendarData[] = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // 計算當天的租賃狀況
      const rentedPhones = new Set<string>();
      
      rentals.forEach(rental => {
        if (rental.status === 'PAID') {
          const startDate = new Date(rental.startDate);
          const endDate = new Date(rental.endDate);
          
          if (startDate <= currentDate && endDate >= currentDate) {
            rentedPhones.add(rental.phoneId);
          }
        }
      });
      
      const rentedCount = rentedPhones.size;
      const totalCount = phones.length;
      const availableCount = totalCount - rentedCount;
      
      data.push({
        date: dateStr,
        rentedCount,
        availableCount,
        totalCount
      });
    }
    
    setCalendarData(data);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const maxRented = Math.max(...calendarData.map(d => d.rentedCount), 1);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">租賃趨勢圖</h3>
        <p className="text-sm text-gray-600">未來30天租賃數量預測</p>
      </div>

      {/* 圖例 */}
      <div className="flex items-center space-x-6 mb-6">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">租賃中</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">可用</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">今天</span>
        </div>
      </div>

      {/* 線圖區域 */}
      <div className="relative">
        {/* Y軸標籤 */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-500">
          <span>{maxRented}</span>
          <span>{Math.floor(maxRented / 2)}</span>
          <span>0</span>
        </div>

        {/* 圖表主體 */}
        <div className="ml-10 relative">
          <svg width="100%" height="200" className="overflow-visible">
            {/* 網格線 */}
            <defs>
              <pattern id="grid" width="100%" height="20" patternUnits="userSpaceOnUse">
                <path d="M 0 20 L 100% 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="200" fill="url(#grid)" />
            
            {/* 租賃中數量線 */}
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              points={calendarData.map((d, i) => {
                const x = (i / (calendarData.length - 1)) * 100;
                const y = 200 - (d.rentedCount / maxRented) * 180;
                return `${x}%,${y}`;
              }).join(' ')}
            />

            {/* 可用數量線 */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              points={calendarData.map((d, i) => {
                const x = (i / (calendarData.length - 1)) * 100;
                const y = 200 - (d.availableCount / maxRented) * 180;
                return `${x}%,${y}`;
              }).join(' ')}
            />

            {/* 數據點 */}
            {calendarData.map((d, i) => {
              const x = (i / (calendarData.length - 1)) * 100;
              const yRented = 200 - (d.rentedCount / maxRented) * 180;
              const yAvailable = 200 - (d.availableCount / maxRented) * 180;
              const isToday = d.date === today;
              
              return (
                <g key={d.date}>
                  {/* 今天的垂直線 */}
                  {isToday && (
                    <line
                      x1={`${x}%`}
                      y1="0"
                      x2={`${x}%`}
                      y2="200"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                  )}
                  
                  {/* 租賃中數據點 */}
                  <circle
                    cx={`${x}%`}
                    cy={yRented}
                    r={isToday ? "5" : "3"}
                    fill="#ef4444"
                    className="cursor-pointer hover:r-4 transition-all"
                    onClick={() => setSelectedDate(d.date)}
                  />
                  
                  {/* 可用數據點 */}
                  <circle
                    cx={`${x}%`}
                    cy={yAvailable}
                    r={isToday ? "5" : "3"}
                    fill="#10b981"
                    className="cursor-pointer hover:r-4 transition-all"
                    onClick={() => setSelectedDate(d.date)}
                  />
                </g>
              );
            })}
          </svg>

          {/* X軸標籤 */}
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            {calendarData.filter((_, i) => i % 5 === 0).map((d, i) => (
              <span key={d.date} className={d.date === today ? 'text-blue-600 font-semibold' : ''}>
                {formatDate(d.date)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 選中日期的詳細資訊 */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">
            {formatFullDate(selectedDate)}
          </h4>
          {(() => {
            const data = calendarData.find(d => d.date === selectedDate);
            if (!data) return null;
            
            return (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">租賃中:</span>
                  <span className="ml-2 font-medium text-red-600">{data.rentedCount} 台</span>
                </div>
                <div>
                  <span className="text-gray-600">可用:</span>
                  <span className="ml-2 font-medium text-green-600">{data.availableCount} 台</span>
                </div>
                <div>
                  <span className="text-gray-600">總計:</span>
                  <span className="ml-2 font-medium text-gray-900">{data.totalCount} 台</span>
                </div>
              </div>
            );
          })()}
          <button
            onClick={() => setSelectedDate('')}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            關閉詳情
          </button>
        </div>
      )}

      {/* 統計摘要 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">平均租賃率:</span>
            <span className="ml-2 font-medium">
              {calendarData.length > 0 
                ? Math.round((calendarData.reduce((sum, d) => sum + d.rentedCount, 0) / calendarData.length / phones.length) * 100)
                : 0}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">最高同時租賃:</span>
            <span className="ml-2 font-medium">{maxRented} 台</span>
          </div>
        </div>
      </div>
    </div>
  );
} 