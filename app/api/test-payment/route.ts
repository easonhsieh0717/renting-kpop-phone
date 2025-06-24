import { NextRequest, NextResponse } from 'next/server';
import { updateReservationStatus } from '../../../lib/sheets/reservations';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    // 測試模式直接略過 CheckMacValue 驗證
    const { MerchantTradeNo: orderId, RtnCode } = data;
    if (RtnCode === '1') {
      await updateReservationStatus(orderId, 'PAID');
    } else {
      await updateReservationStatus(orderId, 'FAILED');
    }
    return new NextResponse('1|OK');
  } catch (error) {
    return new NextResponse('0|Error', { status: 500 });
  }
} 