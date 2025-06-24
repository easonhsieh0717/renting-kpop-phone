import { NextRequest, NextResponse } from 'next/server';
import { uploadOrderFile } from '@/lib/drive';

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    const { file, type } = await req.json(); // file: base64, type: 'sign' | 'photo' | 'id' | 'pdf'
    if (!file || !type) return NextResponse.json({ message: '缺少檔案或類型' }, { status: 400 });
    // 解析 base64
    const matches = file.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return NextResponse.json({ message: '檔案格式錯誤' }, { status: 400 });
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    let fileName = `${orderId}`;
    if (type === 'sign') fileName += '_簽名.png';
    else if (type === 'photo') fileName += '_外觀.jpg';
    else if (type === 'id') fileName += '_證件.jpg';
    else if (type === 'pdf') fileName += '_合約.pdf';
    else fileName += '_其他檔案';
    const result = await uploadOrderFile(orderId, fileName, mimeType, buffer);
    return NextResponse.json({ message: '上傳成功', ...result });
  } catch (e) {
    console.error('Drive upload error:', e);
    return NextResponse.json({ message: '上傳失敗' }, { status: 500 });
  }
} 