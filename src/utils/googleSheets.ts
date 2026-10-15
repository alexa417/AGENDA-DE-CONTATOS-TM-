import { Lead } from '../types/lead';
import { getAccessToken, googleSignIn } from './googleAuth';

export interface GoogleSheetsExportResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  rowCount?: number;
  error?: string;
}

const HEADERS = [
  'No.',
  'Empresa',
  'Nombre',
  'Apellidos',
  'Puesto',
  'Giro / Servicio',
  'Teléfono Celular',
  'Teléfono Fijo',
  'Correo Electrónico',
  'Página Web',
  'Dirección',
  'Evento',
  'Lead Generator',
  'Tipo',
  'Estatus',
  'Notas / Requerimientos',
  'Foto Frente (URL)',
  'Foto Reverso (URL)',
  'Fecha de Registro',
];

export function formatLeadsForSheets(leads: Lead[]): (string | number)[][] {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  
  const rows = leads.map((l) => {
    const frontUrl = l.photoUrl
      ? l.photoUrl.startsWith('http')
        ? l.photoUrl
        : `${origin}${l.photoUrl}`
      : '';
    const backUrl = l.photoBackUrl
      ? l.photoBackUrl.startsWith('http')
        ? l.photoBackUrl
        : `${origin}${l.photoBackUrl}`
      : '';

    return [
      l.no || '',
      l.empresa || '',
      l.nombre || '',
      l.apellidos || '',
      l.puesto || '',
      l.giroServicio || '',
      l.celular || '',
      l.telefonoFijo || '',
      l.correo || '',
      l.paginaWeb || '',
      l.direccion || '',
      l.evento || 'EXPOPYME',
      l.leadGenerator || '',
      l.tipo || 'Lead',
      l.status || 'Pendiente',
      l.notas || '',
      frontUrl,
      backUrl,
      l.createdAt ? new Date(l.createdAt).toLocaleString('es-MX') : '',
    ];
  });

  return [HEADERS, ...rows];
}

export async function createGoogleSpreadsheet(
  token: string,
  leads: Lead[],
  customTitle?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; rowCount: number }> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const title = customTitle || `Contactos EXPOPYME - ${dateStr} (${leads.length} leads)`;

  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
        locale: 'es_MX',
      },
      sheets: [
        {
          properties: {
            title: 'Contactos',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Error creando hoja de cálculo (HTTP ${createRes.status})`
    );
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const sheetId = sheetData.sheets?.[0]?.properties?.sheetId ?? 0;

  // 2. Populate values
  const values = formatLeadsForSheets(leads);
  const range = `Contactos!A1:S${values.length}`;

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Error escribiendo datos en la hoja (HTTP ${updateRes.status})`
    );
  }

  // 3. Apply professional styles: dark header, white bold text, auto-resize columns
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          // Format header row (indigo/slate dark background, bold white text)
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: HEADERS.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.12, green: 0.16, blue: 0.23 }, // #1e293b
                  textFormat: {
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                    bold: true,
                    fontSize: 10,
                  },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          // Auto-resize columns to fit content
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: HEADERS.length,
              },
            },
          },
        ],
      }),
    });
  } catch (formatErr) {
    // Non-critical: styling failure does not affect data
    console.warn('Google Sheets formatting warning:', formatErr);
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return {
    spreadsheetId,
    spreadsheetUrl,
    rowCount: leads.length,
  };
}

export async function exportLeadsToGoogleSheets(
  leads: Lead[],
  customTitle?: string
): Promise<GoogleSheetsExportResult> {
  try {
    let token = await getAccessToken();

    // If not authenticated, trigger Google Sign-In popup
    if (!token) {
      const authResult = await googleSignIn();
      if (!authResult || !authResult.accessToken) {
        return {
          success: false,
          error: 'No se completó el inicio de sesión con Google.',
        };
      }
      token = authResult.accessToken;
    }

    const result = await createGoogleSpreadsheet(token, leads, customTitle);
    return {
      success: true,
      ...result,
    };
  } catch (err: any) {
    console.error('Error exportando a Google Sheets:', err);
    return {
      success: false,
      error: err.message || 'Error al exportar a Google Sheets',
    };
  }
}
