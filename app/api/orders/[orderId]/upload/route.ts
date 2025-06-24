import { NextRequest, NextResponse } from 'next/server';
import { uploadOrderFile } from '@/lib/drive';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    const url = new URL(req.url!);
    const part = url.searchParams.get('part');
    const total = url.searchParams.get('total');
    const { file, type } = await req.json(); // file: base64, type: 'sign' | 'photo' | 'id' | 'pdf'
    if (!file || !type) return NextResponse.json({ message: '缺少檔案或類型' }, { status: 400 });
    // 解析 base64
    const matches = file.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return NextResponse.json({ message: '檔案格式錯誤' }, { status: 400 });
    const mimeType = matches[1];
    const base64Data = matches[2];
    let fileName = `${orderId}`;
    if (type === 'sign') fileName += '_簽名.png';
    else if (type === 'photo') fileName += '_外觀.jpg';
    else if (type === 'id') fileName += '_證件.jpg';
    else if (type === 'pdf') fileName += '_合約.pdf';
    else fileName += '_其他檔案';
    console.log('UPLOAD', { type, mimeType, fileName, part, total });
    // PDF 分片處理
    if (type === 'pdf' && part && total) {
      // 1. 暫存分片
      const tmpDir = path.join('/tmp', orderId);
      await fs.mkdir(tmpDir, { recursive: true });
      const partPath = path.join(tmpDir, `part${part}`);
      await fs.writeFile(partPath, base64Data, 'utf8');
      // 2. 若為最後一片，合併所有分片
      if (parseInt(part) === parseInt(total)) {
        let merged = '';
        for (let i = 1; i <= parseInt(total); i++) {
          const p = path.join(tmpDir, `part${i}`);
          let chunk = await fs.readFile(p, 'utf8');
          if (i > 1) chunk = chunk.replace(/^data:application\/pdf;base64,/, '');
          merged += chunk;
        }
        const buffer = Buffer.from(merged, 'base64');
        const result = await uploadOrderFile(orderId, fileName, mimeType, buffer);
        // 刪除暫存分片
        for (let i = 1; i <= parseInt(total); i++) {
          await fs.unlink(path.join(tmpDir, `part${i}`));
        }
        await fs.rmdir(tmpDir);
        return NextResponse.json({ message: 'PDF 合併上傳成功', ...result });
      } else {
        return NextResponse.json({ message: `收到第${part}片，等待其他分片` });
      }
    }
    // 其他檔案維持原本邏輯
    const buffer = Buffer.from(base64Data, 'base64');
    const result = await uploadOrderFile(orderId, fileName, mimeType, buffer);
    return NextResponse.json({ message: '上傳成功', ...result });
  } catch (e) {
    console.error('Drive upload error:', e);
    return NextResponse.json({ message: '上傳失敗' }, { status: 500 });
  }
} 