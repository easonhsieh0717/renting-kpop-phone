import { NextRequest, NextResponse } from 'next/server';
import { sendPreAuthSuccessEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { testEmail } = await req.json();
    
    if (!testEmail) {
      return NextResponse.json({
        success: false,
        message: 'Please provide testEmail parameter'
      }, { status: 400 });
    }

    // 測試用的預授權資料
    const testData = {
      to: testEmail,
      customerName: '測試客戶',
      orderId: 'RENT20250101001',
      phoneModel: 'Samsung Galaxy S25 Ultra',
      imei: '123456789012345',
      startDate: '2025-01-15',
      endDate: '2025-01-20',
      preauthAmount: 30000,
      preauthTransactionNo: 'P20250101001',
      ecpayTradeNo: '2412310001234567'
    };

    console.log(`Testing preauth success email to: ${testEmail}`);
    
    const result = await sendPreAuthSuccessEmail(testData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `預授權成功測試email已發送至 ${testEmail}`,
        testData
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `發送失敗: ${result.error}`,
        testData
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Test preauth email error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: '預授權成功email測試端點',
    usage: 'POST /api/test-preauth-email',
    parameters: {
      testEmail: 'string (required) - 測試email地址'
    },
    example: {
      testEmail: 'test@example.com'
    }
  });
} 