import React, { useState } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Globe,
  MoreHorizontal,
  ChevronDown,
  ExternalLink,
  Edit2,
  Trash2,
  Image as ImageIcon,
  ArrowUpDown,
} from 'lucide-react';
import { Lead, LeadStatus } from '../types/lead';

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  onDeleteLead: (id: string) => void;
}

type SortField = 'no' | 'nombre' | 'empresa' | 'tipo' | 'status' | 'createdAt';

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onSelectLead,
  onUpdateStatus,
  onDeleteLead,
}) => {
  // Default sort: newest leads first (highest No. or most recently created)
  const [sortField, setSortField] = useState<SortField>('no');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // For numbers and dates, default to descending (newest first); for text, ascending (A-Z)
      setSortAsc(field === 'nombre' || field === 'empresa' || field === 'tipo' || field === 'status');
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'no') {
      const numA = Number(a.no) || 0;
      const numB = Number(b.no) || 0;
      comparison = numA - numB;
    } else if (sortField === 'createdAt') {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      comparison = dateA - dateB;
    } else if (sortField === 'nombre') {
      comparison = `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`);
    } else if (sortField === 'empresa') {
      comparison = a.empresa.localeCompare(b.empresa);
    } else if (sortField === 'tipo') {
      comparison = a.tipo.localeCompare(b.tipo);
    } else if (sortField === 'status') {
      comparison = a.status.localeCompare(b.status);
    }
    return sortAsc ? comparison : -comparison;
  });

  const getStatusBadge = (status: LeadStatus, id: string) => {
    const config = {
      'Contactado': {
        icon: '🌀',
        label: 'Contactado',
        bg: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      },
      'Nuevo Cierre': {
        icon: '💰',
        label: 'Nuevo Cierre',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold',
      },
      'Rechazado': {
        icon: '🙅🏻‍♀️',
        label: 'Rechazado',
        bg: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
      },
      'Pendiente': {
        icon: '⏳',
        label: 'Pendiente',
        bg: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
      },
    }[status] || {
      icon: '⏳',
      label: 'Pendiente',
      bg: 'bg-slate-50 text-slate-700 border-slate-200',
    };

    return (
      <div className="relative group/status inline-block">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // Cycle status quickly
            const sequence: LeadStatus[] = ['Pendiente', 'Contactado', 'Nuevo Cierre', 'Rechazado'];
            const nextIdx = (sequence.indexOf(status) + 1) % sequence.length;
            onUpdateStatus(id, sequence[nextIdx]);
          }}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${config.bg}`}
          title="Haz clic para cambiar el estado"
        >
          <span>{config.icon}</span>
          <span>{config.label}</span>
        </button>
      </div>
    );
  };

  const getTypeBadge = (tipo: string) => {
    switch (tipo) {
      case 'Alianza':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Alianza
          </span>
        );
      case 'Lead':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Lead
          </span>
        );
      case 'Lead Potencial':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
            Lead Potencial
          </span>
        );
      case 'Proveedor':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            Proveedor
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {tipo || 'Sin tipo'}
          </span>
        );
    }
  };

  const cleanPhone = (phoneStr: string) => phoneStr.replace(/[^0-9]/g, '');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <th
                onClick={() => handleSort('no')}
                className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/80 transition-colors sticky left-0 bg-slate-100 z-10 w-16"
              >
                <div className="flex items-center gap-1">
                  <span>No.</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('nombre')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/80 transition-colors sticky left-16 bg-slate-100 z-10 min-w-[200px]"
              >
                <div className="flex items-center gap-1">
                  <span>Nombre / Apellidos</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('empresa')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-200/80 transition-colors min-w-[170px]"
              >
                <div className="flex items-center gap-1">
                  <span>Empresa</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('status')}
                className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/80 transition-colors min-w-[130px]"
              >
                <div className="flex items-center gap-1">
                  <span>Estado</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('tipo')}
                className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/80 transition-colors min-w-[110px]"
              >
                <div className="flex items-center gap-1">
                  <span>Tipo</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-3 px-3.5 min-w-[140px]">Contacto Rápido</th>

              <th className="py-3 px-3.5 min-w-[130px]">Puesto</th>

              <th className="py-3 px-3.5 min-w-[100px]">Lead Gen</th>

              <th className="py-3 px-3.5 min-w-[100px]">Evento</th>

              <th className="py-3 px-3.5 min-w-[220px]">Giro / Servicio</th>

              <th className="py-3 px-4 min-w-[240px]">Notas</th>

              <th className="py-3 px-4 min-w-[200px]">Dirección</th>

              <th className="py-3 px-3 text-center w-16">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-700">
            {sortedLeads.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-slate-400">
                  No se encontraron contactos que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              sortedLeads.map((lead) => {
                const phoneDigits = cleanPhone(lead.celular || lead.telefonoFijo);
                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                  >
                    {/* No. */}
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-500 sticky left-0 bg-white group-hover:bg-purple-50/60 z-10 border-r border-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{lead.no}</span>
                        {(lead.photoUrl || lead.photoBackUrl) && (
                          <div className="relative shrink-0" title={lead.photoBackUrl ? 'Tarjeta escaneada (2 caras: Frente + Reverso)' : 'Tarjeta escaneada'}>
                            <img
                              src={lead.photoUrl || lead.photoBackUrl}
                              alt="Tarjeta"
                              className="w-7 h-5 object-cover rounded border border-purple-300 shadow-2xs group-hover:border-purple-500 bg-slate-100"
                            />
                            {lead.photoBackUrl && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-600 rounded-full border border-white" title="2 caras" />
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Nombre y Apellidos */}
                    <td className="py-2.5 px-4 font-semibold text-slate-900 sticky left-16 bg-white group-hover:bg-purple-50/60 z-10 border-r border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="truncate max-w-[200px]">
                          {lead.nombre || lead.apellidos ? (
                            <>
                              <span className="font-bold">{lead.nombre}</span>{' '}
                              <span>{lead.apellidos}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 italic">Contacto comercial</span>
                          )}
                        </div>
                        {(lead.id.startsWith('lead-scanned') || lead.photoUrl) && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                            ✨ Escaneada
                          </span>
                        )}
                      </div>
                      {lead.puesto && (
                        <div className="text-[10px] text-slate-500 font-normal truncate max-w-[220px]">
                          {lead.puesto}
                        </div>
                      )}
                    </td>

                    {/* Empresa */}
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      <div className="truncate max-w-[170px]">{lead.empresa || '-'}</div>
                    </td>

                    {/* Estado */}
                    <td className="py-2.5 px-3.5">
                      {getStatusBadge(lead.status, lead.id)}
                    </td>

                    {/* Tipo */}
                    <td className="py-2.5 px-3.5">{getTypeBadge(lead.tipo)}</td>

                    {/* Contacto Rápido */}
                    <td className="py-2.5 px-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {phoneDigits && (
                          <a
                            href={`https://wa.me/${phoneDigits.length === 10 ? `52${phoneDigits}` : phoneDigits}?text=${encodeURIComponent(
                              `Hola ${lead.nombre || ''}, te contacto respecto a ${lead.empresa} del evento ${lead.evento}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                            title={`Enviar WhatsApp a ${lead.celular}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {lead.celular && (
                          <a
                            href={`tel:${lead.celular}`}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title={`Llamar al celular: ${lead.celular}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {lead.correo && (
                          <a
                            href={`mailto:${lead.correo}?subject=${encodeURIComponent(
                              `Seguimiento ${lead.evento} - ${lead.empresa}`
                            )}`}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                            title={`Enviar correo a ${lead.correo}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {lead.paginaWeb && (
                          <a
                            href={
                              lead.paginaWeb.startsWith('http')
                                ? lead.paginaWeb
                                : `https://${lead.paginaWeb}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title={`Abrir página web: ${lead.paginaWeb}`}
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Puesto */}
                    <td className="py-2.5 px-3.5 text-slate-600">
                      <div className="truncate max-w-[140px]" title={lead.puesto}>
                        {lead.puesto || '-'}
                      </div>
                    </td>

                    {/* Lead Generator */}
                    <td className="py-2.5 px-3.5 text-slate-600">
                      {lead.leadGenerator ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-[10px] text-slate-700">
                          {lead.leadGenerator}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Evento */}
                    <td className="py-2.5 px-3.5 text-slate-600">
                      <span className="font-medium">{lead.evento || '-'}</span>
                    </td>

                    {/* Giro / Servicio */}
                    <td className="py-2.5 px-3.5 text-slate-600">
                      <div className="truncate max-w-[220px]" title={lead.giroServicio}>
                        {lead.giroServicio || '-'}
                      </div>
                    </td>

                    {/* Notas */}
                    <td className="py-2.5 px-4 text-slate-600">
                      <div className="truncate max-w-[240px] text-[11px]" title={lead.notas}>
                        {lead.notas || '-'}
                      </div>
                    </td>

                    {/* Dirección */}
                    <td className="py-2.5 px-4 text-slate-600">
                      <div className="truncate max-w-[200px] text-[11px]" title={lead.direccion}>
                        {lead.direccion || '-'}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectLead(lead)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeadToDelete(lead)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 text-slate-500 text-[11px] flex items-center justify-between">
        <span>
          Mostrando <strong>{sortedLeads.length}</strong> de <strong>{leads.length}</strong> contactos
        </span>
        <span className="text-slate-400">
          Tip: Haz clic en el estado (🌀, 💰, 🙅🏻‍♀️, ⏳) de cualquier fila para cambiarlo directamente
        </span>
      </div>

      {/* Safe in-app Delete Confirmation Dialog */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              ¿Eliminar contacto #{leadToDelete.no}?
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Se eliminará a <strong className="text-slate-800">{leadToDelete.nombre} {leadToDelete.apellidos || leadToDelete.empresa}</strong> de forma permanente tanto en tu dispositivo como en el servidor.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteLead(leadToDelete.id);
                  setLeadToDelete(null);
                }}
                className="flex-1 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
