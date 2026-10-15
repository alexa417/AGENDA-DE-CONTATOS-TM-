import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building,
  Phone,
  Mail,
  Globe,
  MapPin,
  Briefcase,
  Tag,
  Calendar,
  MessageSquare,
  Send,
  Save,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { Lead, LeadStatus, LeadType } from '../types/lead';

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateLead: (updated: Lead) => void;
  onDeleteLead: (id: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  isOpen,
  onClose,
  onUpdateLead,
  onDeleteLead,
}) => {
  const [formData, setFormData] = useState<Lead | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({ ...lead });
      setIsSaved(false);
    }
  }, [lead]);

  if (!isOpen || !formData) return null;

  const handleChange = (field: keyof Lead, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
    setIsSaved(false);
  };

  const handleSave = () => {
    if (!formData) return;
    onUpdateLead(formData);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  const cleanPhoneForWhatsApp = (phoneStr: string) => {
    return phoneStr.replace(/[^0-9]/g, '');
  };

  const whatsAppNumber = cleanPhoneForWhatsApp(formData.celular || formData.telefonoFijo);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 font-bold text-sm">
              #{formData.no}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {formData.nombre} {formData.apellidos || formData.empresa}
              </h2>
              <p className="text-xs text-slate-300">
                {formData.puesto ? `${formData.puesto} en ` : ''}{formData.empresa}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Seguro que deseas eliminar este contacto?')) {
                  onDeleteLead(formData.id);
                  onClose();
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
              title="Eliminar contacto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Contact Action Strip */}
        <div className="bg-indigo-50/60 border-b border-indigo-100 px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            {whatsAppNumber && (
              <a
                href={`https://wa.me/${whatsAppNumber.length === 10 ? `52${whatsAppNumber}` : whatsAppNumber}?text=${encodeURIComponent(
                  `Hola ${formData.nombre}, un gusto saludarte de nuevo tras el evento ${formData.evento}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Abrir WhatsApp
              </a>
            )}

            {formData.correo && (
              <a
                href={`mailto:${formData.correo}?subject=${encodeURIComponent(
                  `Seguimiento ${formData.evento} - ${formData.empresa}`
                )}`}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Enviar Correo
              </a>
            )}

            {formData.paginaWeb && (
              <a
                href={
                  formData.paginaWeb.startsWith('http')
                    ? formData.paginaWeb
                    : `https://${formData.paginaWeb}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                Ver Sitio Web
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600">Estado:</span>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as LeadStatus)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 font-semibold bg-white text-slate-900"
            >
              <option value="Pendiente">⏳ Pendiente</option>
              <option value="Contactado">🌀 Contactado</option>
              <option value="Nuevo Cierre">💰 Nuevo Cierre</option>
              <option value="Rechazado">🙅🏻‍♀️ Rechazado</option>
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Card photo preview if scanned (Front and/or Back) */}
          {(formData.photoUrl || formData.photoBackUrl) && (
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Fotos de la Tarjeta Escaneada</span>
                </div>
                {formData.photoUrl && formData.photoBackUrl && (
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Frente + Reverso
                  </span>
                )}
              </div>

              <div className={`grid gap-3 ${formData.photoUrl && formData.photoBackUrl ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                {formData.photoUrl && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Cara 1: Frente
                    </span>
                    <div className="max-h-48 overflow-hidden rounded-lg border border-slate-300 bg-slate-900 flex items-center justify-center p-1">
                      <img
                        src={formData.photoUrl}
                        alt="Frente de la tarjeta"
                        className="max-h-44 w-auto object-contain"
                      />
                    </div>
                  </div>
                )}

                {formData.photoBackUrl && (
                  <div>
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1">
                      Cara 2: Reverso (Servicios / Notas)
                    </span>
                    <div className="max-h-48 overflow-hidden rounded-lg border border-purple-200 bg-slate-900 flex items-center justify-center p-1">
                      <img
                        src={formData.photoBackUrl}
                        alt="Reverso de la tarjeta"
                        className="max-h-44 w-auto object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Core info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Apellidos
              </label>
              <input
                type="text"
                value={formData.apellidos}
                onChange={(e) => handleChange('apellidos', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Empresa
              </label>
              <input
                type="text"
                value={formData.empresa}
                onChange={(e) => handleChange('empresa', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Puesto
              </label>
              <input
                type="text"
                value={formData.puesto}
                onChange={(e) => handleChange('puesto', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Celular
              </label>
              <input
                type="text"
                value={formData.celular}
                onChange={(e) => handleChange('celular', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 font-mono font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Teléfono Fijo
              </label>
              <input
                type="text"
                value={formData.telefonoFijo}
                onChange={(e) => handleChange('telefonoFijo', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.correo}
                onChange={(e) => handleChange('correo', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Tipo
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 text-slate-900"
              >
                <option value="Lead">Lead</option>
                <option value="Lead Potencial">Lead Potencial</option>
                <option value="Alianza">Alianza</option>
                <option value="Proveedor">Proveedor</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Lead Generator
              </label>
              <input
                type="text"
                value={formData.leadGenerator}
                onChange={(e) => handleChange('leadGenerator', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Evento
              </label>
              <input
                type="text"
                value={formData.evento}
                onChange={(e) => handleChange('evento', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Giro / Servicio
              </label>
              <input
                type="text"
                value={formData.giroServicio}
                onChange={(e) => handleChange('giroServicio', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Página Web
              </label>
              <input
                type="text"
                value={formData.paginaWeb}
                onChange={(e) => handleChange('paginaWeb', e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => handleChange('direccion', e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Notas y Detalles del Contacto
            </label>
            <textarea
              rows={3}
              value={formData.notas}
              onChange={(e) => handleChange('notas', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 text-slate-800"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
          >
            Cerrar
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-2"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                ¡Cambios Guardados!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
