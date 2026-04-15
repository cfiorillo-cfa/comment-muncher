import type { Comment } from '../types';
import { buildExportData } from '../export/build-rows';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function exportToSheets(
  comments: Comment[], filename: string, hasThreading: boolean, accessToken: string
): Promise<string> {
  const createRes = await fetch(SHEETS_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: `${filename}_comments` },
      sheets: [{ properties: { title: 'Comments' } }],
    }),
  });

  if (!createRes.ok) throw new Error("Couldn't create the spreadsheet. Please try again.");

  const { spreadsheetId, spreadsheetUrl } = await createRes.json();
  const { headers, rows } = buildExportData(comments, hasThreading);

  const writeRes = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/Comments!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers, ...rows] }),
    }
  );

  if (!writeRes.ok) throw new Error("Couldn't write data to the spreadsheet. Please try again.");

  return spreadsheetUrl;
}
