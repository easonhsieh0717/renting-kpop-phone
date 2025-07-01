import { NextRequest, NextResponse } from 'next/server';
import { sendPaymentSuccessEmail, testEmailConfiguration } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    // 測試email配置
    const configTest = await testEmailConfiguration();
    
    // 檢查環境變數狀態
    const emailUserExists = !!process.env.EMAIL_USER;
    const emailPasswordExists = !!process.env.EMAIL_PASSWORD;
    
    return NextResponse.json({
      success: configTest.success,
      message: configTest.success 
        ? 'Email configuration is valid' 
        : `Email configuration error: ${configTest.error}`,
      emailConfigured: emailUserExists && emailPasswordExists,
      environmentVariables: {
        EMAIL_USER: emailUserExists ? '✅ 已設定' : '❌ 未設定',
        EMAIL_PASSWORD: emailPasswordExists ? '✅ 已設定' : '❌ 未設定'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { testEmail } = await req.json();
    
    if (!testEmail) {
      return NextResponse.json({
        success: false,
        message: 'Please provide a test email address'
      }, { status: 400 });
    }

    // 發送測試email
    const testOrderData = {
      orderId: 'TEST' + Date.now(),
      customerName: '測試用戶',
      customerEmail: testEmail,
      phoneModel: 'iPhone 15 Pro Max',
      startDate: '2024-01-20',
      endDate: '2024-01-27',
      finalAmount: 1500,
      pickupLocation: '台北市板橋區文化路二段385之3號'
    };

    const result = await sendPaymentSuccessEmail(testOrderData);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        messageId: result.messageId
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Failed to send test email: ${result.error}`
      }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 