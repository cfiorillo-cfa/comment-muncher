import type { Comment } from '../types';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

function buildSheetsData(
  comments: Comment[],
  hasThreading: boolean
): { headers: string[]; rows: (string | number | boolean)[][] } {
  const headers = hasThreading
    ? ['Thread', 'Reply', 'Author', 'Date', 'Comment', 'Highlighted Text', 'Location', 'Resolved']
    : ['Author', 'Date', 'Comment', 'Highlighted Text', 'Location'];

  const rows = comments.map(c => {
    const base: (string | number | boolean)[] = [c.author, c.date, c.text, c.highlightedContent, c.location];
    if (hasThreading) {
      return [
        c.threadId,
        c.isReply,
        ...base,
        c.resolved === null ? '' : c.resolved,
      ];
    }
    return base;
  });

  return { headers, rows };
}

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
  const { headers, rows } = buildSheetsData(comments, hasThreading);

  const writeRes = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/Comments!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers, ...rows] }),
    }
  );

  if (!writeRes.ok) throw new Error("Couldn't write data to the spreadsheet. Please try again.");

  // Format: Thread column as integer, Date column as datetime
  const requests = [];
  if (hasThreading) {
    // Thread column (A) — number with 0 decimals
    requests.push({
      repeatCell: {
        range: { sheetId: 0, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '0' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
    // Date column (D) — datetime format
    requests.push({
      repeatCell: {
        range: { sheetId: 0, startRowIndex: 1, startColumnIndex: 3, endColumnIndex: 4 },
        cell: { userEnteredFormat: { numberFormat: { type: 'DATE_TIME', pattern: 'yyyy-mm-dd hh:mm' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  } else {
    // Date column (B) — datetime format
    requests.push({
      repeatCell: {
        range: { sheetId: 0, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
        cell: { userEnteredFormat: { numberFormat: { type: 'DATE_TIME', pattern: 'yyyy-mm-dd hh:mm' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  }

  // Bold header row
  requests.push({
    repeatCell: {
      range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
      cell: { userEnteredFormat: { textFormat: { bold: true } } },
      fields: 'userEnteredFormat.textFormat.bold',
    },
  });

  await fetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  return spreadsheetUrl;
}
