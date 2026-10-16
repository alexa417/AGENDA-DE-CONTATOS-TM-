import { createClient } from '@supabase/supabase-js';
import type { Lead, LeadStatus } from '../types/lead';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mmpdquroegckjuhvfkns.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MX-7YFljw6nqki7qYQlBlg_uqnV4KfW';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const STORAGE_KEY = 'autolead_crm_leads_v1';
const STORAGE_PENDING_KEY = 'autolead_crm_pending_v1';
const IMAGE_BUCKET = 'crm-card-images';

function mapStatus(status: string | null | undefined): LeadStatus {
  if (status === 'Contactado') return 'Contactado';
  if (status === 'Rechazado') return 'Rechazado';
  if (status === 'Cerrado' || status === 'Nuevo Cierre') return 'Nuevo Cierre';
  return 'Pendiente';
}

function dbStatus(status: LeadStatus): string {
  if (status === 'Nuevo Cierre') return 'Cerrado';
  if (status === 'Pendiente') return 'Nuevo';
  return status;
}

async function signedPhoto(path: string | null | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(path, 3600);
  if (error) return undefined;
  return data.signedUrl;
}

async function mapRow(row: any): Promise<Lead> {
  const [photoUrl, photoBackUrl] = await Promise.all([
    signedPhoto(row.front_image_path),
    signedPhoto(row.back_image_path),
  ]);
  return {
    id: String(row.app_id || row.id),
    no: row.numero ?? '',
    nombre: row.nombre ?? '',
    apellidos: row.apellidos ?? '',
    empresa: row.empresa ?? '',
    evento: row.evento ?? 'EXPOPYME',
    notas: row.notas ?? row.informacion_adicional ?? '',
    leadGenerator: row.responsable ?? '',
    giroServicio: row.giro_servicio ?? row.servicios ?? '',
    tipo: row.tipo ?? 'Lead',
    celular: row.celular ?? row.whatsapp ?? '',
    telefonoFijo: row.telefono_fijo ?? '',
    correo: row.correo ?? '',
    paginaWeb: row.pagina_web ?? '',
    puesto: row.puesto ?? '',
    direccion: row.direccion ?? '',
    status: mapStatus(row.status),
    createdAt: row.created_at ?? new Date().toISOString(),
    photoUrl,
    photoBackUrl,
    confidence: row.ocr_confidence == null ? undefined : Number(row.ocr_confidence),
    rawTextSummary: row.ocr_raw?.summary,
    ocrTextLines: row.ocr_raw?.lines,
  };
}

async function uploadPhoto(value: string | undefined, leadId: string, side: 'front' | 'back'): Promise<string | null> {
  if (!value) return null;
  if (!value.startsWith('data:image/')) return value.startsWith('crm-card-images/') ? value : null;
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i);
  if (!match) throw new Error('La foto debe ser JPEG, PNG o WebP.');
  const mime = match[1].toLowerCase();
  const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  if (bytes.byteLength > 3 * 1024 * 1024) throw new Error('Cada foto debe pesar menos de 3 MB.');
  const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
  const path = `${leadId}/${side}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw error;
  return path;
}

async function toRow(lead: Lead) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw new Error('Tu sesión terminó. Inicia sesión nuevamente.');
  const [frontPath, backPath] = await Promise.all([
    uploadPhoto(lead.photoUrl, lead.id, 'front'),
    uploadPhoto(lead.photoBackUrl, lead.id, 'back'),
  ]);
  return {
    app_id: lead.id,
    numero: String(lead.no ?? ''),
    nombre: lead.nombre ?? '',
    apellidos: lead.apellidos ?? '',
    empresa: lead.empresa ?? '',
    evento: lead.evento ?? 'EXPOPYME',
    notas: lead.notas ?? '',
    responsable: lead.leadGenerator ?? '',
    giro_servicio: lead.giroServicio ?? '',
    tipo: lead.tipo ?? 'Lead',
    celular: lead.celular ?? '',
    telefono_fijo: lead.telefonoFijo ?? '',
    correo: lead.correo ?? '',
    pagina_web: lead.paginaWeb ?? '',
    puesto: lead.puesto ?? '',
    direccion: lead.direccion ?? '',
    status: dbStatus(lead.status),
    created_by: userId,
    front_image_path: frontPath,
    back_image_path: backPath,
    ocr_confidence: lead.confidence ?? null,
    ocr_raw: lead.rawTextSummary || lead.ocrTextLines ? {
      summary: lead.rawTextSummary ?? null,
      lines: lead.ocrTextLines ?? [],
    } : null,
  };
}

function cache(leads: Lead[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads.map(l => ({
      ...l,
      photoUrl: l.photoUrl?.startsWith('data:') ? undefined : l.photoUrl,
      photoBackUrl: l.photoBackUrl?.startsWith('data:') ? undefined : l.photoBackUrl,
    }))));
  } catch (error) {
    console.warn('No se pudo actualizar la caché local:', error);
  }
}

export function getLocalCachedLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Lead[] : [];
  } catch { return []; }
}
export function saveLocalCachedLeads(leads: Lead[]) { cache(leads); }
export function getPendingSyncLeads(): Lead[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_PENDING_KEY) || '[]') as Lead[]; } catch { return []; }
}
export function addPendingLead(lead: Lead) {
  // Do not silently queue writes that could be replayed into the wrong account.
  try { localStorage.setItem(STORAGE_PENDING_KEY, JSON.stringify([lead, ...getPendingSyncLeads().filter(l => l.id !== lead.id)])); } catch {}
}
export function removePendingLead(id: string) {
  try { localStorage.setItem(STORAGE_PENDING_KEY, JSON.stringify(getPendingSyncLeads().filter(l => l.id !== id))); } catch {}
}
export function clearPendingLeads() { try { localStorage.removeItem(STORAGE_PENDING_KEY); } catch {} }
export function getDeletedLeadIds(): Set<string> { return new Set(); }
export function markLeadAsDeleted(_id: string) {}
export function clearDeletedTombstones() {}
export async function getIndexedDBLeads(): Promise<Lead[]> { return []; }
export async function deleteFromIndexedDB(_id: string): Promise<void> {}
export async function getAnyUnsavedLocalLeads(_serverLeads: Lead[]): Promise<Lead[]> {
  // Local cache is never auto-imported; this prevents deleted or stale contacts being resurrected.
  return [];
}

export async function fetchServerLeadsWithStatus(): Promise<{leads: Lead[]; ok: boolean; version?: number; error?: string}> {
  try {
    const { data, error } = await supabase.from('contacts').select('*').is('deleted_at', null).order('created_at', { ascending: true });
    if (error) throw error;
    const leads = await Promise.all((data ?? []).map(mapRow));
    cache(leads);
    return { leads, ok: true, version: Date.now() };
  } catch (error: any) {
    return { leads: getLocalCachedLeads(), ok: false, error: error.message || 'Error de conexión con Supabase' };
  }
}
export async function fetchServerLeads(): Promise<Lead[]> {
  const result = await fetchServerLeadsWithStatus();
  if (!result.ok) throw new Error(result.error || 'No se pudieron cargar los contactos');
  return result.leads;
}
export async function addLeadToServer(lead: Lead): Promise<{success: boolean; lead?: Lead; error?: string}> {
  try {
    const row = await toRow(lead);
    const { data, error } = await supabase.from('contacts').upsert(row, { onConflict: 'app_id' }).select('*').single();
    if (error) throw error;
    const saved = await mapRow(data);
    removePendingLead(lead.id);
    return { success: true, lead: saved };
  } catch (error: any) {
    console.error('No se pudo guardar el contacto:', error);
    return { success: false, error: error.message || 'Error al guardar' };
  }
}
export async function addBatchLeadsToServer(batch: Lead[]): Promise<{success: boolean; count?: number; error?: string}> {
  let count = 0;
  for (const lead of batch) {
    const result = await addLeadToServer(lead);
    if (!result.success) return { success: false, count, error: result.error };
    count++;
  }
  return { success: true, count };
}
export async function updateLeadOnServer(id: string, patch: Partial<Lead>): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('contacts').select('*').eq('app_id', id).is('deleted_at', null).single();
    if (error) throw error;
    const current = await mapRow(data);
    const result = await addLeadToServer({ ...current, ...patch, id });
    return result.success;
  } catch (error) {
    console.error('No se pudo actualizar el contacto:', error);
    return false;
  }
}
export async function deleteLeadOnServer(id: string): Promise<boolean> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return false;
    const { error } = await supabase.from('contacts').update({
      deleted_at: new Date().toISOString(),
      deleted_by: authData.user.id,
    }).eq('app_id', id).is('deleted_at', null);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('No se pudo eliminar el contacto:', error);
    return false;
  }
}
export async function resetServerLeads(): Promise<Lead[]> {
  // Safe by design: never reset or overwrite production data from a generic UI button.
  return fetchServerLeads();
}
export async function syncPendingLeadsToServer(): Promise<number> {
  // Pending items are not replayed automatically across account sessions.
  return 0;
}
