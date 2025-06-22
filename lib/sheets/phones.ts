import { google } from 'googleapis'
import { Phone } from '../../types'
import { safeParseInt, safeParseBoolean } from '../utils'

// 封裝 Google Sheets API 客戶端
async function getGoogleSheetsClient() {
  console.log('Attempting to create Google Sheets client...');

  if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
    console.error('ERROR: GOOGLE_SHEETS_CLIENT_EMAIL is not defined.');
    throw new Error('GOOGLE_SHEETS_CLIENT_EMAIL is not defined.');
  }
  if (!process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
    console.error('ERROR: GOOGLE_SHEETS_PRIVATE_KEY is not defined.');
    throw new Error('GOOGLE_SHEETS_PRIVATE_KEY is not defined.');
  }
  if (!process.env.GOOGLE_SHEET_ID) {
    console.error('ERROR: GOOGLE_SHEET_ID is not defined.');
    throw new Error('GOOGLE_SHEET_ID is not defined.');
  }

  console.log('All required environment variables seem to be present.');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      // Vercel UI escapes newlines, so we need to un-escape them
      private_key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(
        /\\n/g,
        '\n'
      ),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  console.log('GoogleAuth object created.');
  const sheets = google.sheets({ version: 'v4', auth });
  console.log('Google Sheets client created successfully.');
  return sheets;
}

// 從 Google Sheet 獲取所有手機資料
export async function getPhones(): Promise<Phone[]> {
  console.log('--- getPhones function started ---');
  try {
    const sheets = await getGoogleSheetsClient();
    console.log('Attempting to fetch data from spreadsheet...');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'phones!A2:H', // We have 8 columns including active status
    });
    console.log('Successfully fetched data from spreadsheet.');

    const rows = response.data.values;
    if (rows && rows.length) {
      console.log(`Found ${rows.length} rows of data.`);
      const phones: Phone[] = rows.map((row, index) => {
        const phone = {
          id: row[0] || `phone-${index}`,
          name: row[1] || 'Unknown Phone',
          model: row[1] || 'Unknown Model',
          spec: row[3] || 'Unknown Spec',
          specs: (row[3] || '').split(',').filter((s: string) => s.trim()),
          imageUrl: row[2] || '/images/s24-ultra.jpg',
          daily_rate_1_2: safeParseInt(row[4], 500),
          daily_rate_3_plus: safeParseInt(row[5], 450),
          deposit: safeParseInt(row[6], 3000),
          active: safeParseBoolean(row[7], true),
        };

        console.log(`Phone ${index + 1}:`, {
          id: phone.id,
          name: phone.name,
          daily_rate_1_2: phone.daily_rate_1_2,
          daily_rate_3_plus: phone.daily_rate_3_plus,
          deposit: phone.deposit,
          active: phone.active
        });

        return phone;
      }).filter(phone => phone.active); // 只返回可用的手機
      console.log('--- getPhones function finished successfully ---');
      return phones;
    } else {
      console.log('No rows found in the spreadsheet.');
    }
  } catch (err) {
    console.error('--- CRITICAL ERROR in getPhones ---');
    console.error(err);
    // Return empty array instead of throwing to prevent page crash
    return [];
  }

  console.log('--- getPhones function finished with no data ---');
  return [];
}

/**
 * 從 Google Sheets 獲取所有不重複的手機型號
 * @returns A promise that resolves to an array of unique phone model strings.
 */
export async function getPhoneModels(): Promise<string[]> {
  try {
    const phones = await getPhones();
    const models = phones.map(phone => phone.model);
    const uniqueModels = Array.from(new Set(models));
    return uniqueModels;
  } catch (err) {
    console.error('Error getting phone models:', err);
    return [];
  }
}

// 根據 ID 從 Google Sheet 獲取單一手機資料
export async function getPhoneById(id: string): Promise<Phone | null> {
  try {
    const phones = await getPhones();
    return phones.find(phone => phone.id === id) || null;
  } catch (err: any) {
    console.error(`讀取 ID 為 ${id} 的手機時發生錯誤:`, err.message);
    return null;
  }
} 