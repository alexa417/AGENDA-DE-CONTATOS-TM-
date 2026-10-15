import React from 'react';
import { Lead, LeadStatus } from '../types/lead';
import { MessageSquare, Mail, Phone, Building, User, Image as ImageIcon, ChevronRight, ChevronLeft } from 'lucide-react';

interface KanbanViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (id: string, newStatus: LeadStatus) => void;
}

const COLUMNS: { status: LeadStatus; title: string; color: string; border: string; bg: string; dot: string }[] = [
  {
    status: 'Pendiente',
    title: '⏳ Pendientes',
    color: 'text-amber-800',
    border: 'border-amber-200',
    bg: 'bg-amber-50/50',
    dot: 'bg-amber-400',
  },
  {
    status: 'Contactado',
    title: '🌀 Contactados',
    color: 'text-blue-800',
    border: 'border-blue-200',
    bg: 'bg-blue-50/50',
    dot: 'bg-blue-500',
  },
  {
    status: 'Nuevo Cierre',
    title: '💰 Nuevos Cierres',
    color: 'text-emerald-800',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/50',
    dot: 'bg-emerald-500',
  },
  {
    status: 'Rechazado',
    title: '🙅🏻‍♀️ Rechazados',
    color: 'text-rose-800',
    border: 'border-rose-200',
    bg: 'bg-rose-50/50',
    dot: 'bg-rose-500',
  },
];

export const KanbanView: React.FC<KanbanViewProps> = ({
  leads,
  onSelectLead,
  onUpdateStatus,
}) => {
  const getNextStatus = (current: LeadStatus, dir: 'prev' | 'next'): LeadStatus => {
    const list: LeadStatus[] = ['Pendiente', 'Contactado', 'Nuevo Cierre', 'Rechazado'];
    const idx = list.indexOf(current);
    if (dir === 'next') {
      return list[Math.min(idx + 1, list.length - 1)];
    }
    return list[Math.max(idx - 1, 0)];
  };

  const cleanPhone = (phoneStr: string) => phoneStr.replace(/[^0-9]/g, '');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      {COLUMNS.map((col) => {
        const columnLeads = leads.filter((l) => l.status === col.status);
        return (
          <div
            key={col.status}
            className={`rounded-2xl border ${col.border} ${col.bg} p-3.5 flex flex-col min-h-[500px] shadow-2xs`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                  {col.title}
                </h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white shadow-2xs text-slate-700">
                {columnLeads.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="space-y-2.5 overflow-y-auto max-h-[70vh] pr-1">
              {columnLeads.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Sin contactos en esta etapa
                </div>
              ) : (
                columnLeads.map((lead) => {
                  const phoneDigits = cleanPhone(lead.celular || lead.telefonoFijo);
                  return (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col gap-2"
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          #{lead.no}
                        </span>
                        <div className="flex items-center gap-1">
                          {lead.tipo && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {lead.tipo}
                            </span>
                          )}
                          {(lead.photoUrl || lead.photoBackUrl) && (
                            <span
                              title={
                                lead.photoBackUrl
                                  ? 'Tarjeta escaneada (Frente + Reverso)'
                                  : 'Tarjeta escaneada (Frente)'
                              }
                              className={`text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 ${
                                lead.photoBackUrl
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'text-indigo-600 bg-indigo-50'
                              }`}
                            >
                              <ImageIcon className="w-3 h-3" />
                              {lead.photoBackUrl && '2x'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name & Company */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {lead.nombre || lead.apellidos
                            ? `${lead.nombre} ${lead.apellidos}`
                            : lead.empresa}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.empresa}</span>
                        </p>
                        {lead.puesto && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {lead.puesto}
                          </p>
                        )}
                      </div>

                      {/* Notes snippet */}
                      {lead.notas && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg line-clamp-2 italic border border-slate-100">
                          "{lead.notas}"
                        </p>
                      )}

                      {/* Footer Actions & Stage Shift */}
                      <div
                        className="pt-2 border-t border-slate-100 flex items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          {phoneDigits && (
                            <a
                              href={`https://wa.me/${phoneDigits.length === 10 ? `52${phoneDigits}` : phoneDigits}?text=${encodeURIComponent(
                                `Hola ${lead.nombre || ''}, te contacto respecto a ${lead.empresa} del evento ${lead.evento}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition-colors"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.correo && (
                            <a
                              href={`mailto:${lead.correo}`}
                              className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
                              title="Correo"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        {/* Stage mover buttons */}
                        <div className="flex items-center gap-1">
                          {col.status !== 'Pendiente' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(lead.id, getNextStatus(lead.status, 'prev'))}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Mover a etapa anterior"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {col.status !== 'Rechazado' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(lead.id, getNextStatus(lead.status, 'next'))}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Mover a siguiente etapa"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
