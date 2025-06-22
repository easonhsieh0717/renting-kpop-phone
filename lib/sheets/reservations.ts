import { google } from 'googleapis';

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

export async function updateReservationStatus(orderId: string, status: string): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is not configured');
  }

  const range = 'reservations!A:J';
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (!rows) {
    console.log('No data found in reservations sheet.');
    return;
  }

  const rowIndex = rows.findIndex(row => row[0] === orderId);
  if (rowIndex === -1) {
    console.log(`Order ID ${orderId} not found.`);
    return;
  }

  // Column I is the 9th column (status) after adding phone number
  const targetCell = `reservations!I${rowIndex + 1}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: targetCell,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[status]],
    },
  });

  console.log(`Order ${orderId} status updated to ${status}`);
}

export type PaidReservation = {
  phoneId: string;
  from: Date;
  to: Date;
}

/**
 * 從 Google Sheets 獲取所有已付款的預約紀錄
 * @returns A promise that resolves to an array of all paid reservations.
 */
export async function getAllPaidReservations(): Promise<PaidReservation[]> {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
        throw new Error('GOOGLE_SHEET_ID is not configured');
    }

    const range = 'reservations!A:J'; // OrderID, PhoneID, Start, End, ..., Status
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            return []; // No data or only header
        }
        
        // Skip header row
        const reservations = rows.slice(1);

        const paidReservations = reservations
            .filter(row => {
                const status = row[8]; // Status is in the 9th column (index 8)
                // Ensure row has enough columns to prevent errors
                return row && row.length > 8 && status === 'PAID';
            })
            .map(row => {
                return {
                  phoneId: row[1],
                  from: new Date(row[2]),
                  to: new Date(row[3])
                };
            })
            .filter(r => r.phoneId && !isNaN(r.from.getTime()) && !isNaN(r.to.getTime())); // Filter out invalid data

        return paidReservations;
    } catch (error: any) {
        // If sheet doesn't exist, it's not an error, just means no reservations yet.
        if (error.message && error.message.includes('Unable to parse range')) {
          console.log("Reservations sheet doesn't exist yet. Returning empty array.");
          return [];
        }
        console.error('Error fetching all reservations from Google Sheets:', error);
        return []; // Return empty array on other errors to prevent crashes
    }
}

export async function getBookedDates(phoneId: string): Promise<{ from: Date; to: Date }[]> {
    try {
      const allReservations = await getAllPaidReservations();
      const bookedDates = allReservations
        .filter(r => r.phoneId === phoneId)
        .map(r => {
            // Add one day buffer to the end date for the calendar disabling
            const endDate = new Date(r.to);
            endDate.setDate(endDate.getDate() + 1);
            return { from: r.from, to: endDate };
        });
      return bookedDates;
    } catch (error) {
       console.error(`Error getting booked dates for ${phoneId}:`, error);
       return [];
    }
} 