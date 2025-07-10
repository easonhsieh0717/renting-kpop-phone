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
      try {
        // 1. 暫存分片 - 使用安全的文件名
        const tmpDir = path.join('/tmp', orderId);
        await fs.mkdir(tmpDir, { recursive: true });
        
        // 清理文件名，避免特殊字符問題
        const safeName = (name || 'file').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
        const partPath = path.join(tmpDir, `${type}_${safeName}_part${part}.tmp`);
        
        // 儲存完整的分片數據（包含header）
        await fs.writeFile(partPath, file, 'utf8');
        
        console.log(`✅ 收到分片 ${part}/${total}，檔案類型: ${type}，名稱: ${safeName}`);
        
        // 2. 若為最後一片，合併所有分片
        if (parseInt(part) === parseInt(total)) {
          console.log('🔄 開始合併分片...');
          
          let headerPart = '';
          let dataParts = [];
          
          for (let i = 1; i <= parseInt(total); i++) {
            const partFile = path.join(tmpDir, `${type}_${safeName}_part${i}.tmp`);
            
            if (!(await fs.access(partFile).then(() => true).catch(() => false))) {
              throw new Error(`分片 ${i} 不存在: ${partFile}`);
            }
            
            const chunkContent = await fs.readFile(partFile, 'utf8');
            console.log(`📄 讀取分片 ${i}，大小: ${chunkContent.length}`);
            
            if (i === 1) {
              // 第一片：解析並保留header
              const headerEnd = chunkContent.indexOf(',');
              if (headerEnd === -1) {
                throw new Error('第一片缺少Base64 header');
              }
              headerPart = chunkContent.substring(0, headerEnd + 1);
              dataParts.push(chunkContent.substring(headerEnd + 1));
            } else {
              // 後續分片：只取數據部分
              const headerEnd = chunkContent.indexOf(',');
              if (headerEnd !== -1) {
                dataParts.push(chunkContent.substring(headerEnd + 1));
              } else {
                // 如果沒有header，直接使用全部內容
                dataParts.push(chunkContent);
              }
            }
          }
          
          // 合併所有數據
          const mergedBase64 = headerPart + dataParts.join('');
          console.log(`✅ 合併完成，總大小: ${mergedBase64.length}`);
          
          // 驗證合併後的base64格式
          const mergedMatches = mergedBase64.match(/^data:(.+);base64,(.+)$/);
          if (!mergedMatches) {
            console.error('❌ 合併後格式錯誤:', mergedBase64.substring(0, 100));
            throw new Error('合併後的檔案格式錯誤');
          }
          
          const mergedMimeType = mergedMatches[1];
          const mergedBase64Data = mergedMatches[2];
          
          // 檢查base64數據有效性
          try {
            const buffer = Buffer.from(mergedBase64Data, 'base64');
            console.log(`✅ Base64解碼成功，檔案大小: ${buffer.length} bytes`);
            
            // 上傳到Google Drive
            const result = await uploadOrderFile(orderId, fileName, mergedMimeType, buffer);
            console.log('✅ Google Drive上傳成功');
            
            // 清理暫存文件
            for (let i = 1; i <= parseInt(total); i++) {
              try {
                const partFile = path.join(tmpDir, `${type}_${safeName}_part${i}.tmp`);
                await fs.unlink(partFile);
              } catch (unlinkError) {
                console.warn(`清理分片 ${i} 失敗:`, unlinkError);
              }
            }
            
            try {
              await fs.rmdir(tmpDir);
            } catch (rmdirError) {
              console.warn('清理暫存目錄失敗:', rmdirError);
            }
            
            console.log('🎉 分片上傳完全成功！');
            return NextResponse.json({ 
              success: true,
              message: '分片上傳合併成功', 
              ...result 
            });
            
                     } catch (bufferError) {
             console.error('❌ Base64解碼失敗:', bufferError);
             throw new Error(`Base64數據無效: ${bufferError instanceof Error ? bufferError.message : String(bufferError)}`);
           }
        } else {
          // 非最後一片，返回進度
          return NextResponse.json({ 
            success: true,
            message: `收到第${part}片，等待其他分片`,
            progress: Math.round((parseInt(part) / parseInt(total)) * 100)
          });
        }
             } catch (chunkError) {
         console.error('❌ 分片處理失敗:', chunkError);
         throw new Error(`分片處理失敗: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}`);
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