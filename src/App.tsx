import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Camera,
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  Plus,
  RotateCcw,
  Sparkles,
  Layers,
  Filter,
  CheckCircle2,
  Table as TableIcon,
  Kanban as KanbanIcon,
  LayoutGrid,
  Building,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Tag,
  ExternalLink,
  ChevronRight,
  User,
  SlidersHorizontal,
  Palette,
  Check,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Lead, LeadStatus, LeadType } from './types/lead';
import { ThemeId, THEMES, getStoredTheme, saveStoredTheme } from './utils/theme';
import {
  getLocalCachedLeads,
  saveLocalCachedLeads,
  fetchServerLeadsWithStatus,
  addLeadToServer,
  addBatchLeadsToServer,
  updateLeadOnServer,
  deleteLeadOnServer,
  resetServerLeads,
  getPendingSyncLeads,
  addPendingLead,
  removePendingLead,
  syncPendingLeadsToServer,
  getAnyUnsavedLocalLeads,
} from './utils/storage';
import { exportToCSV, parseCSV } from './utils/csvExport';
import { StatsBar } from './components/StatsBar';
import { LeadTable } from './components/LeadTable';
import { KanbanView } from './components/KanbanView';
import { ScannerModal } from './components/ScannerModal';
import { BatchScannerModal } from './components/BatchScannerModal';
import { LeadDetailModal } from './components/LeadDetailModal';
import { AddManualModal } from './components/AddManualModal';
import { SyncMobileModal } from './components/SyncMobileModal';
import { ExportSheetsModal } from './components/ExportSheetsModal';

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string | 'ALL'>('ALL');
  const [generatorFilter, setGeneratorFilter] = useState<string | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'cards'>('table');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isSyncMobileOpen, setIsSyncMobileOpen] = useState(false);
  const [isExportSheetsOpen, setIsExportSheetsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [droppedImage, setDroppedImage] = useState<string | null>(null);
  const [isDraggingOverWindow, setIsDraggingOverWindow] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('connected');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date>(new Date());
  const [theme, setTheme] = useState<ThemeId>(getStoredTheme);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const currentTheme = THEMES[theme] || THEMES.lila;

  const handleSelectTheme = (newTheme: ThemeId) => {
    setTheme(newTheme);
    saveStoredTheme(newTheme);
    setIsThemeMenuOpen(false);
    showToast(`Paleta cambiada a: ${THEMES[newTheme].name}`);
  };

  useEffect(() => {
    saveStoredTheme(theme);
  }, [theme]);

  const importFileRef = useRef<HTMLInputElement | null>(null);

  // Sync from server function with bidirectional merge and pending flush
  const syncFromServer = async (silent = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (!silent) setIsSyncing(true);

    try {
      // 1. Try to flush any pending offline leads
      await syncPendingLeadsToServer();
      const currentPending = getPendingSyncLeads();
      setPendingCount(currentPending.length);

      // 2. Fetch server state
      const { leads: serverLeads, ok, error } = await fetchServerLeadsWithStatus();
      if (ok && Array.isArray(serverLeads)) {
        setSyncStatus('connected');

        // Check for any missing local leads in IndexedDB, localStorage, or pending queue
        const missingLocal = await getAnyUnsavedLocalLeads(serverLeads);
        if (missingLocal.length > 0) {
          console.log(`[Auto-Recovery] Found ${missingLocal.length} contacts in browser storage not yet on server. Pushing...`);
          // Automatically save them to the server so they persist for all devices
          await addBatchLeadsToServer(missingLocal);
          serverLeads.unshift(...missingLocal);
          showToast(`¡Se recuperaron ${missingLocal.length} contactos de la memoria de tu dispositivo! Total: ${serverLeads.length}`);
        }

        setLeads(serverLeads);
        saveLocalCachedLeads(serverLeads);
        setLastSyncedTime(new Date());
        if (!silent) {
          showToast(`¡Sincronizado con éxito! (${serverLeads.length} contactos en total)`);
        }
      } else {
        setSyncStatus('offline');
        if (!silent) {
          showToast(`Aviso de conexión: ${error || 'Modo local activo'}`);
        }
      }
    } catch (err: any) {
      console.warn('Sync error:', err);
      setSyncStatus('offline');
    } finally {
      isSyncingRef.current = false;
      if (!silent) setIsSyncing(false);
    }
  };

  // Initialize data from local cache first, then fetch shared server state and poll
  useEffect(() => {
    const cached = getLocalCachedLeads();
    setLeads(cached);
    setPendingCount(getPendingSyncLeads().length);

    // Initial sync
    syncFromServer(true);

    // Real-time polling: checks server every 3s so when a card is uploaded from phone, it appears on PC instantly
    const interval = setInterval(() => {
      syncFromServer(true);
    }, 3000);

    // Immediate sync whenever the tab/window is focused
    const handleFocus = () => {
      syncFromServer(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Global Drag & Drop and Paste listener
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsDraggingOverWindow(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.clientX === 0 || e.clientY === 0) {
        setIsDraggingOverWindow(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOverWindow(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setDroppedImage(dataUrl);
            setIsScannerOpen(true);
          };
          reader.readAsDataURL(file);
        }
      }
    };

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              setDroppedImage(dataUrl);
              setIsScannerOpen(true);
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('paste', handleGlobalPaste);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Calculate next sequential "No."
  const nextNo = useMemo(() => {
    const max = leads.reduce((acc, curr) => {
      const n = Number(curr.no);
      return !isNaN(n) && n > acc ? n : acc;
    }, 0);
    return max + 1;
  }, [leads]);

  // Unique generators for filter dropdown
  const uniqueGenerators = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.leadGenerator && l.leadGenerator.trim()) {
        set.add(l.leadGenerator.trim());
      }
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = `${lead.nombre} ${lead.apellidos}`.toLowerCase().includes(query);
        const matchesEmpresa = lead.empresa.toLowerCase().includes(query);
        const matchesEmail = lead.correo.toLowerCase().includes(query);
        const matchesCelular = lead.celular.toLowerCase().includes(query);
        const matchesPuesto = lead.puesto.toLowerCase().includes(query);
        const matchesGiro = lead.giroServicio.toLowerCase().includes(query);
        const matchesNotas = lead.notas.toLowerCase().includes(query);
        const matchesNo = String(lead.no).includes(query);

        if (
          !matchesName &&
          !matchesEmpresa &&
          !matchesEmail &&
          !matchesCelular &&
          !matchesPuesto &&
          !matchesGiro &&
          !matchesNotas &&
          !matchesNo
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL' && lead.status !== statusFilter) {
        return false;
      }

      // Type or Scanned filter
      if (typeFilter === 'SCANNED') {
        const isScanned = Boolean(lead.photoUrl || lead.photoBackUrl || lead.id.startsWith('lead-scanned'));
        if (!isScanned) return false;
      } else if (typeFilter !== 'ALL' && lead.tipo !== typeFilter) {
        return false;
      }

      // Generator filter
      if (generatorFilter !== 'ALL' && lead.leadGenerator !== generatorFilter) {
        return false;
      }

      return true;
    });
  }, [leads, searchQuery, statusFilter, typeFilter, generatorFilter]);

  // Actions with server persistence and offline fallback
  const handleAddLead = async (newLead: Lead) => {
    // 1. Immediately update UI state (so user sees their new contact instantly)
    setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
    // 2. Track in pending queue
    addPendingLead(newLead);
    setPendingCount(getPendingSyncLeads().length);
    showToast(`Guardando: ${newLead.empresa || newLead.nombre}...`);

    // 3. Persist to server
    try {
      const res = await addLeadToServer(newLead);
      if (res.success) {
        removePendingLead(newLead.id);
        setPendingCount(getPendingSyncLeads().length);
        setSyncStatus('connected');
        if (res.lead) {
          // Update with server version (which has permanent /uploads/ image path)
          setLeads((prev) => prev.map((l) => (l.id === newLead.id ? res.lead! : l)));
        }
        showToast(`¡Contacto de ${newLead.empresa || newLead.nombre} guardado y sincronizado!`);
      } else {
        setSyncStatus('offline');
        showToast(`Contacto guardado localmente (se sincronizará automáticamente al conectar)`);
      }
    } catch {
      setSyncStatus('offline');
      showToast(`Guardado en este dispositivo (pendiente de sincronizar)`);
    }
  };

  const handleAddBatchLeads = async (batch: Lead[]) => {
    setLeads((prev) => [...batch, ...prev]);
    batch.forEach((l) => addPendingLead(l));
    setPendingCount(getPendingSyncLeads().length);
    showToast(`Guardando ${batch.length} contactos...`);

    try {
      const res = await addBatchLeadsToServer(batch);
      if (res.success) {
        batch.forEach((l) => removePendingLead(l.id));
        setPendingCount(getPendingSyncLeads().length);
        setSyncStatus('connected');
        showToast(`¡${batch.length} contactos guardados y sincronizados en todos tus dispositivos!`);
        syncFromServer(true);
      } else {
        setSyncStatus('offline');
        showToast(`${batch.length} contactos guardados localmente`);
      }
    } catch {
      setSyncStatus('offline');
    }
  };

  const handleUpdateLead = async (updatedLead: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    showToast('Contacto actualizado y sincronizado');
    const ok = await updateLeadOnServer(updatedLead.id, updatedLead);
    if (!ok) {
      addPendingLead(updatedLead);
      setPendingCount(getPendingSyncLeads().length);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: LeadStatus) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
    await updateLeadOnServer(id, { status: newStatus });
  };

  const handleDeleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    showToast('Contacto eliminado');
    await deleteLeadOnServer(id);
    syncFromServer(true);
  };

  const handleResetData = async () => {
    if (
      window.confirm(
        '¿Deseas restaurar la lista original de contactos de EXPOPYME? Se recargarán los 60+ contactos originales en todos los dispositivos.'
      )
    ) {
      const reset = await resetServerLeads();
      setLeads(reset);
      showToast('Datos restaurados al listado original de EXPOPYME');
    }
  };

  const handleExportCSV = () => {
    exportToCSV(leads, `Contactos_EXPOPYME_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Archivo CSV exportado exitosamente con formato Excel UTF-8');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          alert('No se detectaron filas válidas en el archivo CSV.');
          return;
        }

        const newItems: Lead[] = parsed.map((item, index) => ({
          id: `lead-imported-${Date.now()}-${index}`,
          no: item.no || nextNo + index,
          nombre: item.nombre || '',
          apellidos: item.apellidos || '',
          empresa: item.empresa || 'Empresa importada',
          evento: item.evento || 'EXPOPYME',
          notas: item.notas || '',
          leadGenerator: item.leadGenerator || '',
          giroServicio: item.giroServicio || '',
          tipo: item.tipo || 'Lead',
          celular: item.celular || '',
          telefonoFijo: item.telefonoFijo || '',
          correo: item.correo || '',
          paginaWeb: item.paginaWeb || '',
          puesto: item.puesto || '',
          direccion: item.direccion || '',
          status: item.status || 'Pendiente',
          createdAt: new Date().toISOString(),
        }));

        const updated = [...newItems, ...leads];
        setLeads(updated);
        await addBatchLeadsToServer(newItems);
        syncFromServer(true);
        showToast(`¡Se importaron y sincronizaron ${newItems.length} contactos desde el archivo CSV!`);
      } catch (err) {
        console.error('Error al importar CSV', err);
        alert('Hubo un error al procesar el archivo CSV.');
      }
    };
    reader.readAsText(file);
    if (importFileRef.current) {
      importFileRef.current.value = '';
    }
  };

  return (
    <div className={`min-h-screen ${currentTheme.pageBg} text-slate-900 flex flex-col font-sans transition-colors duration-300`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-top-5 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Application Header */}
      <header className={`bg-gradient-to-r ${currentTheme.headerBg} text-white border-b border-slate-800/80 sticky top-0 z-30 shadow-lg transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ring-2 ring-white/20 transition-all duration-300"
                style={{ backgroundColor: currentTheme.dotColor }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-white">
                    AutoLead <span className={currentTheme.headerAccent}>OCR</span>
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                    EXPOPYME 2024
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Automatización con IA para capturar fotos y llenar datos de contactos al instante
                </p>
              </div>
            </div>

            {/* Sync Status Badge, Mobile Pairing, Theme Selector & Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              
              {/* Mobile Phone Pairing Button */}
              <button
                type="button"
                onClick={() => setIsSyncMobileOpen(true)}
                className="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-slate-200 hover:text-white rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Abrir en celular con código QR"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Vincular Celular</span>
                <span className="sm:hidden">Celular</span>
              </button>

              {/* Real-time synchronization indicator */}
              <div
                className={`flex items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-xl border text-xs transition-colors ${
                  syncStatus === 'connected'
                    ? 'bg-black/40 border-white/10 text-slate-200'
                    : syncStatus === 'syncing'
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus === 'syncing' || isSyncing
                      ? 'bg-amber-400 animate-ping'
                      : syncStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-rose-400'
                  }`}
                />
                <span className="text-[11px] font-semibold">
                  {syncStatus === 'syncing' || isSyncing
                    ? 'Sincronizando...'
                    : syncStatus === 'connected'
                    ? `Celular ↔ PC (${leads.length})`
                    : 'Modo Local / Reconectando'}
                </span>

                {pendingCount > 0 && (
                  <span
                    className="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-400/30 font-bold"
                    title={`${pendingCount} cambio(s) pendiente(s) de sincronizar`}
                  >
                    {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => syncFromServer(false)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors ml-0.5"
                  title="Sincronizar ahora"
                >
                  <RotateCcw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Theme Palette Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                  className="px-2.5 py-1.5 bg-black/40 hover:bg-black/60 text-slate-200 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Cambiar paleta de colores de la página"
                >
                  <Palette className="w-3.5 h-3.5" style={{ color: currentTheme.dotColor }} />
                  <span className="hidden sm:inline">{currentTheme.name}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentTheme.dotColor }} />
                </button>

                {isThemeMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 mb-1">
                      Elige los colores de la página:
                    </div>
                    {Object.values(THEMES).map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => handleSelectTheme(th.id)}
                        className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                          theme === th.id
                            ? 'bg-white/15 text-white'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ring-1 ring-white/30" style={{ backgroundColor: th.dotColor }} />
                          <span>{th.name}</span>
                        </div>
                        {theme === th.id && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Core Hero Button: AI Camera/Photo Scanner */}
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className={`px-4 py-2 ${currentTheme.btnPrimary} text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transform active:scale-95 transition-all ring-1 ring-white/20`}
              >
                <Camera className="w-4 h-4 text-white" />
                <span>Escanear Foto con IA</span>
              </button>

              {/* Batch Scanner */}
              <button
                type="button"
                onClick={() => setIsBatchOpen(true)}
                className="px-3 py-2 bg-black/40 hover:bg-black/60 text-slate-200 font-semibold text-xs rounded-xl border border-white/10 flex items-center gap-1.5 transition-colors"
                title="Subir múltiples fotos de tarjetas a la vez"
              >
                <Layers className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden sm:inline">Lote Masivo</span>
              </button>

              {/* Add Manual */}
              <button
                type="button"
                onClick={() => setIsManualOpen(true)}
                className="px-3 py-2 bg-black/40 hover:bg-black/60 text-slate-200 font-semibold text-xs rounded-xl border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Manual</span>
              </button>

              {/* Export directly to Google Sheets (Hoja de cálculo de Google) */}
              <button
                type="button"
                onClick={() => setIsExportSheetsOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all ring-1 ring-emerald-400/40 transform active:scale-95"
                title="Crear y abrir directamente en Google Sheets (Hoja de cálculo de Google en tu Drive)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                <span>Google Sheets</span>
              </button>

              {/* Import CSV input (hidden) */}
              <input
                ref={importFileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCSV}
              />
              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                className="p-2 bg-black/40 hover:bg-black/60 text-slate-300 rounded-xl border border-white/10 transition-colors"
                title="Importar archivo CSV"
              >
                <Upload className="w-4 h-4" />
              </button>

              {/* Reset to initial EXPOPYME records */}
              <button
                type="button"
                onClick={handleResetData}
                className="p-2 bg-black/40 hover:bg-black/60 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-colors"
                title="Restaurar base de datos inicial de EXPOPYME"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        
        {/* Banner with automation tips */}
        <div className={`bg-gradient-to-r ${currentTheme.bannerBg} text-white p-4 sm:p-5 rounded-2xl shadow-sm border ${currentTheme.bannerBorder} flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300`}>
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 mt-0.5">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                ¿Tienes tarjetas de presentación (frente y reverso) o gafetes?
              </h2>
              <p className="text-xs text-slate-200 mt-0.5 max-w-2xl leading-relaxed">
                Toma una foto con tu cámara o arrastra una imagen. La IA leerá el texto del frente y del reverso, insertando nombre, empresa, celulares, correos, giro y notas automáticamente en tu documento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-2.5 bg-white text-slate-900 font-bold text-xs rounded-xl shadow-md hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: currentTheme.dotColor }} />
              Probar Escáner Ahora
            </button>
          </div>
        </div>

        {/* Real-time KPI Stats Bar & Filters */}
        <StatsBar
          leads={leads}
          currentStatusFilter={statusFilter}
          onSelectStatusFilter={setStatusFilter}
          currentTypeFilter={typeFilter}
          onSelectTypeFilter={setTypeFilter}
        />

        {/* Toolbar: Search, Filters & View Switcher */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, empresa, correo, celular, puesto..."
              className={`w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${currentTheme.searchFocusRing} focus:bg-white transition-all font-medium`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters & View switcher */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
            
            {/* Lead Generator Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">Lead Generator:</span>
              <select
                value={generatorFilter}
                onChange={(e) => setGeneratorFilter(e.target.value)}
                className={`px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:ring-2 ${currentTheme.searchFocusRing} focus:outline-none`}
              >
                <option value="ALL">Todos los captadores</option>
                {uniqueGenerators.map((gen) => (
                  <option key={gen} value={gen}>
                    {gen}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear filters if any active */}
            {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || generatorFilter !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setTypeFilter('ALL');
                  setGeneratorFilter('ALL');
                  setSearchQuery('');
                }}
                className={`px-2.5 py-1.5 text-xs ${currentTheme.activeNavText} hover:opacity-80 font-bold transition-opacity`}
              >
                Limpiar filtros
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'table'
                    ? `bg-white ${currentTheme.activeNavText} shadow-xs font-bold ring-1 ring-black/5`
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista de Tabla / Hoja de Cálculo"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabla</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'kanban'
                    ? `bg-white ${currentTheme.activeNavText} shadow-xs font-bold ring-1 ring-black/5`
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista Kanban de Pipeline"
              >
                <KanbanIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tablero</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'cards'
                    ? `bg-white ${currentTheme.activeNavText} shadow-xs font-bold ring-1 ring-black/5`
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista de Tarjetas Visuales"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tarjetas</span>
              </button>
            </div>

          </div>

        </div>

        {/* View Mode Content */}
        {viewMode === 'table' && (
          <LeadTable
            leads={filteredLeads}
            onSelectLead={setSelectedLead}
            onUpdateStatus={handleUpdateStatus}
            onDeleteLead={handleDeleteLead}
          />
        )}

        {viewMode === 'kanban' && (
          <KanbanView
            leads={filteredLeads}
            onSelectLead={setSelectedLead}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeads.map((lead) => {
              const cleanNum = (lead.celular || lead.telefonoFijo || '').replace(/[^0-9]/g, '');
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-purple-300 hover:shadow-md hover:ring-1 hover:ring-purple-200 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div>
                    {/* Card photo preview if scanned */}
                    {(lead.photoUrl || lead.photoBackUrl) && (
                      <div className="mb-3 relative rounded-xl overflow-hidden aspect-16/9 bg-slate-900 border border-slate-200">
                        <img
                          src={lead.photoUrl || lead.photoBackUrl}
                          alt="Tarjeta escaneada"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-white font-semibold flex items-center gap-1">
                          <Camera className="w-3 h-3 text-purple-300" />
                          <span>{lead.photoBackUrl ? 'Frente + Reverso' : 'Tarjeta'}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{lead.no}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {lead.tipo}
                        </span>
                        <span className="text-xs">
                          {lead.status === 'Contactado' && '🌀'}
                          {lead.status === 'Nuevo Cierre' && '💰'}
                          {lead.status === 'Rechazado' && '🙅🏻‍♀️'}
                          {lead.status === 'Pendiente' && '⏳'}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                      {lead.nombre || lead.apellidos
                        ? `${lead.nombre} ${lead.apellidos}`
                        : lead.empresa}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{lead.empresa}</span>
                    </p>
                    {lead.puesto && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {lead.puesto}
                      </p>
                    )}

                    {lead.notas && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2.5 line-clamp-2 italic">
                        "{lead.notas}"
                      </p>
                    )}
                  </div>

                  <div
                    className="pt-3 border-t border-slate-100 flex items-center justify-between"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      {cleanNum && (
                        <a
                          href={`https://wa.me/${cleanNum.length === 10 ? `52${cleanNum}` : cleanNum}?text=${encodeURIComponent(
                            `Hola ${lead.nombre || ''}, te contacto respecto a ${lead.empresa} del evento ${lead.evento}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          WhatsApp
                        </a>
                      )}
                      {lead.correo && (
                        <a
                          href={`mailto:${lead.correo}`}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                          title="Enviar correo"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400">
                      {lead.evento}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-500">
        <p>
          AutoLead OCR & CRM • Desarrollado para automatización de leads en eventos y expos con Inteligencia Artificial
        </p>
      </footer>

      {/* Modals */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setDroppedImage(null);
        }}
        onAddLead={handleAddLead}
        nextNo={nextNo}
        initialImage={droppedImage}
      />

      {/* Full-screen Drag & Drop Overlay */}
      {isDraggingOverWindow && (
        <div className="fixed inset-0 z-50 bg-indigo-900/80 backdrop-blur-sm border-4 border-dashed border-indigo-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center text-white mb-4 animate-bounce">
            <Camera className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white">Suelta la foto de la tarjeta aquí</h2>
          <p className="text-sm text-indigo-200 mt-1">El OCR de Gemini leerá el texto y extraerá los datos automáticamente</p>
        </div>
      )}

      <BatchScannerModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onAddBatchLeads={handleAddBatchLeads}
        startingNo={nextNo}
      />

      <LeadDetailModal
        lead={selectedLead}
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        onUpdateLead={handleUpdateLead}
        onDeleteLead={handleDeleteLead}
      />

      <AddManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        onAddLead={handleAddLead}
        nextNo={nextNo}
      />

      <SyncMobileModal
        isOpen={isSyncMobileOpen}
        onClose={() => setIsSyncMobileOpen(false)}
        leadsCount={leads.length}
        onForceSync={() => syncFromServer(false)}
      />

      <ExportSheetsModal
        isOpen={isExportSheetsOpen}
        onClose={() => setIsExportSheetsOpen(false)}
        leads={filteredLeads}
        totalLeadsCount={leads.length}
      />

    </div>
  );
}
