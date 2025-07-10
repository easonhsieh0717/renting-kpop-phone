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
    const { file, type, name } = await req.json(); // file: base64, type: 'sign' | 'photo' | 'id' | 'pdf', name: string
    if (!file || !type) return NextResponse.json({ message: '缺少檔案或類型' }, { status: 400 });
    // 解析 base64
    const matches = file.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return NextResponse.json({ message: '檔案格式錯誤' }, { status: 400 });
    const mimeType = matches[1];
    const base64Data = matches[2];
    let fileName = `${orderId}`;
    if (type === 'sign') fileName += '_簽名.png';
    else if (type === 'photo' && name) fileName += `_${name}.jpg`;
    else if (type === 'id' && name) fileName += `_${name}.jpg`;
    else if (type === 'pdf') fileName += '_合約.pdf';
    else fileName += '_其他檔案';
    console.log('UPLOAD', { type, mimeType, fileName, part, total });
    // 分片處理（支援 PDF 和所有檔案類型）
    if (part && total) {
      // 1. 暫存分片
      const tmpDir = path.join('/tmp', orderId);
      await fs.mkdir(tmpDir, { recursive: true });
      const partPath = path.join(tmpDir, `${type}_${name}_part${part}`);
      await fs.writeFile(partPath, base64Data, 'utf8');
      
      console.log(`收到分片 ${part}/${total}，檔案類型: ${type}，名稱: ${name}`);
      
      // 2. 若為最後一片，合併所有分片
      if (parseInt(part) === parseInt(total)) {
        let merged = '';
        for (let i = 1; i <= parseInt(total); i++) {
          const p = path.join(tmpDir, `${type}_${name}_part${i}`);
          let chunk = await fs.readFile(p, 'utf8');
          // 除了第一片外，移除資料頭
          if (i > 1) {
            const headerEnd = chunk.indexOf(',');
            if (headerEnd !== -1) {
              chunk = chunk.substring(headerEnd + 1);
            }
          }
          merged += (i === 1) ? chunk : chunk;
        }
        
        console.log(`合併完成，總大小: ${merged.length}，準備上傳...`);
        
        // 重新解析合併後的 base64
        const mergedMatches = merged.match(/^data:(.+);base64,(.+)$/);
        if (!mergedMatches) {
          throw new Error('合併後的檔案格式錯誤');
        }
        
        const mergedMimeType = mergedMatches[1];
        const mergedBase64Data = mergedMatches[2];
        const buffer = Buffer.from(mergedBase64Data, 'base64');
        const result = await uploadOrderFile(orderId, fileName, mergedMimeType, buffer);
        
        // 刪除暫存分片
        for (let i = 1; i <= parseInt(total); i++) {
          try {
            await fs.unlink(path.join(tmpDir, `${type}_${name}_part${i}`));
          } catch (unlinkError) {
            console.warn(`刪除分片 ${i} 失敗:`, unlinkError);
          }
        }
        
        try {
          await fs.rmdir(tmpDir);
        } catch (rmdirError) {
          console.warn('刪除暫存目錄失敗:', rmdirError);
        }
        
        console.log('分片上傳成功！');
        return NextResponse.json({ message: '分片上傳合併成功', ...result });
      } else {
        return NextResponse.json({ 
          message: `收到第${part}片，等待其他分片`,
          progress: Math.round((parseInt(part) / parseInt(total)) * 100)
        });
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