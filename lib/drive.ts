import { google } from 'googleapis';
import { Readable } from 'stream';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

export async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

// 取得或建立以訂單編號命名的子資料夾
export async function getOrCreateOrderFolder(orderId: string) {
  const drive = await getDriveClient();
  if (!FOLDER_ID) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set');
  // 先查詢是否已存在
  const res = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and name = '${orderId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });
  if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
    return res.data.files[0].id;
  }
  // 不存在則建立
  const folder = await drive.files.create({
    requestBody: {
      name: orderId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [FOLDER_ID],
    },
    fields: 'id',
  });
  if (!folder.data.id) throw new Error('Failed to create folder');
  return folder.data.id;
}

// 上傳檔案到指定訂單子資料夾
export async function uploadOrderFile(orderId: string, fileName: string, mimeType: string, buffer: Buffer) {
  const drive = await getDriveClient();
  const folderId = await getOrCreateOrderFolder(orderId);
  if (!folderId) throw new Error('No folderId');
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, webViewLink, webContentLink',
  });
  return res.data;
} 