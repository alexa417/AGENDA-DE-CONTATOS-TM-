import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, X, Copy, Check, ExternalLink, RefreshCw, Wifi, CheckCircle2, AlertCircle } from 'lucide-react';

interface SyncMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadsCount: number;
  onForceSync: () => void;
}

export function SyncMobileModal({ isOpen, onClose, leadsCount, onForceSync }: SyncMobileModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [pingStatus, setPingStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [pingTime, setPingTime] = useState<number | null>(null);
  const [serverCount, setServerCount] = useState<number | null>(null);

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (!isOpen) return;

    // Generate QR Code
    QRCode.toDataURL(currentUrl, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));

    // Check server ping
    checkPing();
  }, [isOpen, currentUrl]);

  const checkPing = async () => {
    setPingStatus('checking');
    const start = performance.now();
    try {
      const res = await fetch('/api/sync/status');
      const duration = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setPingStatus('online');
        setPingTime(duration);
        setServerCount(data.leadCount ?? leadsCount);
      } else {
        setPingStatus('offline');
      }
    } catch {
      setPingStatus('offline');
    }
  };

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Conectar Celular en Vivo
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                  En tiempo real
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Sincroniza tu cámara del teléfono con esta computadora
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 bg-slate-50/50">
          
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
            {qrDataUrl ? (
              <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-100">
                <img
                  src={qrDataUrl}
                  alt="Código QR de sincronización"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            )}

            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Wifi className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Abre la cámara de tu celular y enfoca el código</span>
            </div>
          </div>

          {/* Copy URL section */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              O ingresa este enlace en tu navegador móvil:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl font-mono text-slate-600 truncate focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Connection Status & Diagnostics */}
          <div className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Estado del servidor compartido:</span>
              <div className="flex items-center gap-1.5">
                {pingStatus === 'online' && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                    <CheckCircle2 className="w-3 h-3" />
                    Conectado {pingTime ? `(${pingTime}ms)` : ''}
                  </span>
                )}
                {pingStatus === 'checking' && (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full text-[11px]">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Verificando...
                  </span>
                )}
                {pingStatus === 'offline' && (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-full text-[11px]">
                    <AlertCircle className="w-3 h-3" />
                    Desconectado
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
              <span>Contactos sincronizados en la nube:</span>
              <span className="font-bold text-slate-800">{serverCount ?? leadsCount}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800">¿Cómo funciona la sincronización?</h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-500">
              <li>
                Abre el enlace en tu celular usando Safari o Chrome.
              </li>
              <li>
                Presiona <strong className="text-indigo-700">"Escanear Foto con IA"</strong> en el celular y toma fotos de las tarjetas.
              </li>
              <li>
                Al guardar, la tarjeta y los datos aparecerán <strong className="text-indigo-700">automáticamente en esta pantalla</strong> en segundos.
              </li>
            </ol>
          </div>

          {/* Recovery Assistant */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-sm">💡</span>
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">¿Tenías 114 contactos?</span>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Si registraste 4 tarjetas que estaban guardadas en tu navegador o celular antes de sincronizarse con el servidor, presiona el botón inferior para escanear y recuperar cualquier contacto pendiente de la memoria local de este equipo.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                checkPing();
                await onForceSync();
              }}
              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recuperar y Sincronizar Contactos Locales
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              checkPing();
              onForceSync();
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Comprobar conexión
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
