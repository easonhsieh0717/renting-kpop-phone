import { google } from 'googleapis';
import { Readable } from 'stream';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
const SHARED_DRIVE_ID = process.env.GOOGLE_SHARED_DRIVE_ID || ''; // 新增 Shared Drive ID

// 從 URL 提取 ID 的工具函數
function extractIdFromUrl(urlOrId: string): string {
  if (!urlOrId) return '';
  
  // 如果已經是純 ID，直接返回
  if (!urlOrId.includes('drive.google.com')) {
    return urlOrId;
  }
  
  // 從 URL 提取 ID
  const match = urlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  
  console.warn('無法從 URL 提取 ID:', urlOrId);
  return urlOrId; // 回退到原始值
}

// 檢測是否為 Shared Drive
async function isSharedDrive(driveId: string): Promise<boolean> {
  try {
    const drive = await getDriveClient();
    // 嘗試獲取 Shared Drive 資訊
    await drive.drives.get({ driveId: driveId });
    return true;
  } catch (error) {
    // 如果失敗，可能是普通資料夾
    return false;
  }
}

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
  
  // 提取純 ID
  const extractedSharedDriveId = extractIdFromUrl(SHARED_DRIVE_ID);
  const extractedFolderId = extractIdFromUrl(FOLDER_ID);
  
  // 確定使用的父資料夾 ID（優先使用 Shared Drive）
  const parentFolderId = extractedSharedDriveId || extractedFolderId;
  if (!parentFolderId) {
    throw new Error('Neither GOOGLE_SHARED_DRIVE_ID nor GOOGLE_DRIVE_FOLDER_ID is set');
  }
  
  // 檢測是否為 Shared Drive
  const isSharedDriveMode = extractedSharedDriveId && await isSharedDrive(extractedSharedDriveId);
  
  console.log(`使用父資料夾: ${isSharedDriveMode ? 'Shared Drive' : 'Standard Drive'} - ${parentFolderId}`);
  console.log(`原始設定: SHARED_DRIVE_ID=${SHARED_DRIVE_ID}, FOLDER_ID=${FOLDER_ID}`);
  
  // 查詢參數
  const queryParams: any = {
    q: `'${parentFolderId}' in parents and name = '${orderId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  };
  
  // 如果是 Shared Drive，添加相關參數
  if (isSharedDriveMode) {
    queryParams.supportsAllDrives = true;
    queryParams.includeItemsFromAllDrives = true;
    queryParams.corpora = 'drive';
    queryParams.driveId = extractedSharedDriveId;
  }
  
  // 先查詢是否已存在
  const res = await drive.files.list(queryParams);
  
  if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
    console.log(`找到現有資料夾: ${res.data.files[0].id}`);
    return res.data.files[0].id;
  }
  
  // 不存在則建立
  const createParams: any = {
    requestBody: {
      name: orderId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  };
  
  // 如果是 Shared Drive，添加相關參數
  if (isSharedDriveMode) {
    createParams.supportsAllDrives = true;
  }
  
  console.log(`建立新資料夾: ${orderId}`);
  const folder = await drive.files.create(createParams);
  
  if (!folder.data.id) throw new Error('Failed to create folder');
  console.log(`成功建立資料夾: ${folder.data.id}`);
  return folder.data.id;
}

// 上傳檔案到指定訂單子資料夾
export async function uploadOrderFile(orderId: string, fileName: string, mimeType: string, buffer: Buffer) {
  const drive = await getDriveClient();
  const folderId = await getOrCreateOrderFolder(orderId);
  if (!folderId) throw new Error('No folderId');
  
  console.log(`上傳檔案到資料夾: ${folderId}, 檔案: ${fileName}`);
  
  // 檢測是否為 Shared Drive 模式
  const extractedSharedDriveId = extractIdFromUrl(SHARED_DRIVE_ID);
  const isSharedDriveMode = extractedSharedDriveId && await isSharedDrive(extractedSharedDriveId);
  
  const uploadParams: any = {
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, webViewLink, webContentLink',
  };
  
  // 如果是 Shared Drive，添加相關參數
  if (isSharedDriveMode) {
    uploadParams.supportsAllDrives = true;
  }
  
  const res = await drive.files.create(uploadParams);
  console.log(`檔案上傳成功: ${res.data.id}`);
  return res.data;
} 