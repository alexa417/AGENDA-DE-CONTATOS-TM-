import React, { useEffect, useState } from 'react';
import { KeyRound, Settings, Plus, Pencil, UserCheck, UserX, Trash2, X, ShieldCheck, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '../utils/storage';

type AccessRole = 'admin' | 'user' | 'viewer';
type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: AccessRole;
  active: boolean;
  created_at: string;
  last_sign_in_at?: string | null;
};

const roleLabel: Record<AccessRole, string> = {
  admin: 'Administrador',
  user: 'Usuario',
  viewer: 'Solo lectura',
};

export default function UserAccessSettings() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'user' as AccessRole, active: true });

  const callApi = async (body: Record<string, unknown>) => {
    const { data, error: invokeError } = await supabase.functions.invoke('manage-users', { body });
    if (invokeError) throw invokeError;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callApi({ action: 'list' });
      setUsers(data.users || []);
      setIsAdmin(true);
    } catch (err: any) {
      const message = err?.message || '';
      if (/403|permisos|administrador/i.test(message)) setIsAdmin(false);
      else setError(message || 'No se pudieron cargar los accesos.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ full_name: '', email: '', password: '', role: 'user', active: true });
    setError('');
    setOpen(true);
    loadUsers();
  };

  const openEdit = (user: UserRow) => {
    setEditing(user);
    setForm({ full_name: user.full_name || '', email: user.email || '', password: '', role: user.role || 'user', active: user.active });
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await callApi({ action: 'update', user_id: editing.id, full_name: form.full_name, email: form.email, password: form.password || undefined, role: form.role, active: form.active });
      } else {
        await callApi({ action: 'create', full_name: form.full_name, email: form.email, password: form.password, role: form.role });
      }
      setEditing(null);
      setForm({ full_name: '', email: '', password: '', role: 'user', active: true });
      await loadUsers();
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el acceso.');
    } finally { setSaving(false); }
  };

  const toggleActive = async (user: UserRow) => {
    setError('');
    try {
      await callApi({ action: 'update', user_id: user.id, active: !user.active });
      await loadUsers();
    } catch (err: any) { setError(err?.message || 'No se pudo cambiar el acceso.'); }
  };

  const removeUser = async (user: UserRow) => {
    if (!window.confirm(`¿Eliminar el acceso de ${user.email}? Esta acción no se puede deshacer.`)) return;
    setError('');
    try {
      await callApi({ action: 'delete', user_id: user.id });
      await loadUsers();
    } catch (err: any) { setError(err?.message || 'No se pudo eliminar el acceso.'); }
  };

  if (!isAdmin) return null;

  return <>
    <button
      type="button"
      onClick={() => { setOpen(true); setEditing(null); setError(''); loadUsers(); }}
      className="fixed right-3 bottom-14 z-[1000] px-3 py-2 rounded-xl bg-white/95 border border-violet-200 text-violet-800 shadow-lg hover:bg-violet-50 font-bold text-xs flex items-center gap-2 backdrop-blur"
      title="Administrar accesos"
    >
      <Settings className="w-4 h-4" /> Accesos
    </button>

    {open && <div className="fixed inset-0 z-[2000] bg-slate-950/55 backdrop-blur-sm p-4 sm:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl border border-violet-100 overflow-hidden">
        <div className="px-5 sm:px-7 py-5 bg-gradient-to-r from-violet-950 via-violet-800 to-fuchsia-800 text-white flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-violet-200 font-bold">Configuración</div>
            <h2 className="text-xl sm:text-2xl font-black mt-1 flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> Accesos y usuarios</h2>
            <p className="text-xs text-violet-100 mt-1">Crea correos, contraseñas y permisos para cada persona.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 sm:p-7 space-y-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900">Personas con acceso</h3>
              <p className="text-xs text-slate-500 mt-1">Los administradores pueden gestionar usuarios; los demás respetan su nivel de permiso.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={loadUsers} className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button>
              <button type="button" onClick={openCreate} className="px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-xs font-black flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo acceso</button>
            </div>
          </div>

          {editing !== null || (form.email === '' && open && users.length === 0) ? null : null}

          {open && <form onSubmit={save} className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2 flex items-center justify-between">
              <div className="font-black text-slate-900">{editing ? 'Editar acceso' : 'Crear nuevo acceso'}</div>
              {editing && <button type="button" onClick={() => setEditing(null)} className="text-xs font-bold text-violet-700">Cancelar edición</button>}
            </div>
            <label className="grid gap-1 text-xs font-bold text-slate-700">Nombre<input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm" placeholder="Nombre de la persona" /></label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">Correo electrónico<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm" placeholder="persona@empresa.com" /></label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">{editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}<input required={!editing} minLength={8} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm" placeholder="Mínimo 8 caracteres" /></label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">Permiso<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as AccessRole })} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"><option value="user">Usuario — puede trabajar contactos</option><option value="viewer">Solo lectura — consulta</option><option value="admin">Administrador — gestiona accesos</option></select></label>
            {editing && <label className="md:col-span-2 flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Acceso activo</label>}
            <div className="md:col-span-2 flex justify-end"><button disabled={saving} type="submit" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-700 text-white font-black text-sm disabled:opacity-60"><KeyRound className="w-4 h-4 inline mr-2" />{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear acceso'}</button></div>
          </form>}

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Persona</th><th className="px-4 py-3">Permiso</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
              <tbody>{users.map(user => <tr key={user.id} className="border-t border-slate-100"><td className="px-4 py-3"><div className="font-bold text-slate-900">{user.full_name || 'Sin nombre'}</div><div className="text-xs text-slate-500">{user.email}</div></td><td className="px-4 py-3"><span className="inline-flex px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold">{roleLabel[user.role]}</span></td><td className="px-4 py-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{user.active ? 'Activo' : 'Desactivado'}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => openEdit(user)} className="p-2 rounded-lg hover:bg-violet-50 text-violet-700" title="Editar"><Pencil className="w-4 h-4" /></button><button type="button" onClick={() => toggleActive(user)} className="p-2 rounded-lg hover:bg-amber-50 text-amber-700" title={user.active ? 'Desactivar' : 'Activar'}>{user.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}</button><button type="button" onClick={() => removeUser(user)} className="p-2 rounded-lg hover:bg-red-50 text-red-600" title="Eliminar"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody>
            </table>
            {!loading && users.length === 0 && <div className="p-8 text-center text-sm text-slate-500"><Eye className="w-6 h-6 mx-auto mb-2" />No hay usuarios registrados.</div>}
          </div>
        </div>
      </div>
    </div>}
  </>;
}
