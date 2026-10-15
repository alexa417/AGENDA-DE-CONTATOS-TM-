import { Lead, LeadStatus } from '../types/lead';

/**
 * Exports leads to the exact CSV structure provided by the user:
 * Header line with emojis: 🙅🏻‍♀️  Rechazado,🌀 Contactado,💰 Nuevo Cierre,,,,,,,,,,,
 * Column headers: No.,Nombre,Apellidos,Empresa,Evento,Notas,Lead Generator,Giro/Servicio,Tipo,Celular,Telefono Fijo,Correo,Página Web,Puesto,Dirección
 */
export function exportToCSV(leads: Lead[], filename = 'Contactos_EXPOPYME.csv') {
  const emojiHeader = '🙅🏻‍♀️  Rechazado,🌀 Contactado,💰 Nuevo Cierre,,,,,,,,,,,';
  const columns = [
    'No.',
    'Nombre',
    'Apellidos',
    'Empresa',
    'Evento',
    'Notas',
    'Lead Generator',
    'Giro/Servicio',
    'Tipo',
    'Celular',
    'Telefono Fijo',
    'Correo',
    'Página Web',
    'Puesto',
    'Dirección',
  ];

  const escapeCSV = (value: any) => {
    if (value === null || value === undefined) return '';
    const stringVal = String(value);
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  };

  const rows = leads.map((lead) => {
    return [
      escapeCSV(lead.no),
      escapeCSV(lead.nombre),
      escapeCSV(lead.apellidos),
      escapeCSV(lead.empresa),
      escapeCSV(lead.evento),
      escapeCSV(lead.notas),
      escapeCSV(lead.leadGenerator),
      escapeCSV(lead.giroServicio),
      escapeCSV(lead.tipo),
      escapeCSV(lead.celular),
      escapeCSV(lead.telefonoFijo),
      escapeCSV(lead.correo),
      escapeCSV(lead.paginaWeb),
      escapeCSV(lead.puesto),
      escapeCSV(lead.direccion),
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel opens Spanish accents (á, é, í, ó, ú, ñ) correctly
  const csvContent = '\uFEFF' + [emojiHeader, columns.join(','), ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses raw CSV lines into Lead items
 */
export function parseCSV(csvText: string): Partial<Lead>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const results: Partial<Lead>[] = [];

  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (lines[i].toLowerCase().includes('nombre') && lines[i].toLowerCase().includes('empresa')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
  }

  // Regex-based CSV parser taking quotes into account
  const parseLine = (text: string): string[] => {
    const entries: string[] = [];
    let entry = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          entry += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        entries.push(entry.trim());
        entry = '';
      } else {
        entry += c;
      }
    }
    entries.push(entry.trim());
    return entries;
  };

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length < 3) continue;

    const no = values[0] || i;
    const nombre = values[1] || '';
    const apellidos = values[2] || '';
    const empresa = values[3] || '';
    const evento = values[4] || 'EXPOPYME';
    const notas = values[5] || '';
    const leadGenerator = values[6] || '';
    const giroServicio = values[7] || '';
    const tipo = values[8] || 'Lead';
    const celular = values[9] || '';
    const telefonoFijo = values[10] || '';
    const correo = values[11] || '';
    const paginaWeb = values[12] || '';
    const puesto = values[13] || '';
    const direccion = values[14] || '';

    let status: LeadStatus = 'Pendiente';
    const notesLower = notas.toLowerCase();
    if (notesLower.includes('se envio') || notesLower.includes('contactad')) {
      status = 'Contactado';
    } else if (notesLower.includes('no contesta') || notesLower.includes('no esta interesado') || notesLower.includes('equivocado')) {
      status = 'Rechazado';
    }

    results.push({
      no,
      nombre,
      apellidos,
      empresa,
      evento,
      notas,
      leadGenerator,
      giroServicio,
      tipo,
      celular,
      telefonoFijo,
      correo,
      paginaWeb,
      puesto,
      direccion,
      status,
    });
  }

  return results;
}
