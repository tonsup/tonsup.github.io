import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import type { UserProfile } from '@/types';

export default function Users() {
  const { t } = useTranslation();
  const { users, currentUser, config, upsertUser, db } = useStore();
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const isAdmin = currentUser?.role === 'admin';

  async function addUser() {
    const login = prompt('GitHub login of user to add?');
    if (!login) return;
    const now = new Date().toISOString();
    const u: UserProfile = {
      id: login,
      login,
      role: 'member',
      createdAt: now,
      updatedAt: now
    };
    await upsertUser(u);
  }

  async function toggleAdmin(u: UserProfile) {
    if (!config || !db) return;
    const isA = config.admins.includes(u.login);
    const nextAdmins = isA ? config.admins.filter((a) => a !== u.login) : [...config.admins, u.login];
    await db.saveConfig({ ...config, admins: nextAdmins });
    await upsertUser({ ...u, role: isA ? 'member' : 'admin', updatedAt: new Date().toISOString() });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('nav.users')}</h1>
        {isAdmin && <button className="btn-primary" onClick={addUser}>+ Add user</button>}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">{t('common.role')}</th>
              <th className="px-3 py-2">Skills</th>
              <th className="px-3 py-2">Cost/hr</th>
              <th className="px-3 py-2">BW (h/wk)</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2 flex items-center gap-2">
                  {u.avatarUrl && <img src={u.avatarUrl} className="w-6 h-6 rounded-full" />}
                  <div>
                    <div className="font-medium">{u.name ?? u.login}</div>
                    <div className="text-xs text-slate-500">@{u.login}</div>
                  </div>
                </td>
                <td className="px-3 py-2"><span className="chip bg-slate-100">{u.role}</span></td>
                <td className="px-3 py-2">{u.skills?.join(', ') ?? '—'}</td>
                <td className="px-3 py-2">{u.hourlyCost ?? '—'}</td>
                <td className="px-3 py-2">{u.bandwidthHoursPerWeek ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  {isAdmin && (
                    <div className="flex gap-1 justify-end">
                      <button className="btn-ghost text-xs" onClick={() => setEditing(u)}>Edit</button>
                      <button className="btn-ghost text-xs" onClick={() => toggleAdmin(u)}>
                        {u.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <UserEditor u={editing} onClose={() => setEditing(null)} onSave={async (u) => {
          await upsertUser(u);
          setEditing(null);
        }} />
      )}
    </div>
  );
}

function UserEditor({ u, onClose, onSave }: { u: UserProfile; onClose: () => void; onSave: (u: UserProfile) => void }) {
  const [d, setD] = useState<UserProfile>(u);
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold mb-3">Edit @{u.login}</h3>
        <label className="label">Name</label>
        <input className="input mb-2" value={d.name ?? ''} onChange={(e) => setD({ ...d, name: e.target.value })} />
        <label className="label">Email</label>
        <input className="input mb-2" value={d.email ?? ''} onChange={(e) => setD({ ...d, email: e.target.value })} />
        <label className="label">Skills (comma)</label>
        <input className="input mb-2" value={d.skills?.join(', ') ?? ''} onChange={(e) => setD({ ...d, skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Hourly cost</label>
            <input type="number" className="input" value={d.hourlyCost ?? 0} onChange={(e) => setD({ ...d, hourlyCost: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Bandwidth h/wk</label>
            <input type="number" className="input" value={d.bandwidthHoursPerWeek ?? 0} onChange={(e) => setD({ ...d, bandwidthHoursPerWeek: Number(e.target.value) })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave({ ...d, updatedAt: new Date().toISOString() })}>Save</button>
        </div>
      </div>
    </div>
  );
}
