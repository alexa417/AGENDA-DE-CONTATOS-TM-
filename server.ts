import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { INITIAL_LEADS } from './src/data/initialLeads.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'leads-database.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory authority cache with atomic file persistence
let serverLeads: any[] = [];
let lastModifiedTime = Date.now();
let versionCounter = 1;

function initializeServerLeads() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      serverLeads = [...INITIAL_LEADS];
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_LEADS, null, 2), 'utf8');
      return;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    serverLeads = Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_LEADS];
    console.log(`[Database] Initialized with ${serverLeads.length} leads`);
  } catch (err) {
    console.error('Error loading leads database on init:', err);
    serverLeads = [...INITIAL_LEADS];
  }
}
initializeServerLeads();

function saveLeadsToServerAtomic(leads: any[]) {
  serverLeads = leads;
  lastModifiedTime = Date.now();
  versionCounter++;
  try {
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(leads, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Error atomic writing leads to disk:', err);
  }
}

function persistLeadPhotos(lead: any): any {
  if (!lead) return lead;
  const processed = { ...lead };

  const savePhotoField = (urlField: string, suffix: string) => {
    const val = processed[urlField];
    if (typeof val === 'string' && val.startsWith('data:image/')) {
      try {
        const commaIdx = val.indexOf(',');
        if (commaIdx > -1) {
          const header = val.slice(0, commaIdx);
          const base64Data = val.slice(commaIdx + 1);
          const mimeMatch = header.match(/image\/([a-zA-Z0-9+.-]+)/);
          const rawExt = mimeMatch ? mimeMatch[1].toLowerCase() : 'jpg';
          const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
          const fileName = `${lead.id}-${suffix}.${ext}`;
          const filePath = path.join(UPLOADS_DIR, fileName);
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          processed[urlField] = `/uploads/${fileName}`;
        }
      } catch (e) {
        console.warn(`Error saving ${suffix} photo to disk:`, e);
      }
    }
  };

  savePhotoField('photoUrl', 'front');
  savePhotoField('photoBackUrl', 'back');
  return processed;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // CORS & Security headers for cross-device synchronization (Phone <-> PC)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Middleware with high limits for base64 business card and document photos
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // Serve persistent photos statically with long cache
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1d' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      leadsCount: serverLeads.length,
      timestamp: new Date().toISOString(),
    });
  });

  // Sync status lightweight ping endpoint
  app.get('/api/sync/status', (_req, res) => {
    res.json({
      success: true,
      leadCount: serverLeads.length,
      lastModifiedTime,
      version: versionCounter,
      serverTime: Date.now(),
    });
  });

  // Real-time synchronization endpoints across devices (Phone <-> PC)
  app.get('/api/leads', (_req, res) => {
    res.json({
      success: true,
      leads: serverLeads,
      version: versionCounter,
      lastModifiedTime,
    });
  });

  app.post('/api/leads', (req, res) => {
    let newLead = req.body;
    if (!newLead || !newLead.id) {
      return res.status(400).json({ error: 'Lead data is required' });
    }
    newLead = persistLeadPhotos(newLead);
    const exists = serverLeads.find((l: any) => l.id === newLead.id);
    let updated;
    if (exists) {
      updated = serverLeads.map((l: any) => (l.id === newLead.id ? newLead : l));
    } else {
      updated = [newLead, ...serverLeads];
    }
    saveLeadsToServerAtomic(updated);
    res.json({ success: true, lead: newLead, total: updated.length, version: versionCounter });
  });

  app.post('/api/leads/batch', (req, res) => {
    const { batch } = req.body;
    if (!Array.isArray(batch)) {
      return res.status(400).json({ error: 'Batch must be an array' });
    }
    const processedBatch = batch.map(persistLeadPhotos);
    // Avoid duplicates
    const incomingIds = new Set(processedBatch.map((l: any) => l.id));
    const nonDuplicates = serverLeads.filter((l: any) => !incomingIds.has(l.id));
    const updated = [...processedBatch, ...nonDuplicates];
    saveLeadsToServerAtomic(updated);
    res.json({ success: true, count: batch.length, total: updated.length, version: versionCounter });
  });

  app.put('/api/leads/:id', (req, res) => {
    const id = req.params.id;
    const patch = req.body;
    const updated = serverLeads.map((l: any) => (l.id === id ? { ...l, ...patch } : l));
    saveLeadsToServerAtomic(updated);
    res.json({ success: true, version: versionCounter });
  });

  app.delete('/api/leads/:id', (req, res) => {
    const id = req.params.id;
    const updated = serverLeads.filter((l: any) => l.id !== id);
    saveLeadsToServerAtomic(updated);
    res.json({ success: true, total: updated.length, version: versionCounter });
  });

  app.post('/api/leads/reset', (_req, res) => {
    saveLeadsToServerAtomic(INITIAL_LEADS);
    res.json({ success: true, leads: INITIAL_LEADS, version: versionCounter });
  });

  // Helper to extract clean base64 and valid MIME type
  function cleanAndNormalizeImage(dataUrl: string, fallbackMime = 'image/jpeg'): { cleanBase64: string; mimeType: string } {
    if (typeof dataUrl === 'string' && dataUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, dataUrl);
      if (fs.existsSync(filePath)) {
        try {
          const buf = fs.readFileSync(filePath);
          return { cleanBase64: buf.toString('base64'), mimeType: 'image/jpeg' };
        } catch {
          // continue fallback
        }
      }
    }
    let mimeType = fallbackMime;
    const match = typeof dataUrl === 'string' ? dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,/) : null;
    if (match) {
      mimeType = match[1].toLowerCase();
    }
    if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mimeType)) {
      mimeType = 'image/jpeg';
    }
    const cleanBase64 = typeof dataUrl === 'string'
      ? dataUrl.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '')
      : '';
    return { cleanBase64, mimeType };
  }

  // Endpoint to extract lead data from an uploaded business card/photo
  app.post('/api/extract-lead', async (req, res) => {
    try {
      const {
        imageBase64,
        frontImageBase64,
        backImageBase64,
        mimeType = 'image/jpeg',
        backMimeType = 'image/jpeg',
        defaultEvent = 'EXPOPYME',
        defaultLeadGenerator = '',
        additionalContext = '',
      } = req.body;

      const primaryImage = frontImageBase64 || imageBase64;
      if (!primaryImage) {
        return res.status(400).json({ error: 'Al menos una imagen (frente de la tarjeta o foto) es requerida.' });
      }

      const frontNormalized = cleanAndNormalizeImage(primaryImage, mimeType);
      const backNormalized = backImageBase64
        ? cleanAndNormalizeImage(backImageBase64, backMimeType)
        : null;

      const parts: any[] = [];
      parts.push({
        inlineData: {
          mimeType: frontNormalized.mimeType,
          data: frontNormalized.cleanBase64,
        },
      });

      if (backNormalized) {
        parts.push({
          inlineData: {
            mimeType: backNormalized.mimeType,
            data: backNormalized.cleanBase64,
          },
        });
      }

      const systemPrompt = `Eres un sistema OCR de visión computacional e inteligencia artificial de máxima precisión especializado en reconocer y transcribir datos de fotos de tarjetas de presentación (business cards), gafetes de conferencias/expos, folletos, catálogos y notas de negocios.

${
  backNormalized
    ? 'ATENCIÓN: Se han adjuntado DOS imágenes correspondientes al FRENTE (primera foto) y al REVERSO (segunda foto) de la misma tarjeta de presentación. Lee e integra minuciosamente la información de AMBAS caras: nombres, teléfonos, emails, redes, dirección, servicios ofrecidos y anotaciones a mano.'
    : 'Se ha adjuntado una foto de la tarjeta de presentación, gafete o documento.'
}

INSTRUCCIONES CLAVE DE VISIÓN Y OCR PARA REGISTRAR TODOS LOS DATOS COMPLETOS:
1. ORIENTACIÓN Y ÁNGULO: La imagen puede haber sido tomada con celular en vertical u horizontal, rotada 90°, 180° o 270°, o con inclinación. Rota mentalmente la foto si es necesario y lee minuciosamente absolutamente todo el texto en cualquier orientación.
2. NOMBRE Y APELLIDOS: Si la tarjeta contiene el nombre de una persona (ej. "Ing. Roberto Carlos Garza Villarreal", "M.C. Francisco Gutiérrez", "Dra. Ana Luisa Morales", "César Requenes"), coloca el título y nombres de pila en "nombre" (ej. "Ing. Roberto Carlos") y los apellidos en "apellidos" (ej. "Garza Villarreal"). Si el nombre completo no se puede separar fácilmente, pon el nombre completo en "nombre". NUNCA lo omitas si está visible en la tarjeta.
3. EMPRESA Y LOGOTIPO: Identifica el nombre comercial, razón social o logotipo de la empresa o institución (ej. "TCA Logistics", "Instituto Kaizen Equus", "Busch Vacuum México S. de R.L. de C.V.", "CAINTRA", "Autentico SEO"). Busca en el encabezado, logotipo o texto principal.
4. PUESTO / CARGO LABORAL: Busca atentamente el cargo, puesto o rol laboral de la persona (ej. "Operations Director", "Gerente de Aftersales", "Logistics Executive", "Director General", "Gerente de Ventas", "Fundador", "Asesor de Seguros", "Consultor"). Suele estar inmediatamente debajo o al lado del nombre o en letras más pequeñas. NO lo dejes vacío si existe en la tarjeta.
5. TELÉFONOS (CELULAR / WHATSAPP / FIJO):
   - Extrae TODOS los números telefónicos legibles.
   - En "celular": coloca el teléfono celular, número con ícono de WhatsApp, o móvil (ej. "+52 81 2032 7881", "+1 (956) 679 4053", "8116294590"). Si solo hay un único teléfono en la tarjeta, colócalo en "celular" para habilitar el botón de WhatsApp directo.
   - En "telefonoFijo": coloca teléfonos de oficina con extensiones o conmutador (ej. "+52 81 8311 1385 Ext. 102", "(81) 8356-9000", "+1 (956) 702 4167").
6. CORREO ELECTRÓNICO: Busca cualquier dirección de correo (@) en cualquier tamaño de fuente (ej. "gabriela.teruel@busch.com.mx", "crequenes@tcalogistics.us").
7. PÁGINA WEB Y REDES SOCIALES: Extrae dominios web (ej. "www.buschvacuum.com", "tcalogistics.us", "www.KaizenEquus.com") y perfiles de redes sociales.
8. DIRECCIÓN FÍSICA Y CIUDAD: Extrae la dirección física completa: calle, número exterior/interior, parque industrial, suite/nave, colonia, código postal (C.P.), ciudad (ej. Monterrey, Apodaca, San Pedro Garza García, Pharr TX, Saltillo) y país.
9. GIRO / CATÁLOGO DE SERVICIOS: Describe o lista los servicios, productos o especialidades de la empresa, especialmente los listados en viñetas o en el reverso de la tarjeta (ej. "Logística y transporte internacional de carga", "Soluciones de vacío y mantenimiento industrial", "Coaching ejecutivo con caballos").
10. NOTAS Y OBSERVACIONES: Incluye lemas, acuerdos, anotaciones a mano / manuscritas a pluma (ej. "interesado en cotización", "llamar el viernes"), sucursales secundarias o detalles clave de la tarjeta.
11. TRANSCRIPCIÓN COMPLETA (ocrTextLines y rawTextSummary): En "ocrTextLines", entrega un arreglo con CADA UNA de las líneas de texto que leíste en la imagen sin omitir ninguna palabra. En "rawTextSummary", entrega una transcripción textual ordenada de toda la tarjeta.

Campos del JSON:
- "nombre": Nombre de pila y título profesional si aplica.
- "apellidos": Apellidos de la persona.
- "empresa": Nombre comercial o razón social.
- "evento": "${defaultEvent || 'EXPOPYME'}".
- "notas": Notas, resumen de servicios, anotaciones a pluma.
- "leadGenerator": "${defaultLeadGenerator || ''}".
- "giroServicio": Giro o catálogo de servicios de la empresa.
- "tipo": "Lead", "Lead Potencial", "Alianza", "Proveedor" o "Cliente".
- "celular": Teléfono móvil / WhatsApp.
- "telefonoFijo": Teléfono de oficina / conmutador / extensiones.
- "correo": Correo electrónico.
- "paginaWeb": Sitio web o redes sociales.
- "puesto": Cargo o puesto de la persona.
- "direccion": Dirección física completa y ciudad.
- "status": "Pendiente" o estado actual.
- "confidence": Número de 1 a 100 de confianza visual.
- "rawTextSummary": Resumen textual de todo lo leído.
- "ocrTextLines": Arreglo de todas las líneas leídas.`;

      parts.push({ text: systemPrompt });

      // Multi-model resilient fallback chain:
      // gemini-3.1-flash-lite has separate quota and ultra-fast multimodal response
      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
      let lastError: any = null;
      let rawResponseText = '';

      for (const modelName of candidateModels) {
        try {
          console.log(`[OCR] Procesando imagen con modelo: ${modelName}...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts,
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          rawResponseText = response.text || '';
          if (rawResponseText) {
            console.log(`[OCR] Éxito con modelo ${modelName}`);
            lastError = null;
            break;
          }
        } catch (err: any) {
          console.warn(`[OCR] Error con ${modelName}:`, err.message || err);
          lastError = err;
          // Wait 300ms before trying the fallback model
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (!rawResponseText && lastError) {
        throw lastError;
      }

      // Robust JSON extraction
      let extracted: any = {};
      try {
        extracted = JSON.parse(rawResponseText);
      } catch (jsonErr) {
        console.warn('[OCR] JSON directo falló, extrayendo bloque JSON...');
        const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[0]);
        }
      }

      // Sanitize and enhance extracted fields
      extracted.nombre = (extracted.nombre || '').replace(/^(N\/A|None|null)$/i, '').trim();
      extracted.apellidos = (extracted.apellidos || '').replace(/^(N\/A|None|null)$/i, '').trim();
      extracted.empresa = (extracted.empresa || '').replace(/^(N\/A|None|null)$/i, '').trim();
      extracted.puesto = (extracted.puesto || '').replace(/^(N\/A|None|null)$/i, '').trim();
      extracted.celular = (extracted.celular || '').replace(/^(N\/A|None|null)$/i, '').trim();
      extracted.telefonoFijo = (extracted.telefonoFijo || '').replace(/^(N\/A|None|null)$/i, '').trim();
      extracted.correo = (extracted.correo || '').replace(/^(N\/A|None|null)$/i, '').trim();
      extracted.paginaWeb = (extracted.paginaWeb || '').replace(/^(N\/A|None|null)$/i, '').trim();
      extracted.direccion = (extracted.direccion || '').replace(/^(N\/A|None|null)$/i, '').trim();
      extracted.giroServicio = (extracted.giroServicio || '').replace(/^(N\/A|None|null)$/i, '').trim();
      extracted.notas = (extracted.notas || '').replace(/^(N\/A|None|null)$/i, '').trim();

      // Fallback: If celular is empty but telefonoFijo has a phone number, mirror to celular
      if (!extracted.celular && extracted.telefonoFijo) {
        extracted.celular = extracted.telefonoFijo;
      }

      // If nombre is empty but we have ocrTextLines, try to infer person name or professional title
      if (!extracted.nombre && Array.isArray(extracted.ocrTextLines) && extracted.ocrTextLines.length > 0) {
        const titleRegex = /^(ing\.|lic\.|dr\.|dra\.|arq\.|c\.p\.|m\.c\.|prof\.)/i;
        const candidateLine = extracted.ocrTextLines.find((l: string) => titleRegex.test(l.trim()));
        if (candidateLine) {
          extracted.nombre = candidateLine.trim();
        }
      }

      // If empresa is still empty, derive from ocrTextLines
      if (!extracted.empresa && Array.isArray(extracted.ocrTextLines) && extracted.ocrTextLines.length > 0) {
        extracted.empresa = extracted.ocrTextLines[0] || 'Contacto detectado';
      }

      return res.json({ success: true, lead: extracted });
    } catch (err: any) {
      console.error('Error al extraer datos de la imagen con Gemini:', err);
      return res.status(500).json({
        error: 'No se pudo procesar la imagen con el servicio OCR',
        message: err.message || 'Error procesando la imagen',
      });
    }
  });

  // Setup Vite in development or static serve in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoLead server listening on port ${PORT}`);
  });
}

startServer();
