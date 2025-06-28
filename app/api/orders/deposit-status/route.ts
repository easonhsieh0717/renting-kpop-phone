import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Google Sheets 客戶端
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

// 獲取需要退刷的保證金訂單
async function getOrdersWithDeposit() {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  // 獲取所有訂單資料，包含保證金資訊
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'reservations!A:X',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  // 篩選有保證金交易的訂單
  const depositOrders = rows.slice(1).filter((row: any) => {
    const paymentStatus = row[8]; // I欄：付款狀態
    const depositTransactionNo = row[18]; // S欄：保證金交易號
    const depositStatus = row[20]; // U欄：保證金狀態
    
    // 條件：已付款 + 有保證金交易號 + 保證金狀態不是已退刷
    return paymentStatus === 'PAID' && 
           depositTransactionNo && 
           depositStatus !== 'REFUNDED';
  }).map((row: any) => {
    const depositAmount = parseInt(row[19]) || 30000; // T欄：保證金金額
    const refundedAmount = parseInt(row[21]) || 0; // V欄：已退刷金額
    const damageAmount = parseInt(row[23]) || 0; // X欄：損壞費用
    
    return {
      orderId: row[0],
      customerName: row[5],
      phoneModel: row[1],
      customerPhone: row[7],
      depositTransactionNo: row[18],
      depositAmount,
      depositStatus: row[20] || 'HELD',
      refundedAmount,
      refundTime: row[22] || '',
      damageAmount,
      maxRefundAmount: depositAmount - refundedAmount,
      canRefund: (depositAmount - refundedAmount) > 0,
      startDate: row[2],
      endDate: row[3]
    };
  });

  return depositOrders;
}

// GET: 查看需要退刷的保證金訂單列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 可選：篩選特定狀態
    
    const depositOrders = await getOrdersWithDeposit();
    
    // 根據狀態篩選
    let filteredOrders = depositOrders;
    if (status) {
      if (status === 'pending') {
        // 待退刷：有保證金但還沒退刷
        filteredOrders = depositOrders.filter(order => 
          order.depositStatus === 'HELD' && order.canRefund
        );
      } else if (status === 'partial') {
        // 部分退刷：已部分退刷但還有餘額
        filteredOrders = depositOrders.filter(order => 
          order.depositStatus === 'PARTIAL_REFUND' && order.canRefund
        );
      } else if (status === 'completed') {
        // 已完成退刷
        filteredOrders = depositOrders.filter(order => 
          order.depositStatus === 'REFUNDED'
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      ordersCount: filteredOrders.length,
      totalDeposits: depositOrders.length,
      orders: filteredOrders,
      summary: {
        pending: depositOrders.filter(o => o.depositStatus === 'HELD' && o.canRefund).length,
        partial: depositOrders.filter(o => o.depositStatus === 'PARTIAL_REFUND' && o.canRefund).length,
        completed: depositOrders.filter(o => o.depositStatus === 'REFUNDED').length,
        totalAmount: filteredOrders.reduce((sum, order) => sum + order.maxRefundAmount, 0)
      },
      message: filteredOrders.length > 0 
        ? `發現 ${filteredOrders.length} 筆保證金訂單`
        : '沒有符合條件的保證金訂單'
    });
    
  } catch (error: any) {
    console.error('查詢保證金訂單失敗:', error);
    return NextResponse.json({
      success: false,
      message: `查詢失敗: ${error.message}`
    }, { status: 500 });
  }
} 