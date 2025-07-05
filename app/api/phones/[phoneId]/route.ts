import { NextResponse } from 'next/server';
import { getPhoneById } from '@/lib/sheets/phones';

export async function GET(request: Request, { params }: { params: { phoneId: string } }) {
  try {
    const phoneId = params.phoneId;
    
    if (!phoneId) {
      return NextResponse.json({ success: false, error: '手機ID為必填' }, { status: 400 });
    }

    const phoneData = await getPhoneById(phoneId);
    
    if (!phoneData) {
      return NextResponse.json({ success: false, error: '找不到手機資料' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: phoneData 
    });
  } catch (error) {
    console.error('獲取手機資料失敗:', error);
    return NextResponse.json({ 
      success: false, 
      error: '獲取手機資料失敗' 
    }, { status: 500 });
  }
} 