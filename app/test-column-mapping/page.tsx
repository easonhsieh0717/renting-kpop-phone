'use client';

import { useState, useEffect } from 'react';

interface ColumnMapping {
  [key: string]: number;
}

interface MappingCheck {
  fieldName: string;
  columnIndex: number;
  columnLetter: string;
  currentHeader: string;
  isCorrect: boolean;
}

interface ColumnMappingResponse {
  success: boolean;
  columnMapping?: ColumnMapping;
  currentHeaders?: string[];
  mappingCheck?: MappingCheck[];
  totalColumns?: number;
  expectedColumns?: number;
  error?: string;
}

export default function TestColumnMappingPage() {
  const [mappingData, setMappingData] = useState<ColumnMappingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchMappingData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-column-mapping');
      const data = await response.json();
      setMappingData(data);
    } catch (error) {
      console.error('Error fetching mapping data:', error);
      setMappingData({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateHeaders = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/test-column-mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'updateHeaders' })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('標題行已更新成功！');
        fetchMappingData(); // 重新獲取數據
      } else {
        alert('更新失敗: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating headers:', error);
      alert('更新失敗: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchMappingData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Google Sheet 欄位對應測試
            </h1>

            <div className="mb-6 flex space-x-4">
              <button
                onClick={fetchMappingData}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '檢查中...' : '檢查欄位對應'}
              </button>
              
              <button
                onClick={updateHeaders}
                disabled={updating}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {updating ? '更新中...' : '更新標題行'}
              </button>
            </div>

            {mappingData && (
              <div className="space-y-6">
                {/* 基本資訊 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900">目前欄位數</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {mappingData.totalColumns || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900">預期欄位數</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {mappingData.expectedColumns || 0}
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    mappingData.totalColumns === mappingData.expectedColumns 
                      ? 'bg-green-50' 
                      : 'bg-red-50'
                  }`}>
                    <h3 className={`font-semibold ${
                      mappingData.totalColumns === mappingData.expectedColumns 
                        ? 'text-green-900' 
                        : 'text-red-900'
                    }`}>
                      狀態
                    </h3>
                    <p className={`text-2xl font-bold ${
                      mappingData.totalColumns === mappingData.expectedColumns 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {mappingData.totalColumns === mappingData.expectedColumns ? '✓ 正常' : '✗ 異常'}
                    </p>
                  </div>
                </div>

                {/* 錯誤訊息 */}
                {!mappingData.success && mappingData.error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h3 className="text-lg font-medium text-red-800">錯誤</h3>
                    <p className="text-red-700">{mappingData.error}</p>
                  </div>
                )}

                {/* 欄位對應詳細資訊 */}
                {mappingData.mappingCheck && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">欄位對應詳細檢查</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              欄位名稱
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              欄位位置
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              目前標題
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              狀態
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {mappingData.mappingCheck.map((item, index) => (
                            <tr key={index} className={item.isCorrect ? '' : 'bg-red-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.fieldName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.columnLetter} ({item.columnIndex})
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.currentHeader}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  item.isCorrect 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {item.isCorrect ? '✓ 正常' : '✗ 缺失'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 目前標題行 */}
                {mappingData.currentHeaders && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">目前標題行</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {mappingData.currentHeaders.map((header, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-mono text-gray-600">
                              {String.fromCharCode(65 + index)}:
                            </span>
                            <span className="ml-2">{header || '(空白)'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 