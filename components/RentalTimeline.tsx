import { useState } from 'react';

interface TimelineRental {
  customerName: string;
  startDate: string;
  endDate: string;
  orderId: string;
  isCurrent: boolean;
}

interface RentalTimelineProps {
  phoneId: string;
  phoneName: string;
  rentals: TimelineRental[];
}

export default function RentalTimeline({ phoneId, phoneName, rentals }: RentalTimelineProps) {
  const [selectedRental, setSelectedRental] = useState<TimelineRental | null>(null);

  // 计算时间线的范围（当前时间前后30天）
  const now = new Date();
  const startRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endRange = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const totalDays = Math.ceil((endRange.getTime() - startRange.getTime()) / (1000 * 60 * 60 * 24));

  // 计算位置和宽度的函数
  const getPosition = (date: string) => {
    const targetDate = new Date(date);
    const daysFromStart = Math.ceil((targetDate.getTime() - startRange.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
  };

  const getWidth = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, (days / totalDays) * 100);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    });
  };

  // 获取当前时间在时间线上的位置
  const currentPosition = getPosition(now.toISOString());

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{phoneName}</h3>
        <p className="text-sm text-gray-500">租賃時間線 (ID: {phoneId})</p>
      </div>

      {/* 时间轴刻度 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>{formatDate(startRange.toISOString())}</span>
          <span className="font-medium text-gray-700">今天</span>
          <span>{formatDate(endRange.toISOString())}</span>
        </div>
        
        {/* 时间线背景 */}
        <div className="relative h-12 bg-gray-100 rounded-md">
          {/* 当前时间指示线 */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
            style={{ left: `${currentPosition}%` }}
          >
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
          </div>

          {/* 租赁时段 */}
          {rentals.map((rental, index) => {
            const left = getPosition(rental.startDate);
            const width = getWidth(rental.startDate, rental.endDate);
            const isVisible = left < 100 && (left + width) > 0;

            if (!isVisible) return null;

            return (
              <div
                key={index}
                className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all duration-200 z-10 ${
                  rental.isCurrent
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                style={{
                  left: `${Math.max(0, left)}%`,
                  width: `${Math.min(width, 100 - left)}%`
                }}
                onClick={() => setSelectedRental(rental)}
                title={`${rental.customerName} (${formatDate(rental.startDate)} - ${formatDate(rental.endDate)})`}
              >
                <div className="flex items-center justify-center h-full text-white text-xs font-medium">
                  {width > 15 ? rental.customerName.slice(0, 8) : ''}
                </div>
              </div>
            );
          })}

          {/* 网格线 */}
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-gray-300 opacity-30"
              style={{ left: `${(i + 1) * (100 / 8)}%` }}
            />
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-600">當前租賃</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-600">未來租賃</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-px h-3 bg-red-500"></div>
          <span className="text-gray-600">今天</span>
        </div>
      </div>

      {/* 租赁详情弹窗 */}
      {selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900">租賃詳情</h4>
              <button
                onClick={() => setSelectedRental(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">客戶姓名:</span>
                <p className="text-gray-900">{selectedRental.customerName}</p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">租賃期間:</span>
                <p className="text-gray-900">
                  {formatDate(selectedRental.startDate)} - {formatDate(selectedRental.endDate)}
                </p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">訂單編號:</span>
                <p className="text-gray-900 font-mono text-sm">{selectedRental.orderId}</p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">狀態:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedRental.isCurrent 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedRental.isCurrent ? '進行中' : '待開始'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 