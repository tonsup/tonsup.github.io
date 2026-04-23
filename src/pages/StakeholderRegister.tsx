import { useState } from 'react';
import { useStore } from '@/store';
import { nanoid } from 'nanoid';
import type { Stakeholder } from '@/types';

const TYPES: Stakeholder['type'][] = ['sponsor', 'customer', 'user', 'supplier', 'regulator', 'internal', 'other'];

function strategyFor(power?: number, interest?: number): Stakeholder['strategy'] {
  const p = (power ?? 3) >= 4;
  const i = (interest ?? 3) >= 4;
  if (p && i) return 'manage-closely';
  if (p && !i) return 'keep-satisfied';
  if (!p && i) return 'keep-informed';
  return 'monitor';
}

export default function StakeholderRegister() {
  const { activeProject, saveProject } = useStore();
  const [editing, setEditing] = useState<Stakeholder | null>(null);

  if (!activeProject) return null;
  const p = activeProject;

  async function add() {
    const name = prompt('Stakeholder name?');
    if (!name) return;
    const now = new Date().toISOString();
    const s: Stakeholder = {
      id: nanoid(10),
      projectId: p.project.id,
      name,
      type: 'internal',
      power: 3,
      interest: 3,
      strategy: 'monitor',
      createdAt: now,
      updatedAt: now
    };
    await saveProject({ ...p, stakeholders: [...p.stakeholders, s] });
    setEditing(s);
  }

  async function save(s: Stakeholder) {
    const strategy = strategyFor(s.power, s.interest);
    await saveProject({
      ...p,
      stakeholders: p.stakeholders.map((x) => (x.id === s.id ? { ...s, strategy, updatedAt: new Date().toISOString() } : x))
    });
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm('Delete?')) return;
    await saveProject({ ...p, stakeholders: p.stakeholders.filter((x) => x.id !== id) });
    setEditing(null);
  }

  // Power / Interest grid
  const grid: Stakeholder[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
  for (const s of p.stakeholders) {
    const px = Math.min(5, Math.max(1, s.power ?? 3)) - 1;
    const ix = Math.min(5, Math.max(1, s.interest ?? 3)) - 1;
    grid[4 - px][ix].push(s); // top row = highest power
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Stakeholders ({p.stakeholders.length})</h2>
        <button className="btn-primary" onClick={add}>+ Stakeholder</button>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-2">Power / Interest grid</h3>
        <div className="text-xs text-slate-500 mb-2">Top = high power · Right = high interest</div>
        <div className="grid grid-cols-5 gap-1 text-xs">
          {grid.map((row, ri) =>
            row.map((cell, ci) => {
              const power = 5 - ri;
              const interest = ci + 1;
              const label = strategyFor(power, interest);
              const bg = label === 'manage-closely' ? 'bg-red-50' : label === 'keep-satisfied' ? 'bg-amber-50' : label === 'keep-informed' ? 'bg-sky-50' : 'bg-slate-50';
              return (
                <div key={`${ri}-${ci}`} className={`${bg} rounded p-1 min-h-[60px] border border-slate-200`}>
                  <div className="text-[10px] text-slate-400">{label}</div>
                  {cell.map((s) => (
                    <button key={s.id} className="block text-left w-full truncate hover:underline" onClick={() => setEditing(s)}>{s.name}</button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Org / Role</th>
              <th className="px-3 py-2 text-left">Contact</th>
              <th className="px-3 py-2 text-left">Power</th>
              <th className="px-3 py-2 text-left">Interest</th>
              <th className="px-3 py-2 text-left">Strategy</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {p.stakeholders.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2"><span className="chip bg-slate-100">{s.type}</span></td>
                <td className="px-3 py-2 text-xs">{[s.organization, s.role].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-3 py-2 text-xs">{[s.email, s.phone].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-3 py-2">{s.power}</td>
                <td className="px-3 py-2">{s.interest}</td>
                <td className="px-3 py-2"><span className="chip bg-slate-100">{s.strategy ?? '—'}</span></td>
                <td className="px-3 py-2 text-right"><button className="btn-ghost text-xs" onClick={() => setEditing(s)}>Edit</button></td>
              </tr>
            ))}
            {p.stakeholders.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-slate-400">—</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <Editor key={editing.id} item={editing} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />}
    </div>
  );
}

function Editor({ item, onClose, onSave, onDelete }: {
  item: Stakeholder;
  onClose: () => void;
  onSave: (s: Stakeholder) => void;
  onDelete: (id: string) => void;
}) {
  const [d, setD] = useState<Stakeholder>(item);
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold mb-3">{d.name}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Name</label><input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></div>
          <div><label className="label">Type</label>
            <select className="input" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as Stakeholder['type'] })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="label">Organization</label><input className="input" value={d.organization ?? ''} onChange={(e) => setD({ ...d, organization: e.target.value })} /></div>
          <div><label className="label">Role</label><input className="input" value={d.role ?? ''} onChange={(e) => setD({ ...d, role: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input" value={d.email ?? ''} onChange={(e) => setD({ ...d, email: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input" value={d.phone ?? ''} onChange={(e) => setD({ ...d, phone: e.target.value })} /></div>
          <div><label className="label">Power (1-5)</label>
            <input type="number" min={1} max={5} className="input" value={d.power ?? 3} onChange={(e) => setD({ ...d, power: Number(e.target.value) as any })} />
          </div>
          <div><label className="label">Interest (1-5)</label>
            <input type="number" min={1} max={5} className="input" value={d.interest ?? 3} onChange={(e) => setD({ ...d, interest: Number(e.target.value) as any })} />
          </div>
        </div>
        <label className="label mt-3">Expectations</label>
        <textarea className="input h-20" value={d.expectations ?? ''} onChange={(e) => setD({ ...d, expectations: e.target.value })} />
        <label className="label mt-3">Communication plan</label>
        <textarea className="input h-20" value={d.communicationPlan ?? ''} onChange={(e) => setD({ ...d, communicationPlan: e.target.value })} placeholder="e.g. Weekly 30-min sync on Monday; monthly exec status email." />
        <div className="flex justify-between mt-5">
          <button className="btn-danger" onClick={() => onDelete(d.id)}>Delete</button>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={() => onSave(d)}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
