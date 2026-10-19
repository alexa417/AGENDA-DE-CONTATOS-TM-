import React, { useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Save, Trash2, UserRound, X } from 'lucide-react';
import { supabase } from '../utils/storage';

type Generator = { id: string; name: string; active: boolean };

export default function LeadGeneratorSettings() {
  const [items, setItems] = useState<Generator[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Generator | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('lead_generators')
      .select('id,name,active')
      .order('active', { ascending: false })
      .order('name', { ascending: true });
    if (queryError) setError(queryError.message);
    else setItems((data || []) as Generator[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const clean = name.trim();
    if (!clean) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const { error: updateError } = await supabase
          .from('lead_generators')
          .update({ name: clean })
          .eq('id', editing.id);
        if (updateError) throw updateError;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error: insertError } = await supabase
          .from('lead_generators')
          .insert({ name: clean, created_by: userData.user?.id || null });
        if (insertError) throw insertError;
      }
      setName('');
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar la persona.');
    } finally { setSaving(false); }
  };

  const toggle = async (item: Generator) => {
    setError('');
    const { error: updateError } = await supabase
      .from('lead_generators')
      .update({ active: !item.active })
      .eq('id', item.id);
    if (updateError) setError(updateError.message);
    else await load();
  };

  const remove = async (item: Generator) => {
    if (!window.confirm(`¿Quitar a ${item.name} de la lista de Lead Generators? Los contactos históricos conservarán su nombre.`)) return;
    setError('');
    const { error: updateError } = await supabase
      .from('lead_generators')
      .update({ active: false })
      .eq('id', item.id);
    if (updateError) setError(updateError.message);
    else await load();
  };

  return (
    <section className="rounded-2xl border border-violet-100 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-violet-50/70 border-b border-violet-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900 flex items-center gap-2"><UserRound className="w-4 h-4 text-violet-700" /> Lead Generators</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Agrega, edita o quita personas de la lista compartida.</p>
        </div>
        <button type="button" onClick={load} className="p-2 rounded-lg hover:bg-white text-violet-700" title="Actualizar"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="p-4 space-y-3">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-xs">{error}</div>}

        <div className="flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
            placeholder="Nombre de la persona"
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          {editing && <button type="button" onClick={() => { setEditing(null); setName(''); }} className="px-3 rounded-xl border border-slate-200 text-slate-500" title="Cancelar"><X className="w-4 h-4" /></button>}
          <button type="button" disabled={saving || !name.trim()} onClick={save} className="px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2">
            {editing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editing ? 'Guardar' : 'Agregar'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map(item => (
            <div key={item.id} className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border ${item.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-800 truncate">{item.name}</div>
                <div className="text-[10px] text-slate-400">{item.active ? 'Activo' : 'Retirado'}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => { setEditing(item); setName(item.name); }} className="p-2 rounded-lg hover:bg-violet-50 text-violet-700" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                {item.active ? (
                  <button type="button" onClick={() => remove(item)} className="p-2 rounded-lg hover:bg-red-50 text-red-600" title="Quitar"><Trash2 className="w-3.5 h-3.5" /></button>
                ) : (
                  <button type="button" onClick={() => toggle(item)} className="px-2 py-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 text-[10px] font-bold" title="Reactivar">Reactivar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
