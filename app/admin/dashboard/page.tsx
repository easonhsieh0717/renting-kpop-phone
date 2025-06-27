'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RentalTimeline from '../../../components/RentalTimeline';

interface PhoneStatus {
  id: string;
  name: string;
  model: string;
  imageUrl: string;
  isRented: boolean;
  currentRental?: {
    customerName: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
    orderId: string;
  };
  upcomingRentals: {
    customerName: string;
    startDate: string;
    endDate: string;
    orderId: string;
  }[];
}

interface Rental {
  orderId: string;
  phoneId: string;
  customerName: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [phoneStatuses, setPhoneStatuses] = useState<PhoneStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'rented' | 'available'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  const [testDate, setTestDate] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 當測試日期改變時重新處理數據
  useEffect(() => {
    if (phoneStatuses.length > 0) {
      // 重新從現有數據計算
      fetchDashboardData();
    }
  }, [testDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 获取所有手机数据
      const phonesResponse = await fetch('/api/search');
      const phonesData = await phonesResponse.json();
      
      // 获取所有租赁数据
      const rentalsResponse = await fetch('/api/reservations');
      const rentalsData = await rentalsResponse.json();
      
      if (phonesResponse.ok && rentalsResponse.ok) {
        // 修正：search API直接返回手機數組，不是包含phones屬性的對象
        const phoneStatuses = processDashboardData(phonesData, rentalsData.reservations || []);
        setPhoneStatuses(phoneStatuses);
      }
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDashboardData = (phones: any[], rentals: Rental[]): PhoneStatus[] => {
    // 使用测试日期或当前日期
    const now = testDate ? new Date(testDate) : new Date();
    console.log('Processing dashboard data:', { 
      phonesCount: phones.length, 
      rentalsCount: rentals.length,
      currentDate: now.toISOString(),
      isTestMode: !!testDate
    });
    
    return phones.map(phone => {
      // 找到该手机的所有租赁记录
      const phoneRentals = rentals.filter(rental => 
        rental.phoneId === phone.id && rental.status === 'PAID'
      );
      
      console.log(`Phone ${phone.id} rentals:`, phoneRentals.length);
      
      // 当前租赁 - 修正日期比较逻辑
      const currentRental = phoneRentals.find(rental => {
        const startDate = new Date(rental.startDate + 'T00:00:00.000Z');
        const endDate = new Date(rental.endDate + 'T23:59:59.999Z');
        const isCurrentlyRented = startDate <= now && endDate >= now;
        
        console.log(`Checking rental ${rental.orderId}:`, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          now: now.toISOString(),
          isCurrentlyRented
        });
        
        return isCurrentlyRented;
      });
      
      // 未来租赁
      const upcomingRentals = phoneRentals
        .filter(rental => {
          const startDate = new Date(rental.startDate + 'T00:00:00.000Z');
          return startDate > now;
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 3); // 只显示最近3个
      
      let currentRentalInfo;
      if (currentRental) {
        const endDate = new Date(currentRental.endDate);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        currentRentalInfo = {
          customerName: currentRental.customerName,
          startDate: currentRental.startDate,
          endDate: currentRental.endDate,
          daysRemaining,
          orderId: currentRental.orderId
        };
      }
      
      return {
        id: phone.id,
        name: phone.name,
        model: phone.model,
        imageUrl: phone.imageUrl,
        isRented: !!currentRental,
        currentRental: currentRentalInfo,
        upcomingRentals: upcomingRentals.map(rental => ({
          customerName: rental.customerName,
          startDate: rental.startDate,
          endDate: rental.endDate,
          orderId: rental.orderId
        }))
      };
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPhones = phoneStatuses.filter(phone => {
    if (filter === 'rented') return phone.isRented;
    if (filter === 'available') return !phone.isRented;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  const rentedCount = phoneStatuses.filter(p => p.isRented).length;
  const availableCount = phoneStatuses.filter(p => !p.isRented).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
                             <div>
                <h1 className="text-xl font-semibold text-gray-900">租賃仪表板</h1>
                <p className="text-sm text-gray-500">
                  手機租賃狀態總覽
                  {testDate && (
                    <span className="ml-2 text-blue-600 font-medium">
                      (測試模式: {new Date(testDate).toLocaleDateString('zh-TW')})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* 測試日期選擇器 */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">測試日期:</label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                />
                {testDate && (
                  <button
                    onClick={() => setTestDate('')}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    清除
                  </button>
                )}
              </div>
              
              <button
                onClick={fetchDashboardData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                重新載入
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 統計摘要 */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">可用手機</dt>
                      <dd className="text-lg font-medium text-gray-900">{availableCount} 台</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">租賃中</dt>
                      <dd className="text-lg font-medium text-gray-900">{rentedCount} 台</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">總手機數</dt>
                      <dd className="text-lg font-medium text-gray-900">{phoneStatuses.length} 台</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 過濾器和视图切换 */}
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  全部 ({phoneStatuses.length})
                </button>
                <button
                  onClick={() => setFilter('available')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === 'available'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  可用 ({availableCount})
                </button>
                <button
                  onClick={() => setFilter('rented')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === 'rented'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  租賃中 ({rentedCount})
                </button>
              </div>

              {/* 视图切换 */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  卡片視圖
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  時間線視圖
                </button>
              </div>
            </div>
          </div>

          {/* 卡片視圖 */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPhones.map(phone => (
                <div key={phone.id} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="p-6">
                    {/* 手機基本信息 */}
                    <div className="flex items-center mb-4">
                      <img 
                        src={phone.imageUrl} 
                        alt={phone.name}
                        className="w-16 h-16 object-cover rounded-lg mr-4"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{phone.name}</h3>
                        <p className="text-sm text-gray-500">{phone.model}</p>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            phone.isRented 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {phone.isRented ? '租賃中' : '可用'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 當前租賃信息 */}
                    {phone.currentRental && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                        <h4 className="text-sm font-medium text-red-800 mb-2">當前租賃</h4>
                        <div className="text-sm text-red-700">
                          <p><strong>客戶:</strong> {phone.currentRental.customerName}</p>
                          <p><strong>開始:</strong> {formatDate(phone.currentRental.startDate)}</p>
                          <p><strong>結束:</strong> {formatDate(phone.currentRental.endDate)}</p>
                          <p><strong>剩餘:</strong> {phone.currentRental.daysRemaining} 天</p>
                          <p className="text-xs text-red-600 mt-1">
                            訂單: {phone.currentRental.orderId}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 即將到來的租賃 */}
                    {phone.upcomingRentals.length > 0 && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          即將租賃 ({phone.upcomingRentals.length})
                        </h4>
                        <div className="space-y-2">
                          {phone.upcomingRentals.map((rental, index) => (
                            <div key={index} className="text-sm text-blue-700">
                              <p><strong>{rental.customerName}</strong></p>
                              <p>{formatDate(rental.startDate)} - {formatDate(rental.endDate)}</p>
                              <p className="text-xs text-blue-600">{rental.orderId}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 無租賃時顯示 */}
                    {!phone.isRented && phone.upcomingRentals.length === 0 && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-md text-center">
                        <p className="text-sm text-green-700">目前無租賃安排</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 時間線視圖 */}
          {viewMode === 'timeline' && (
            <div className="space-y-6">
              {filteredPhones.map(phone => {
                const allRentals = [
                  ...(phone.currentRental ? [{
                    customerName: phone.currentRental.customerName,
                    startDate: phone.currentRental.startDate,
                    endDate: phone.currentRental.endDate,
                    orderId: phone.currentRental.orderId,
                    isCurrent: true
                  }] : []),
                  ...phone.upcomingRentals.map(rental => ({
                    customerName: rental.customerName,
                    startDate: rental.startDate,
                    endDate: rental.endDate,
                    orderId: rental.orderId,
                    isCurrent: false
                  }))
                ];

                return (
                  <RentalTimeline
                    key={phone.id}
                    phoneId={phone.id}
                    phoneName={`${phone.name} (${phone.model})`}
                    rentals={allRentals}
                  />
                );
              })}
            </div>
          )}

          {filteredPhones.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">無符合條件的手機</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'rented' && '目前沒有手機正在租賃中'}
                {filter === 'available' && '目前沒有可用的手機'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 