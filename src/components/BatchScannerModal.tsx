import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Check,
  RefreshCw,
  Building,
  User,
  ArrowRight,
} from 'lucide-react';
import { Lead, ExtractedLeadData, LeadStatus } from '../types/lead';
import { supabase } from '../utils/storage';

interface BatchScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBatchLeads: (leads: Lead[]) => void;
  startingNo: number;
}

interface QueuedItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  extracted?: ExtractedLeadData;
  error?: string;
  base64?: string;
}

export const BatchScannerModal: React.FC<BatchScannerModalProps> = ({
  isOpen,
  onClose,
  onAddBatchLeads,
  startingNo,
}) => {
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [eventInput, setEventInput] = useState('EXPOPYME');
  const [generatorInput, setGeneratorInput] = useState('Sergio');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: QueuedItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        newItems.push({
          id: `batch-${Date.now()}-${i}-${Math.random()}`,
          file,
          previewUrl,
          status: 'pending',
        });
      }
    }
    setQueue((prev) => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const optimizeImage = (dataUrl: string, maxDimension = 1600): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const processSingleItem = async (item: QueuedItem): Promise<{ lead: ExtractedLeadData; base64: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const rawBase64 = e.target?.result as string;
          const base64 = await optimizeImage(rawBase64);
          const { data, error } = await supabase.functions.invoke('extract-lead', {
            body: {
              imageBase64: base64,
              mimeType: 'image/jpeg',
              defaultEvent: eventInput,
              defaultLeadGenerator: generatorInput,
            },
          });
          if (error) {
            const context = (error as any).context;
            let detail = error.message || 'Error en el servicio OCR';
            try {
              const payload = context && typeof context.json === 'function' ? await context.json() : null;
              if (payload?.error) detail = payload.error;
            } catch {}
            throw new Error(detail);
          }

          if (data.success && data.lead) {
            resolve({ lead: data.lead, base64 });
          } else {
            reject(new Error('Sin datos reconocidos'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo local'));
      reader.readAsDataURL(item.file);
    });
  };

  const runBatchProcessing = async () => {
    setIsProcessingAll(true);

    for (let i = 0; i < queue.length; i++) {
      const currentItem = queue[i];
      if (currentItem.status === 'success') continue;

      setQueue((prev) =>
        prev.map((item) =>
          item.id === currentItem.id ? { ...item, status: 'processing' } : item
        )
      );

      try {
        const { lead: extracted, base64 } = await processSingleItem(currentItem);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === currentItem.id
              ? { ...item, status: 'success', extracted, base64 }
              : item
          )
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === currentItem.id
              ? { ...item, status: 'error', error: err.message || 'Error' }
              : item
          )
        );
      }
    }

    setIsProcessingAll(false);
  };

  const confirmAndImportAll = () => {
    const successfulItems = queue.filter(
      (item) => item.status === 'success' && item.extracted
    );

    if (successfulItems.length === 0) return;

    const leadsToAdd: Lead[] = successfulItems.map((item, index) => {
      const ext = item.extracted!;
      return {
        id: `lead-batch-${Date.now()}-${index}`,
        no: startingNo + index,
        nombre: ext.nombre || 'Sin nombre',
        apellidos: ext.apellidos || '',
        empresa: ext.empresa || 'Sin empresa',
        evento: ext.evento || eventInput || 'EXPOPYME',
        notas: ext.notas || '',
        leadGenerator: ext.leadGenerator || generatorInput,
        giroServicio: ext.giroServicio || '',
        tipo: ext.tipo || 'Lead',
        celular: ext.celular || '',
        telefonoFijo: ext.telefonoFijo || '',
        correo: ext.correo || '',
        paginaWeb: ext.paginaWeb || '',
        puesto: ext.puesto || '',
        direccion: ext.direccion || '',
        status: (ext.status as LeadStatus) || 'Pendiente',
        createdAt: new Date().toISOString(),
        photoUrl: item.base64 || item.previewUrl,
        confidence: ext.confidence || 95,
      };
    });

    onAddBatchLeads(leadsToAdd);
    onClose();
  };

  const totalSuccess = queue.filter((i) => i.status === 'success').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Escaneo Masivo de Tarjetas (Lote)
              </h2>
              <p className="text-xs text-slate-300">
                Selecciona varias fotos a la vez y la IA procesará cada una en cola automáticamente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-5">
          
          {/* Settings banner */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Evento por defecto:</span>
                <input
                  type="text"
                  value={eventInput}
                  onChange={(e) => setEventInput(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-medium"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Lead Generator:</span>
                <select
                  value={generatorInput}
                  onChange={(e) => setGeneratorInput(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-medium"
                >
                  <option value="Sergio">Sergio</option>
                  <option value="Jess">Jess</option>
                  <option value="Litzy">Litzy</option>
                  <option value="Alexa">Alexa</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold rounded-lg flex items-center gap-1.5 transition-all text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              Seleccionar más fotos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Upload Dropzone if empty */}
          {queue.length === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white p-12 text-center cursor-pointer flex flex-col items-center justify-center gap-3 transition-colors"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">
                  Selecciona múltiples fotos de tarjetas o gafetes
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Puedes seleccionar 5, 10 o 20 imágenes a la vez desde tu teléfono o computadora.
                </p>
              </div>
            </div>
          )}

          {/* Queue items list */}
          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                <span>{queue.length} fotos en la cola</span>
                <span>
                  {totalSuccess} procesadas exitosamente
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 relative group"
                  >
                    <img
                      src={item.previewUrl}
                      alt="Thumbnail"
                      className="w-16 h-14 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100"
                    />

                    <div className="flex-1 min-w-0">
                      {item.status === 'pending' && (
                        <div>
                          <p className="text-xs font-semibold text-slate-700 truncate">
                            {item.file.name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium">
                            En espera de análisis
                          </span>
                        </div>
                      )}

                      {item.status === 'processing' && (
                        <div className="flex items-center gap-2 text-indigo-600">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-xs font-semibold">Extrayendo con Gemini...</span>
                        </div>
                      )}

                      {item.status === 'success' && item.extracted && (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.extracted.nombre} {item.extracted.apellidos}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            {item.extracted.empresa || 'Empresa no especificada'}
                          </p>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="flex items-center gap-1.5 text-red-600">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <p className="text-xs truncate">{item.error || 'Error'}</p>
                        </div>
                      )}
                    </div>

                    {!isProcessingAll && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar de la cola"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-3">
            {queue.some((i) => i.status === 'pending') && (
              <button
                type="button"
                disabled={isProcessingAll}
                onClick={runBatchProcessing}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-2"
              >
                {isProcessingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Procesando cola...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Iniciar Análisis Automático ({queue.filter((i) => i.status === 'pending').length})
                  </>
                )}
              </button>
            )}

            {totalSuccess > 0 && !isProcessingAll && (
              <button
                type="button"
                onClick={confirmAndImportAll}
                className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Guardar {totalSuccess} Contactos en la Tabla
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
