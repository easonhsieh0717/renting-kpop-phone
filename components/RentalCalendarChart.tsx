'use client';

import { useState, useEffect } from 'react';

interface CalendarData {
  date: string;
  day: number;
  isRented: boolean;
  isWeekend: boolean;
  isToday: boolean;
}

interface Rental {
  orderId: string;
  phoneId: string;
  customerName: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface PhoneCalendarData {
  phoneId: string;
  phoneName: string;
  phoneImage: string;
  calendarDays: CalendarData[];
}

interface RentalCalendarChartProps {
  phones: any[];
  rentals: Rental[];
}

export default function RentalCalendarChart({ phones, rentals }: RentalCalendarChartProps) {
  const [phoneCalendars, setPhoneCalendars] = useState<PhoneCalendarData[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPhone, setSelectedPhone] = useState<string>('');

  useEffect(() => {
    generateCalendarData();
  }, [phones, rentals, currentMonth]);

  const generateCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const today = new Date();
    
    // 獲取當月第一天和最後一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const phoneCalendarData: PhoneCalendarData[] = phones.map(phone => {
      const calendarDays: CalendarData[] = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // 檢查這一天是否被租賃
        const isRented = rentals.some(rental => {
          if (rental.phoneId !== phone.id || rental.status !== 'PAID') return false;
          
          const startDate = new Date(rental.startDate);
          const endDate = new Date(rental.endDate);
          
          return startDate <= currentDate && endDate >= currentDate;
        });
        
        calendarDays.push({
          date: dateStr,
          day,
          isRented,
          isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
          isToday: dateStr === today.toISOString().split('T')[0]
        });
      }
      
      return {
        phoneId: phone.id,
        phoneName: phone.name,
        phoneImage: getPhoneImage(phone.name),
        calendarDays
      };
    });
    
    setPhoneCalendars(phoneCalendarData);
  };

  const getPhoneImage = (phoneName: string) => {
    if (phoneName.includes('S25')) return '/images/S25U.png';
    if (phoneName.includes('S24')) return '/images/S24U.png';
    if (phoneName.includes('S23')) return '/images/S23U.png';
    return '/images/DEMO.jpg';
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long'
    });
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 顯示的手機數據（如果選擇了特定手機則只顯示該手機，否則顯示前3台）
  const displayPhones = selectedPhone 
    ? phoneCalendars.filter(p => p.phoneId === selectedPhone)
    : phoneCalendars.slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* 標題和控制 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">租賃日曆</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {formatMonth(currentMonth)}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 手機選擇器 */}
        <div className="mb-4">
          <select
            value={selectedPhone}
            onChange={(e) => setSelectedPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">顯示前3台手機</option>
            {phoneCalendars.map(phone => (
              <option key={phone.phoneId} value={phone.phoneId}>
                {phone.phoneName} (ID: {phone.phoneId.slice(-4)})
              </option>
            ))}
          </select>
        </div>

        {/* 圖例 */}
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center">
            <div className="w-4 h-4 border-2 border-green-500 rounded-full mr-1"></div>
            <span>可用</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 flex items-center justify-center">
              <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="ml-1">已租賃</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 border-2 border-blue-500 rounded-full bg-blue-100 mr-1"></div>
            <span>今天</span>
          </div>
        </div>
      </div>

      {/* 日曆網格 */}
      <div className="space-y-8">
        {displayPhones.map(phone => (
          <div key={phone.phoneId} className="border border-gray-200 rounded-lg p-4">
            {/* 手機標題 */}
            <div className="flex items-center mb-4">
              <img 
                src={phone.phoneImage} 
                alt={phone.phoneName}
                className="w-12 h-12 object-cover rounded-lg mr-3"
              />
              <div>
                <h4 className="font-medium text-gray-900">{phone.phoneName}</h4>
                <p className="text-sm text-gray-500">ID: {phone.phoneId}</p>
              </div>
            </div>

            {/* 星期標題 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* 日曆格子 */}
            <div className="grid grid-cols-7 gap-1">
              {/* 空白格子（月初） */}
              {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }, (_, i) => (
                <div key={`empty-${i}`} className="h-8"></div>
              ))}
              
              {/* 日期格子 */}
              {phone.calendarDays.map(dayData => (
                <div
                  key={dayData.date}
                  className={`h-8 flex items-center justify-center text-xs relative ${
                    dayData.isWeekend ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  {/* 日期數字 */}
                  <span className={`absolute top-0 left-1 text-[10px] ${
                    dayData.isToday ? 'text-blue-600 font-bold' : ''
                  }`}>
                    {dayData.day}
                  </span>
                  
                  {/* 狀態圖示 */}
                  <div className="flex items-center justify-center">
                    {dayData.isRented ? (
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <div className={`w-4 h-4 border-2 rounded-full ${
                        dayData.isToday 
                          ? 'border-blue-500 bg-blue-100' 
                          : 'border-green-500'
                      }`}></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 統計摘要 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">本月平均租賃率:</span>
            <span className="ml-2 font-medium">
              {phoneCalendars.length > 0 
                ? Math.round(
                    phoneCalendars.reduce((total, phone) => {
                      const rentedDays = phone.calendarDays.filter(day => day.isRented).length;
                      return total + (rentedDays / phone.calendarDays.length);
                    }, 0) / phoneCalendars.length * 100
                  )
                : 0}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">顯示手機數:</span>
            <span className="ml-2 font-medium">{displayPhones.length} / {phoneCalendars.length} 台</span>
          </div>
        </div>
      </div>
    </div>
  );
} 