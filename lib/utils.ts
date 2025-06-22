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