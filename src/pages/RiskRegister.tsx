import { useState } from 'react';
import { useStore } from '@/store';
import { nanoid } from 'nanoid';
import type { RiskItem } from '@/types';
import { fmtDate } from '@/lib/util';

const LEVELS = [1, 2, 3, 4, 5] as const;

function riskLevel(prob?: number, imp?: number) {
  if (!prob || !imp) return 0;
  return prob * imp;
}
function levelColor(v: number) {
  if (v >= 16) return 'bg-red-100 text-red-700';
  if (v >= 9) return 'bg-orange-100 text-orange-700';
  if (v >= 4) return 'bg-amber-100 text-amber-700';
  if (v > 0) return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-500';
}

export default function RiskRegister() {
  const { activeProject, saveProject, users } = useStore();
  const [filter, setFilter] = useState<'all' | 'risk' | 'issue'>('all');
  const [editing, setEditing] = useState<RiskItem | null>(null);

  if (!activeProject) return null;
  const p = activeProject;
  const visible = p.risks.filter((r) => filter === 'all' || r.kind === filter);

  async function add(kind: 'risk' | 'issue') {
    const title = prompt(`${kind} title?`);
    if (!title) return;
    const now = new Date().toISOString();
    const r: RiskItem = {
      id: nanoid(10),
      projectId: p.project.id,
      kind,
      title,
      status: 'open',
      probability: 3,
      impact: 3,
      progressPct: 0,
      updates: [],
      linkedIds: [],
      linkedTaskIds: [],
      createdAt: now,
      updatedAt: now
    };
    await saveProject({ ...p, risks: [...p.risks, r] });
    setEditing(r);
  }

  async function save(r: RiskItem) {
    await saveProject({ ...p, risks: p.risks.map((x) => (x.id === r.id ? { ...r, updatedAt: new Date().toISOString() } : x)) });
    setEditing(null);
  }
  async function remove(id: string) {
    if (!confirm('Delete?')) return;
    await saveProject({ ...p, risks: p.risks.filter((x) => x.id !== id) });
    setEditing(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['all', 'risk', 'issue'] as const).map((v) => (
            <button key={v} className={`btn-ghost text-xs ${filter === v ? 'bg-slate-200' : ''}`} onClick={() => setFilter(v)}>{v}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => add('risk')}>+ Risk</button>
          <button className="btn-primary" onClick={() => add('issue')}>+ Issue</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Owner</th>
              <th className="px-3 py-2 text-left">P×I</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Progress</th>
              <th className="px-3 py-2 text-left">Linked</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const lvl = riskLevel(r.probability, r.impact);
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2"><span className={`chip ${r.kind === 'risk' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.kind}</span></td>
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2 text-xs">{r.ownerId ? `@${r.ownerId}` : '—'}</td>
                  <td className="px-3 py-2"><span className={`chip ${levelColor(lvl)}`}>{r.probability ?? '?'}×{r.impact ?? '?'} = {lvl}</span></td>
                  <td className="px-3 py-2"><span className="chip bg-slate-100">{r.status}</span></td>
                  <td className="px-3 py-2 text-xs">{r.progressPct ?? 0}%</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {(r.linkedIds ?? []).length + (r.linkedTaskIds ?? []).length || '—'}
                  </td>
                  <td className="px-3 py-2 text-right"><button className="btn-ghost text-xs" onClick={() => setEditing(r)}>Edit</button></td>
                </tr>
              );
            })}
            {visible.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-slate-400">—</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Editor
          key={editing.id}
          item={editing}
          allRisks={p.risks}
          allTasks={p.tasks.map((t) => ({ id: t.id, label: `${t.key} · ${t.title}` }))}
          users={users.map((u) => ({ id: u.id, label: `@${u.login}` }))}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  );
}

function Editor({ item, allRisks, allTasks, users, onClose, onSave, onDelete }: {
  item: RiskItem;
  allRisks: RiskItem[];
  allTasks: { id: string; label: string }[];
  users: { id: string; label: string }[];
  onClose: () => void;
  onSave: (r: RiskItem) => void;
  onDelete: (id: string) => void;
}) {
  const [d, setD] = useState<RiskItem>(item);
  const [updateNote, setUpdateNote] = useState('');

  function addUpdate() {
    if (!updateNote.trim()) return;
    setD({ ...d, updates: [...(d.updates ?? []), { at: new Date().toISOString(), by: d.ownerId ?? '', note: updateNote.trim() }] });
    setUpdateNote('');
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-3">
          <h3 className="font-bold capitalize">{d.kind} · {d.title}</h3>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <label className="label">Title</label>
        <input className="input mb-3" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        <label className="label">Description</label>
        <textarea className="input mb-3 h-20" value={d.description ?? ''} onChange={(e) => setD({ ...d, description: e.target.value })} />

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Kind</label>
            <select className="input" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as RiskItem['kind'] })}>
              <option value="risk">risk</option><option value="issue">issue</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as RiskItem['status'] })}>
              {['open', 'mitigating', 'accepted', 'closed'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={d.category ?? ''} onChange={(e) => setD({ ...d, category: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label className="label">Probability (1-5)</label>
            <select className="input" value={d.probability ?? 3} onChange={(e) => setD({ ...d, probability: Number(e.target.value) as any })}>
              {LEVELS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Impact (1-5)</label>
            <select className="input" value={d.impact ?? 3} onChange={(e) => setD({ ...d, impact: Number(e.target.value) as any })}>
              {LEVELS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Progress %</label>
            <input type="number" className="input" min={0} max={100} value={d.progressPct ?? 0} onChange={(e) => setD({ ...d, progressPct: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 mt-3">
          <div>
            <label className="label">Owner</label>
            <select className="input" value={d.ownerId ?? ''} onChange={(e) => setD({ ...d, ownerId: e.target.value || undefined })}>
              <option value="">—</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Mitigation / action plan</label>
            <textarea className="input h-20" value={d.mitigation ?? ''} onChange={(e) => setD({ ...d, mitigation: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="label">Linked risks/issues</label>
            <select multiple className="input h-24" value={d.linkedIds ?? []} onChange={(e) => setD({ ...d, linkedIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
              {allRisks.filter((r) => r.id !== d.id).map((r) => <option key={r.id} value={r.id}>{r.kind}: {r.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Linked tasks</label>
            <select multiple className="input h-24" value={d.linkedTaskIds ?? []} onChange={(e) => setD({ ...d, linkedTaskIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
              {allTasks.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Updates / log</label>
          <div className="space-y-1 mb-2 max-h-32 overflow-auto text-xs">
            {(d.updates ?? []).map((u, i) => (
              <div key={i} className="border-l-2 border-brand-500 pl-2 py-0.5">
                <div className="text-slate-500">{fmtDate(u.at)} · {u.by || '—'}</div>
                <div>{u.note}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input" placeholder="Add update note..." value={updateNote} onChange={(e) => setUpdateNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addUpdate()} />
            <button className="btn-ghost" onClick={addUpdate}>Add</button>
          </div>
        </div>

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
