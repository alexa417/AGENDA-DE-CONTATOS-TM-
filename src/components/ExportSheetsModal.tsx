import React, { useState, useEffect } from 'react';
import { Lead } from '../types/lead';
import { exportLeadsToGoogleSheets } from '../utils/googleSheets';
import { initAuth, googleSignIn, logout } from '../utils/googleAuth';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

interface ExportSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  totalLeadsCount: number;
}

export function ExportSheetsModal({
  isOpen,
  onClose,
  leads,
  totalLeadsCount,
}: ExportSheetsModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStep, setExportStep] = useState<string>('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const defaultTitle = `Contactos EXPOPYME - ${new Date().toISOString().slice(0, 10)} (${leads.length} contactos)`;
  const [sheetTitle, setSheetTitle] = useState(defaultTitle);

  useEffect(() => {
    if (!isOpen) return;

    // Listen for auth state
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    // Reset export state
    setResultUrl(null);
    setErrorMsg(null);
    setSheetTitle(defaultTitle);

    return () => {
      unsubscribe();
    };
  }, [isOpen, leads.length]);

  const handleLogin = async () => {
    setIsAuthLoading(true);
    setErrorMsg(null);
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        setUser(authResult.user);
        setToken(authResult.accessToken);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo iniciar sesión con Google.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setResultUrl(null);

    setExportStep('Conectando con Google Sheets API...');

    try {
      setTimeout(() => setExportStep('Creando archivo en tu Google Drive...'), 500);
      setTimeout(() => setExportStep(`Guardando ${leads.length} filas con formato profesional...`), 1200);

      const res = await exportLeadsToGoogleSheets(leads, sheetTitle);
      if (res.success && res.spreadsheetUrl) {
        setResultUrl(res.spreadsheetUrl);
        // Automatically open the sheet in a new tab for seamless user experience
        window.open(res.spreadsheetUrl, '_blank', 'noopener,noreferrer');
      } else {
        setErrorMsg(res.error || 'Error al exportar a Google Sheets.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado al exportar.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyUrl = () => {
    if (resultUrl && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(resultUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Exportar a Google Sheets
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Google Drive
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Crea una hoja de cálculo en la nube con todos tus contactos
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 bg-slate-50/50">
          
          {/* Success Screen */}
          {resultUrl ? (
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ¡Hoja de cálculo creada exitosamente!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Se exportaron <strong className="text-emerald-700">{leads.length} contactos</strong> directamente a tu cuenta de Google Drive con formato y columnas organizadas.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-2">
                <a
                  href={resultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Abrir en Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={resultUrl}
                    className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl font-mono text-slate-600 truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Account Connection Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                {user ? (
                  <div className="flex items-center gap-3 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Google User'}
                        className="w-9 h-9 rounded-full ring-2 ring-emerald-500/30 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'G'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {user.displayName || 'Cuenta de Google'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Conectar Google Workspace</div>
                      <div className="text-[11px] text-slate-500">
                        Inicia sesión con tu cuenta de Google
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  {user ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1"
                      title="Cerrar sesión de Google"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLogin}
                      disabled={isAuthLoading}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isAuthLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Conectando...</span>
                        </>
                      ) : (
                        <span>Iniciar sesión con Google</span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Title and summary */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nombre de la hoja de cálculo:
                  </label>
                  <input
                    type="text"
                    value={sheetTitle}
                    onChange={(e) => setSheetTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Nombre del archivo en Google Drive"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">Total de contactos a exportar:</span>
                  <span className="font-bold text-slate-800">
                    {leads.length}{' '}
                    {leads.length < totalLeadsCount && (
                      <span className="text-slate-400 text-[11px] font-normal">
                        (de {totalLeadsCount} totales, filtrados)
                      </span>
                    )}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-800 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Campos incluidos automáticamente:
                  </div>
                  <p className="text-slate-600 text-[10px] leading-relaxed">
                    No., Empresa, Nombre, Apellidos, Puesto, Giro/Servicio, Teléfono Móvil, Fijo, Correo, Web, Dirección, Evento, Estatus, Notas, y enlaces a fotos escaneadas.
                  </p>
                </div>
              </div>

              {/* Loading progress during export */}
              {isExporting && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-3 animate-pulse">
                  <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                  <div className="text-xs text-emerald-900 font-semibold">{exportStep}</div>
                </div>
              )}

              {/* Error message */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error:</span> {errorMsg}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {resultUrl ? 'Cerrar' : 'Cancelar'}
          </button>

          {!resultUrl && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isAuthLoading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 active:scale-98"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Exportando...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Crear y Abrir en Google Sheets</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
