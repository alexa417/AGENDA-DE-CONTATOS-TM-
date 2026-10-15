import { Lead } from '../types/lead';
import { INITIAL_LEADS } from '../data/initialLeads';

const STORAGE_KEY = 'autolead_crm_leads_v1';
const IDB_DB_NAME = 'autolead_crm_db';
const IDB_STORE_NAME = 'leads_cache';

// IndexedDB helper for unlimited local storage capacity
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(IDB_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIndexedDB(leads: Lead[]): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(IDB_STORE_NAME);
    // Clear and re-populate
    store.clear();
    for (const lead of leads) {
      store.put(lead);
    }
  } catch (err) {
    // Graceful silent fallback
    console.warn('IndexedDB write skipped:', err);
  }
}

// Retrieve all leads stored in IndexedDB (recovers any leads saved when localStorage was full)
export async function getIndexedDBLeads(): Promise<Lead[]> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(Array.isArray(req.result) ? req.result : []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Check both localStorage, pending queue, and IndexedDB for any leads not present on server
export async function getAnyUnsavedLocalLeads(serverLeads: Lead[]): Promise<Lead[]> {
  const serverIdSet = new Set(serverLeads.map((l) => l.id));
  const candidateLeads: Lead[] = [];

  // Check pending queue
  const pending = getPendingSyncLeads();
  candidateLeads.push(...pending);

  // Check localStorage
  const local = getLocalCachedLeads();
  candidateLeads.push(...local);

  // Check IndexedDB
  const idb = await getIndexedDBLeads();
  candidateLeads.push(...idb);

  // Deduplicate and filter to only those missing from server
  const seen = new Set<string>();
  const missing: Lead[] = [];
  for (const lead of candidateLeads) {
    if (lead && lead.id && !serverIdSet.has(lead.id) && !seen.has(lead.id)) {
      seen.add(lead.id);
      missing.push(lead);
    }
  }

  return missing;
}

// Prepare leads for localStorage by omitting heavy base64 data URLs that exceed quota
function sanitizeLeadsForLocalStorage(leads: Lead[]): Lead[] {
  return leads.map((lead) => {
    let photoUrl = lead.photoUrl;
    let photoBackUrl = lead.photoBackUrl;

    // Only keep photoUrl if it's an HTTP path (like /uploads/...) or very small
    if (photoUrl && photoUrl.startsWith('data:') && photoUrl.length > 5000) {
      photoUrl = undefined;
    }
    if (photoBackUrl && photoBackUrl.startsWith('data:') && photoBackUrl.length > 5000) {
      photoBackUrl = undefined;
    }

    return {
      ...lead,
      photoUrl,
      photoBackUrl,
    };
  });
}

// Synchronous fallback from localStorage
export function getLocalCachedLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveLocalCachedLeads(INITIAL_LEADS);
      return INITIAL_LEADS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_LEADS;
  } catch (err) {
    console.warn('Notice: localStorage read warning, using initial data:', err);
    return INITIAL_LEADS;
  }
}

const STORAGE_PENDING_KEY = 'autolead_crm_pending_v1';

export function getPendingSyncLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addPendingLead(lead: Lead): void {
  try {
    const current = getPendingSyncLeads();
    const updated = [lead, ...current.filter((l) => l.id !== lead.id)];
    localStorage.setItem(STORAGE_PENDING_KEY, JSON.stringify(sanitizeLeadsForLocalStorage(updated)));
  } catch (err) {
    console.warn('Could not add pending lead to local cache:', err);
  }
}

export function removePendingLead(id: string): void {
  try {
    const current = getPendingSyncLeads();
    const updated = current.filter((l) => l.id !== id);
    localStorage.setItem(STORAGE_PENDING_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not remove pending lead:', err);
  }
}

export function clearPendingLeads(): void {
  try {
    localStorage.removeItem(STORAGE_PENDING_KEY);
  } catch {}
}

export function saveLocalCachedLeads(leads: Lead[]): void {
  // Always async save to IndexedDB for complete resilience including large photos
  saveToIndexedDB(leads).catch(() => {});

  try {
    const sanitized = sanitizeLeadsForLocalStorage(leads);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err: any) {
    // If quota is still exceeded or storage is restricted, handle gracefully without throwing uncaught errors
    console.warn('LocalStorage quota managed: saving lean dataset');
    try {
      const minimal = leads.slice(0, 100).map((l) => ({
        id: l.id,
        no: l.no,
        nombre: l.nombre,
        apellidos: l.apellidos,
        empresa: l.empresa,
        celular: l.celular,
        correo: l.correo,
        status: l.status,
        tipo: l.tipo,
        evento: l.evento,
        puesto: l.puesto,
        createdAt: l.createdAt,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      // Storage fully disabled or private browsing quota; server and memory retain all data
    }
  }
}

// Fetch shared leads with status (Phone <-> PC real-time sync)
export async function fetchServerLeadsWithStatus(): Promise<{
  leads: Lead[];
  ok: boolean;
  version?: number;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch('/api/leads', { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        leads: getLocalCachedLeads(),
        ok: false,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    if (data.success && Array.isArray(data.leads)) {
      try {
        saveLocalCachedLeads(data.leads);
      } catch (cacheErr) {
        console.warn('Cache write warning (ignored):', cacheErr);
      }
      return {
        leads: data.leads,
        ok: true,
        version: data.version,
      };
    }
    return { leads: getLocalCachedLeads(), ok: false, error: 'Respuesta inválida del servidor' };
  } catch (err: any) {
    return {
      leads: getLocalCachedLeads(),
      ok: false,
      error: err.name === 'AbortError' ? 'Tiempo de espera agotado' : (err.message || 'Error de conexión'),
    };
  }
}

// Backward compatible fetch
export async function fetchServerLeads(): Promise<Lead[]> {
  const result = await fetchServerLeadsWithStatus();
  return result.leads;
}

// Add a single lead to server
export async function addLeadToServer(lead: Lead): Promise<{ success: boolean; lead?: Lead; error?: string }> {
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return { success: true, lead: data.lead || lead };
  } catch (err: any) {
    console.warn('Error enviando lead al servidor:', err);
    return { success: false, error: err.message || 'Error de red' };
  }
}

// Add multiple leads to server
export async function addBatchLeadsToServer(batch: Lead[]): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const res = await fetch('/api/leads/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return { success: true, count: data.count || batch.length };
  } catch (err: any) {
    console.warn('Error enviando lote de leads al servidor:', err);
    return { success: false, error: err.message || 'Error de red' };
  }
}

// Update a lead on server
export async function updateLeadOnServer(id: string, patch: Partial<Lead>): Promise<boolean> {
  try {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch (err) {
    console.warn('Error actualizando lead en servidor:', err);
    return false;
  }
}

// Delete a lead on server
export async function deleteLeadOnServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Error eliminando lead en servidor:', err);
    return false;
  }
}

// Reset leads on server
export async function resetServerLeads(): Promise<Lead[]> {
  try {
    const res = await fetch('/api/leads/reset', { method: 'POST' });
    const data = await res.json();
    if (data.success && data.leads) {
      saveLocalCachedLeads(data.leads);
      clearPendingLeads();
      return data.leads;
    }
  } catch (err) {
    console.warn('Error reseteando leads en servidor:', err);
  }
  saveLocalCachedLeads(INITIAL_LEADS);
  return INITIAL_LEADS;
}

// Sync any pending offline leads to server
export async function syncPendingLeadsToServer(): Promise<number> {
  const pending = getPendingSyncLeads();
  if (pending.length === 0) return 0;

  let syncedCount = 0;
  for (const lead of pending) {
    const res = await addLeadToServer(lead);
    if (res.success) {
      removePendingLead(lead.id);
      syncedCount++;
    }
  }
  return syncedCount;
}
