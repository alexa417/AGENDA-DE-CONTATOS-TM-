import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, Building, User, RotateCcw } from 'lucide-react';
import { Lead, LeadStatus } from '../types/lead';

interface AddManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (lead: Lead) => void;
  nextNo: number;
}

export const AddManualModal: React.FC<AddManualModalProps> = ({
  isOpen,
  onClose,
  onAddLead,
  nextNo,
}) => {
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [puesto, setPuesto] = useState('');
  const [celular, setCelular] = useState('');
  const [telefonoFijo, setTelefonoFijo] = useState('');
  const [correo, setCorreo] = useState('');
  const [paginaWeb, setPaginaWeb] = useState('');
  const [giroServicio, setGiroServicio] = useState('');
  const [tipo, setTipo] = useState('Lead');
  const [evento, setEvento] = useState('EXPOPYME');
  const [leadGenerator, setLeadGenerator] = useState('Sergio');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [status, setStatus] = useState<LeadStatus>('Pendiente');

  const resetForm = () => {
    setNombre('');
    setApellidos('');
    setEmpresa('');
    setPuesto('');
    setCelular('');
    setTelefonoFijo('');
    setCorreo('');
    setPaginaWeb('');
    setGiroServicio('');
    setTipo('Lead');
    setEvento('EXPOPYME');
    setLeadGenerator('Sergio');
    setDireccion('');
    setNotas('');
    setStatus('Pendiente');
  };

  const [error, setError] = useState<string | null>(null);

  // Reset all fields whenever modal opens so it's always pristine and blank
  useEffect(() => {
    if (isOpen) {
      resetForm();
      setError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa.trim() && !nombre.trim()) {
      setError('Por favor especifica al menos el nombre o la empresa.');
      return;
    }

    const uniqueId = `lead-manual-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const newLead: Lead = {
      id: uniqueId,
      no: nextNo,
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      empresa: empresa.trim() || 'Empresa no especificada',
      evento: evento.trim() || 'EXPOPYME',
      notas: notas.trim(),
      leadGenerator: leadGenerator.trim(),
      giroServicio: giroServicio.trim(),
      tipo,
      celular: celular.trim(),
      telefonoFijo: telefonoFijo.trim(),
      correo: correo.trim(),
      paginaWeb: paginaWeb.trim(),
      puesto: puesto.trim(),
      direccion: direccion.trim(),
      status,
      createdAt: new Date().toISOString(),
    };

    onAddLead(newLead);
    resetForm();
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Nuevo Contacto Manual</h2>
              <p className="text-xs text-slate-300">Asignado con número correlativo #{nextNo}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-red-500 font-bold ml-2">✕</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Gabriela"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Apellidos</label>
              <input
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Ej. Monzalvo"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Empresa *</label>
              <input
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Nombre de la empresa"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Puesto</label>
              <input
                type="text"
                value={puesto}
                onChange={(e) => setPuesto(e.target.value)}
                placeholder="Director General, Ventas..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Celular / WhatsApp</label>
              <input
                type="tel"
                value={celular}
              onChange={(e) => setCelular(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="8116294590"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Teléfono Fijo</label>
              <input
                type="tel"
                value={telefonoFijo}
                onChange={(e) => setTelefonoFijo(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="8183690200"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Correo</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="contacto@empresa.com"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              >
                <option value="Lead">Lead</option>
                <option value="Lead Potencial">Lead Potencial</option>
                <option value="Alianza">Alianza</option>
                <option value="Proveedor">Proveedor</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lead Generator</label>
              <input
                type="text"
                value={leadGenerator}
                onChange={(e) => setLeadGenerator(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-semibold"
              >
                <option value="Pendiente">⏳ Pendiente</option>
                <option value="Contactado">🌀 Contactado</option>
                <option value="Nuevo Cierre">💰 Nuevo Cierre</option>
                <option value="Rechazado">🙅🏻‍♀️ Rechazado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Giro / Servicio</label>
              <input
                type="text"
                value={giroServicio}
                onChange={(e) => setGiroServicio(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Página Web</label>
              <input
                type="url"
                value={paginaWeb}
                onChange={(e) => setPaginaWeb(e.target.value)}
                placeholder="https://www.empresa.com"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notas</label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              placeholder="Notas y observaciones de seguimiento"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg flex items-center gap-1.5 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar campos
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md flex items-center gap-2 active:scale-98 transition-transform"
              >
                <Save className="w-4 h-4" />
                Guardar Contacto
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
