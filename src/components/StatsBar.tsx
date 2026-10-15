import React from 'react';
import { Lead, LeadStatus, LeadType } from '../types/lead';
import { Users, PhoneCall, CheckCircle, XCircle, Clock, Award } from 'lucide-react';

interface StatsBarProps {
  leads: Lead[];
  currentStatusFilter: LeadStatus | 'ALL';
  onSelectStatusFilter: (status: LeadStatus | 'ALL') => void;
  currentTypeFilter: string | 'ALL';
  onSelectTypeFilter: (type: string | 'ALL') => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  leads,
  currentStatusFilter,
  onSelectStatusFilter,
  currentTypeFilter,
  onSelectTypeFilter,
}) => {
  const total = leads.length;
  const contactados = leads.filter((l) => l.status === 'Contactado').length;
  const cierres = leads.filter((l) => l.status === 'Nuevo Cierre').length;
  const rechazados = leads.filter((l) => l.status === 'Rechazado').length;
  const pendientes = leads.filter((l) => l.status === 'Pendiente').length;

  const alianzas = leads.filter((l) => l.tipo === 'Alianza').length;
  const leadsCount = leads.filter((l) => l.tipo === 'Lead').length;
  const potenciales = leads.filter((l) => l.tipo === 'Lead Potencial').length;
  const proveedores = leads.filter((l) => l.tipo === 'Proveedor').length;

  return (
    <div className="space-y-3">
      {/* Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total */}
        <button
          type="button"
          onClick={() => onSelectStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            currentStatusFilter === 'ALL'
              ? 'bg-[#3b0764] text-white border-purple-800 shadow-md ring-2 ring-purple-500/20'
              : 'bg-white hover:bg-purple-50/40 text-slate-800 border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
              Total Contactos
            </span>
            <Users className="w-4 h-4 opacity-75" />
          </div>
          <div className="text-2xl font-black mt-1">{total}</div>
          <div className="text-[10px] opacity-75 mt-0.5">Base en CRM</div>
        </button>

        {/* Contactados */}
        <button
          type="button"
          onClick={() =>
            onSelectStatusFilter(currentStatusFilter === 'Contactado' ? 'ALL' : 'Contactado')
          }
          className={`p-3.5 rounded-xl border text-left transition-all ${
            currentStatusFilter === 'Contactado'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white hover:bg-blue-50/50 text-slate-800 border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 group-hover:text-blue-800">
              🌀 Contactados
            </span>
            <PhoneCall className={`w-4 h-4 ${currentStatusFilter === 'Contactado' ? 'text-white' : 'text-blue-500'}`} />
          </div>
          <div className={`text-2xl font-black mt-1 ${currentStatusFilter === 'Contactado' ? 'text-white' : 'text-blue-700'}`}>
            {contactados}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">Seguimiento enviado</div>
        </button>

        {/* Nuevos Cierres */}
        <button
          type="button"
          onClick={() =>
            onSelectStatusFilter(currentStatusFilter === 'Nuevo Cierre' ? 'ALL' : 'Nuevo Cierre')
          }
          className={`p-3.5 rounded-xl border text-left transition-all ${
            currentStatusFilter === 'Nuevo Cierre'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white hover:bg-emerald-50/50 text-slate-800 border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              💰 Nuevos Cierres
            </span>
            <Award className={`w-4 h-4 ${currentStatusFilter === 'Nuevo Cierre' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <div className={`text-2xl font-black mt-1 ${currentStatusFilter === 'Nuevo Cierre' ? 'text-white' : 'text-emerald-700'}`}>
            {cierres}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">Negocios ganados</div>
        </button>

        {/* Rechazados */}
        <button
          type="button"
          onClick={() =>
            onSelectStatusFilter(currentStatusFilter === 'Rechazado' ? 'ALL' : 'Rechazado')
          }
          className={`p-3.5 rounded-xl border text-left transition-all ${
            currentStatusFilter === 'Rechazado'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white hover:bg-rose-50/50 text-slate-800 border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              🙅🏻‍♀️ Rechazados
            </span>
            <XCircle className={`w-4 h-4 ${currentStatusFilter === 'Rechazado' ? 'text-white' : 'text-rose-500'}`} />
          </div>
          <div className={`text-2xl font-black mt-1 ${currentStatusFilter === 'Rechazado' ? 'text-white' : 'text-rose-700'}`}>
            {rechazados}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">No interesado / Descartado</div>
        </button>

        {/* Pendientes */}
        <button
          type="button"
          onClick={() =>
            onSelectStatusFilter(currentStatusFilter === 'Pendiente' ? 'ALL' : 'Pendiente')
          }
          className={`p-3.5 rounded-xl border text-left transition-all ${
            currentStatusFilter === 'Pendiente'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white hover:bg-amber-50/50 text-slate-800 border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              ⏳ Pendientes
            </span>
            <Clock className={`w-4 h-4 ${currentStatusFilter === 'Pendiente' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className={`text-2xl font-black mt-1 ${currentStatusFilter === 'Pendiente' ? 'text-white' : 'text-amber-700'}`}>
            {pendientes}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">Por contactar</div>
        </button>
      </div>

      {/* Type quick filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider shrink-0 mr-1">
          Tipo:
        </span>
        <button
          type="button"
          onClick={() => onSelectTypeFilter('ALL')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
            currentTypeFilter === 'ALL'
              ? 'bg-[#3b0764] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-purple-50/50 border border-slate-200'
          }`}
        >
          Todos ({total})
        </button>
        <button
          type="button"
          onClick={() => onSelectTypeFilter(currentTypeFilter === 'Alianza' ? 'ALL' : 'Alianza')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
            currentTypeFilter === 'Alianza'
              ? 'bg-purple-600 text-white'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
          }`}
        >
          🤝 Alianzas ({alianzas})
        </button>
        <button
          type="button"
          onClick={() => onSelectTypeFilter(currentTypeFilter === 'Lead' ? 'ALL' : 'Lead')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
            currentTypeFilter === 'Lead'
              ? 'bg-indigo-600 text-white'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
          }`}
        >
          🎯 Leads ({leadsCount})
        </button>
        <button
          type="button"
          onClick={() =>
            onSelectTypeFilter(currentTypeFilter === 'Lead Potencial' ? 'ALL' : 'Lead Potencial')
          }
          className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
            currentTypeFilter === 'Lead Potencial'
              ? 'bg-cyan-600 text-white'
              : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200'
          }`}
        >
          ⚡ Leads Potenciales ({potenciales})
        </button>
        <button
          type="button"
          onClick={() => onSelectTypeFilter(currentTypeFilter === 'Proveedor' ? 'ALL' : 'Proveedor')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
            currentTypeFilter === 'Proveedor'
              ? 'bg-teal-600 text-white'
              : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
          }`}
        >
          📦 Proveedores ({proveedores})
        </button>

        {/* Quick filter for scanned business cards (Yesterday/Today) */}
        <button
          type="button"
          onClick={() => onSelectTypeFilter(currentTypeFilter === 'SCANNED' ? 'ALL' : 'SCANNED')}
          className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            currentTypeFilter === 'SCANNED'
              ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md ring-2 ring-purple-400'
              : 'bg-purple-100/90 text-purple-900 hover:bg-purple-200 border border-purple-300'
          }`}
          title="Ver las tarjetas escaneadas con foto (incluyendo las de ayer)"
        >
          <span>📸 Tarjetas Escaneadas ({leads.filter((l) => Boolean(l.photoUrl || l.photoBackUrl || l.id.startsWith('lead-scanned'))).length})</span>
        </button>
      </div>
    </div>
  );
};
