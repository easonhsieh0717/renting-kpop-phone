/**
 * 安全地將任何值解析為整數。如果值為空、無效或非數字，則返回預設值。
 * @param value - 要解析的值。
 * @param defaultValue - 如果解析失敗要返回的預設值，預設為 0。
 * @returns 解析後的整數或預設值。
 */
export const safeParseInt = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(String(value).replace(/[^\d.-]/g, ''), 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * 安全地將任何值解析為布林值。
 * 'true', '1', 'yes', 'y' (不區分大小寫) 會被視為 true。
 * @param value - 要解析的值。
 * @param defaultValue - 如果解析失敗要返回的預設值，預設為 false。
 * @returns 解析後的布林值或預設值。
 */
export const safeParseBoolean = (value: any, defaultValue: boolean = false): boolean => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'y') {
      return true;
    }
    if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no' || lowerValue === 'n') {
      return false;
    }
  }
  return defaultValue;
};

/**
 * 將 Date 物件或日期字串，以台北時區 (UTC+8) 格式化為 'YYYY-MM-DD' 字串。
 * 這可以從根本上避免伺服器和客戶端之間因時區不同而產生的計算錯誤。
 * @param date - 要格式化的日期，可以是 Date 物件、字串或 undefined。
 * @param options - 格式化選項。
 * @returns 格式化後的 'YYYY-MM-DD' 字串，或在輸入無效時返回空字串。
 */
export const formatDateInTaipei = (
  date: Date | string | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  if (!date) {
    return '';
  }
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // 檢查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei',
    ...options,
  };

  const formatter = new Intl.DateTimeFormat('en-CA', defaultOptions);
  return formatter.format(dateObj);
};

/**
 * 將 Date 物件轉換為 'YYYY-MM-DD' 格式的字串，不受時區影響。
 * @param date - 要轉換的 Date 物件。
 * @returns 'YYYY-MM-DD' 格式的字串。
 */
export const toYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 將 Date 物件或日期字串，以台北時區 (UTC+8) 格式化為完整的日期時間字串。
 * @param date - 要格式化的日期，可以是 Date 物件、字串或 undefined。
 * @param format - 格式化類型：'datetime' 或 'date'，預設為 'datetime'。
 * @returns 格式化後的日期時間字串，或在輸入無效時返回空字串。
 */
export const formatDateTimeInTaipei = (
  date: Date | string | undefined,
  format: 'datetime' | 'date' = 'datetime'
): string => {
  if (!date) {
    return '';
  }
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // 檢查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(format === 'datetime' && {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  };

  const formatter = new Intl.DateTimeFormat('zh-TW', options);
  return formatter.format(dateObj);
}; 