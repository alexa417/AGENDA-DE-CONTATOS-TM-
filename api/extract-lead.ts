import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mmpdquroegckjuhvfkns.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MX-7YFljw6nqki7qYQlBlg_uqnV4KfW';
const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Inicia sesión para escanear tarjetas.' });

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return res.status(401).json({ error: 'Sesión no válida. Inicia sesión nuevamente.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel.' });

  try {
    const { frontImageBase64, backImageBase64, imageBase64, mimeType = 'image/jpeg', backMimeType = 'image/jpeg', defaultEvent = 'EXPOPYME', defaultLeadGenerator = '', additionalContext = '' } = req.body || {};
    const front = frontImageBase64 || imageBase64;
    if (typeof front !== 'string' || front.length < 20) return res.status(400).json({ error: 'Adjunta una foto de la tarjeta.' });
    if (front.length > 4_200_000 || (typeof backImageBase64 === 'string' && backImageBase64.length > 4_200_000)) {
      return res.status(413).json({ error: 'La imagen es demasiado grande. Usa una foto de menos de 3 MB.' });
    }

    const imagePart = (value: string, mime: string) => {
      const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i);
      const normalizedMime = (match?.[1] || mime).toLowerCase();
      if (!allowedMimes.has(normalizedMime)) throw new Error('Formato de imagen no permitido. Usa JPG, PNG o WebP.');
      const data = match ? match[2] : value.replace(/^data:[^;]+;base64,/, '');
      if (!/^[A-Za-z0-9+/=\s]+$/.test(data)) throw new Error('La imagen no tiene un formato válido.');
      return { inlineData: { mimeType: normalizedMime, data: data.replace(/\s/g, '') } };
    };

    const parts: any[] = [imagePart(front, mimeType)];
    if (backImageBase64) parts.push(imagePart(backImageBase64, backMimeType));
    parts.push({ text: `Extrae con precisión la información de esta tarjeta de presentación. Si hay frente y reverso, combina ambos. No inventes datos; usa cadena vacía si no se ve. Responde únicamente JSON. Evento predeterminado: ${String(defaultEvent).slice(0,100)}. Responsable: ${String(defaultLeadGenerator).slice(0,100)}. Contexto adicional: ${String(additionalContext).slice(0,500)}. Separa nombre y apellidos cuando sea posible.` });

    const ai = new GoogleGenAI({ apiKey });
    const generated = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nombre: { type: Type.STRING }, apellidos: { type: Type.STRING }, empresa: { type: Type.STRING },
            evento: { type: Type.STRING }, notas: { type: Type.STRING }, leadGenerator: { type: Type.STRING },
            giroServicio: { type: Type.STRING }, tipo: { type: Type.STRING }, celular: { type: Type.STRING },
            telefonoFijo: { type: Type.STRING }, correo: { type: Type.STRING }, paginaWeb: { type: Type.STRING },
            puesto: { type: Type.STRING }, direccion: { type: Type.STRING }, confidence: { type: Type.NUMBER },
            rawTextSummary: { type: Type.STRING }, ocrTextLines: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['nombre','apellidos','empresa','evento','notas','leadGenerator','giroServicio','tipo','celular','telefonoFijo','correo','paginaWeb','puesto','direccion','confidence','rawTextSummary','ocrTextLines']
        }
      }
    });

    const parsed = JSON.parse(generated.text || '{}');
    const lead = {
      ...parsed,
      evento: parsed.evento || defaultEvent,
      leadGenerator: parsed.leadGenerator || defaultLeadGenerator,
      status: 'Pendiente',
      createdAt: new Date().toISOString(),
      id: `lead-scanned-${crypto.randomUUID()}`,
      no: '',
    };
    return res.status(200).json({ success: true, lead });
  } catch (error: any) {
    const message = String(error?.message || 'No se pudo procesar la tarjeta');
    return res.status(400).json({ success: false, error: message.slice(0, 300) });
  }
}
