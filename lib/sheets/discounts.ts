import { google } from 'googleapis';
import { Discount } from '../../types';

async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function getDiscountByCode(code: string): Promise<Discount | null> {
  if (!code) return null;

  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID is not configured');

  const range = 'discounts!A:F';
  try {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values;
    if (!rows || rows.length < 2) return null; // No data or only header

    const header = rows[0];
    const codeIndex = header.indexOf('code');
    const typeIndex = header.indexOf('type');
    const valueIndex = header.indexOf('value');
    const isActiveIndex = header.indexOf('is_active');
    const minDaysIndex = header.indexOf('min_days');
    const descriptionIndex = header.indexOf('description');

    const row = rows.slice(1).find(r => r[codeIndex] === code);
    if (!row) return null;

    const isActive = row[isActiveIndex] === 'TRUE';
    if (!isActive) return null;

    return {
      code: row[codeIndex],
      type: row[typeIndex] as Discount['type'],
      value: parseInt(row[valueIndex], 10),
      isActive: isActive,
      minDays: row[minDaysIndex] ? parseInt(row[minDaysIndex], 10) : undefined,
      description: row[descriptionIndex],
    };
  } catch (error: any) {
    if (error.message && error.message.includes('Unable to parse range')) {
      console.log("Discounts sheet doesn't exist yet.");
      return null;
    }
    console.error('Error fetching discount from Google Sheets:', error);
    throw error;
  }
}

export async function deactivateDiscount(code: string): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID is not configured');

  const range = 'discounts!A:F';
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = response.data.values;

  if (!rows || rows.length < 2) return;

  const header = rows[0];
  const codeIndex = header.indexOf('code');
  const isActiveIndex = header.indexOf('is_active');
  
  const rowIndex = rows.slice(1).findIndex(r => r[codeIndex] === code) + 1; // +1 to account for header

  if (rowIndex === 0) return; // Discount not found

  const targetCell = `discounts!D${rowIndex + 1}`; // D is the column for is_active

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: targetCell,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['FALSE']],
    },
  });

  console.log(`Discount code ${code} has been deactivated.`);
} 