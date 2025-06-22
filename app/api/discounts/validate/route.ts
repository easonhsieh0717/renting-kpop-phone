import { NextRequest, NextResponse } from 'next/server';
import { getDiscountByCode } from '../../../../lib/sheets/discounts';

export async function POST(request: NextRequest) {
  try {
    const { code, rentalDays } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ message: '折扣碼為必填項目' }, { status: 400 });
    }
    if (typeof rentalDays !== 'number' || rentalDays <= 0) {
      return NextResponse.json({ message: '租借天數無效' }, { status: 400 });
    }

    const discount = await getDiscountByCode(code);

    if (!discount) {
      return NextResponse.json({ message: '無效或已停用的折扣碼' }, { status: 404 });
    }

    if (discount.minDays && rentalDays < discount.minDays) {
      return NextResponse.json({ message: `此折扣碼需至少租借 ${discount.minDays} 天` }, { status: 400 });
    }

    return NextResponse.json(discount);

  } catch (error) {
    console.error('Discount validation API error:', error);
    return NextResponse.json({ message: '內部伺服器錯誤' }, { status: 500 });
  }
} 