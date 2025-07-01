import { google } from 'googleapis';
import { sendPaymentSuccessEmail } from '../email';

export type PaidReservation = {
  phoneId: string;
  from: Date;
  to: Date;
}

// 簡單的內存緩存，減少 Google Sheets API 調用
interface ReservationCacheEntry {
  data: PaidReservation[]
  timestamp: number
}

let reservationCache: ReservationCacheEntry | null = null
const RESERVATION_CACHE_DURATION = 2 * 60 * 1000 // 2分鐘緩存（預約數據更新頻率較高）

async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function updateReservationStatus(orderId: string, status: string): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  // 先獲取完整的訂單資料（擴展範圍以取得所有必要資訊）
  const range = 'reservations!A:R';
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (!rows) {
    console.log('No data found in reservations sheet.');
    return;
  }

  const rowIndex = rows.findIndex(row => row[0] === orderId);
  if (rowIndex === -1) {
    console.log(`Order ID ${orderId} not found.`);
    return;
  }

  // 獲取當前付款狀態
  const currentRow = rows[rowIndex];
  const currentStatus = currentRow[8]; // I欄：付款狀態

  // 更新付款狀態
  const targetCell = `reservations!I${rowIndex + 1}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: targetCell,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[status]],
    },
  });

  console.log(`Order ${orderId} status updated to ${status}`);

  // 如果狀態變為PAID且之前不是PAID，觸發自動化流程
  if (status === 'PAID' && currentStatus !== 'PAID') {
    console.log(`Triggering automation for newly paid order: ${orderId}`);
    
    // 並行執行發票開立和email通知
    try {
      const orderData = {
        orderId: currentRow[0],
        phoneModel: currentRow[1],
        startDate: currentRow[2],
        endDate: currentRow[3],
        originalAmount: parseFloat(currentRow[4]) || 0,
        customerName: currentRow[5] || '',
        customerEmail: currentRow[6] || '',
        customerPhone: currentRow[7] || '',
        finalAmount: parseFloat(currentRow[12]) || 0,
        carrierNumber: currentRow[14] || '',
        invoiceStatus: currentRow[16] || '' // Q欄：發票狀態
      };

      // 並行處理：同時執行發票開立和email通知
      const [invoiceResult, emailResult] = await Promise.allSettled([
        // 觸發發票開立
        triggerInvoiceCreation(orderData),
        // 發送付款成功email
        sendPaymentSuccessNotification(orderData)
      ]);

      // 記錄結果
      if (invoiceResult.status === 'fulfilled') {
        console.log(`Invoice creation result for ${orderId}:`, invoiceResult.value);
      } else {
        console.error(`Invoice creation failed for ${orderId}:`, invoiceResult.reason);
      }

      if (emailResult.status === 'fulfilled') {
        console.log(`Email notification result for ${orderId}:`, emailResult.value);
      } else {
        console.error(`Email notification failed for ${orderId}:`, emailResult.reason);
      }

    } catch (error) {
      console.error(`Automation error for order ${orderId}:`, error);
      // 不拋出錯誤，避免影響付款狀態更新
    }
  }
}

// 觸發發票開立
async function triggerInvoiceCreation(orderData: any): Promise<any> {
  try {
    // 檢查是否已有發票
    const invoiceStatus = orderData.invoiceStatus;
    if (invoiceStatus && !invoiceStatus.includes('失敗')) {
      console.log(`Order ${orderData.orderId} already has invoice: ${invoiceStatus}`);
      return { success: true, message: 'Invoice already exists' };
    }

    // 檢查必要資料
    if (!orderData.finalAmount || orderData.finalAmount <= 0) {
      throw new Error(`Invalid amount: ${orderData.finalAmount}`);
    }

    // 呼叫發票API
    const invoiceApiUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/invoice/create`;
    
    const response = await fetch(invoiceApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: orderData.orderId
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`Invoice created successfully for order ${orderData.orderId}: ${result.invoiceNumber}`);
      return result;
    } else {
      throw new Error(`Invoice creation failed: ${result.message}`);
    }
    
  } catch (error) {
    console.error(`Failed to create invoice for order ${orderData.orderId}:`, error);
    throw error;
  }
}

// 發送付款成功通知
async function sendPaymentSuccessNotification(orderData: any): Promise<any> {
  try {
    if (!orderData.customerEmail) {
      console.log(`No email address for order ${orderData.orderId}, skipping email notification`);
      return { success: true, message: 'No email address provided' };
    }

    const emailResult = await sendPaymentSuccessEmail({
      orderId: orderData.orderId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      phoneModel: orderData.phoneModel,
      startDate: orderData.startDate,
      endDate: orderData.endDate,
      finalAmount: orderData.finalAmount,
    });

    if (emailResult.success) {
      console.log(`Payment success email sent for order ${orderData.orderId}: ${emailResult.messageId}`);
      return emailResult;
    } else {
      throw new Error(`Email sending failed: ${emailResult.error}`);
    }
    
  } catch (error) {
    console.error(`Failed to send email for order ${orderData.orderId}:`, error);
    throw error;
  }
}

/**
 * 從 Google Sheets 獲取所有已付款的預約紀錄
 * @returns A promise that resolves to an array of all paid reservations.
 */
export async function getAllPaidReservations(): Promise<PaidReservation[]> {
    // 檢查緩存是否有效
    if (reservationCache && (Date.now() - reservationCache.timestamp) < RESERVATION_CACHE_DURATION) {
        console.log('--- Returning cached reservation data ---');
        return reservationCache.data;
    }

    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
        throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    const range = 'reservations!A:J'; // OrderID, PhoneID, Start, End, ..., Status
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            return []; // No data or only header
        }
        
        // Skip header row
        const reservations = rows.slice(1);

        const paidReservations = reservations
            .filter(row => {
                const status = row[8]; // Status is in the 9th column (index 8)
                // Ensure row has enough columns to prevent errors
                return row && row.length > 8 && status === 'PAID';
            })
            .map(row => {
                return {
                  phoneId: row[1],
                  from: new Date(row[2]),
                  to: new Date(row[3])
                };
            })
            .filter(r => r.phoneId && !isNaN(r.from.getTime()) && !isNaN(r.to.getTime())); // Filter out invalid data

        // 更新緩存
        reservationCache = {
            data: paidReservations,
            timestamp: Date.now()
        };

        return paidReservations;
    } catch (error: any) {
        // If sheet doesn't exist, it's not an error, just means no reservations yet.
        if (error.message && error.message.includes('Unable to parse range')) {
          console.log("Reservations sheet doesn't exist yet. Returning empty array.");
          return [];
        }
        console.error('Error fetching all reservations from Google Sheets:', error);
        return []; // Return empty array on other errors to prevent crashes
    }
}

export async function getBookedDates(phoneId: string): Promise<{ from: Date; to: Date }[]> {
    try {
      const allReservations = await getAllPaidReservations();
      const bookedDates = allReservations
        .filter(r => r.phoneId === phoneId)
        .map(r => ({ from: r.from, to: r.to })); // Return original dates
      return bookedDates;
    } catch (error) {
       console.error(`Error getting booked dates for ${phoneId}:`, error);
       return [];
    }
} 