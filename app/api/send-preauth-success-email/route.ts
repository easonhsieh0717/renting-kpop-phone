import { NextRequest, NextResponse } from 'next/server';
import { sendPreAuthSuccessEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { orderData, preauthTransactionNo, ecpayTradeNo } = await req.json();
    
    if (!orderData || !orderData.customerEmail) {
      return NextResponse.json({
        success: false,
        message: 'Missing order data or customer email'
      }, { status: 400 });
    }

    // 發送預授權成功通知email
    const emailResult = await sendPreAuthSuccessEmail({
      to: orderData.customerEmail,
      customerName: orderData.customerName,
      orderId: orderData.orderId,
      phoneModel: orderData.phoneModel,
      imei: orderData.imei,
      startDate: orderData.startDate,
      endDate: orderData.endDate,
      preauthAmount: orderData.preauthAmount,
      preauthTransactionNo,
      ecpayTradeNo
    });

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: 'PreAuth success email sent successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: emailResult.error || 'Failed to send preauth success email'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Send preauth success email error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 