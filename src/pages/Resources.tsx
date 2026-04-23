import { useState } from 'react';
import { useStore } from '@/store';
import { nanoid } from 'nanoid';
import type { ResourceAssignment } from '@/types';
import { fmtDate, currency } from '@/lib/util';

export default function Resources() {
  const { activeProject, saveProject, users } = useStore();
  const [editing, setEditing] = useState<ResourceAssignment | null>(null);

  if (!activeProject) return null;
  const p = activeProject;

  async function add() {
    if (users.length === 0) { alert('No users yet'); return; }
    const a: ResourceAssignment = {
      id: nanoid(10),
      projectId: p.project.id,
      userId: users[0].id,
      allocationPct: 50
    };
    await saveProject({ ...p, assignments: [...p.assignments, a] });
    setEditing(a);
  }

  async function save(a: ResourceAssignment) {
    await saveProject({ ...p, assignments: p.assignments.map((x) => (x.id === a.id ? a : x)) });
    setEditing(null);
  }
  async function remove(id: string) {
    if (!confirm('Delete assignment?')) return;
    await saveProject({ ...p, assignments: p.assignments.filter((x) => x.id !== id) });
    setEditing(null);
  }

  // Resource rollup
  const rollup = users.map((u) => {
    const mine = p.assignments.filter((a) => a.userId === u.id);
    const alloc = mine.reduce((s, a) => s + (a.allocationPct ?? 0), 0);
    const tasks = p.tasks.filter((t) => t.assigneeIds.includes(u.id));
    const activeTaskTitles = tasks
      .filter((t) => !p.project.swimlanes.find((l) => l.id === t.laneId)?.doneLane)
      .map((t) => t.title);
    const completedCount = tasks.filter((t) => p.project.swimlanes.find((l) => l.id === t.laneId)?.doneLane).length;
    const loggedHours = tasks.reduce((s, t) => s + (t.loggedHours ?? 0), 0);
    const cost = (u.hourlyCost ?? 0) * loggedHours;
    return { user: u, alloc, activeTaskTitles, completedCount, loggedHours, cost };
  }).filter((r) => r.alloc > 0 || r.activeTaskTitles.length > 0 || r.completedCount > 0);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="font-semibold mb-2">Resource utilisation in this project</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Skills</th>
              <th className="px-3 py-2 text-left">Allocation %</th>
              <th className="px-3 py-2 text-left">Now working on</th>
              <th className="px-3 py-2 text-left">Completed</th>
              <th className="px-3 py-2 text-left">Logged h</th>
              <th className="px-3 py-2 text-left">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rollup.map((r) => (
              <tr key={r.user.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {r.user.avatarUrl && <img src={r.user.avatarUrl} className="w-6 h-6 rounded-full" />}
                    <div>
                      <div className="font-medium">{r.user.name ?? r.user.login}</div>
                      <div className="text-xs text-slate-500">@{r.user.login}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{r.user.skills?.join(', ') ?? '—'}</td>
                <td className="px-3 py-2">
                  <div className="w-32 h-2 bg-slate-200 rounded overflow-hidden">
                    <div className={`h-full ${r.alloc > 100 ? 'bg-red-500' : 'bg-brand-600'}`} style={{ width: `${Math.min(100, r.alloc)}%` }} />
                  </div>
                  <div className="text-xs mt-0.5">{r.alloc}%</div>
                </td>
                <td className="px-3 py-2 text-xs">{r.activeTaskTitles.slice(0, 3).join(', ') || '—'}</td>
                <td className="px-3 py-2 text-xs">{r.completedCount}</td>
                <td className="px-3 py-2 text-xs">{r.loggedHours}</td>
                <td className="px-3 py-2 text-xs">{currency(r.cost, p.project.currency)}</td>
              </tr>
            ))}
            {rollup.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-400">No active resources in this project yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Assignments</h3>
        <button className="btn-primary" onClick={add}>+ Assignment</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Task</th>
              <th className="px-3 py-2 text-left">Allocation %</th>
              <th className="px-3 py-2 text-left">Start</th>
              <th className="px-3 py-2 text-left">End</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {p.assignments.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-3 py-2">@{a.userId}</td>
                <td className="px-3 py-2 text-xs">{a.taskId ? p.tasks.find((t) => t.id === a.taskId)?.title ?? a.taskId : 'Project-level'}</td>
                <td className="px-3 py-2">{a.allocationPct ?? 0}%</td>
                <td className="px-3 py-2 text-xs">{fmtDate(a.startDate)}</td>
                <td className="px-3 py-2 text-xs">{fmtDate(a.endDate)}</td>
                <td className="px-3 py-2 text-right"><button className="btn-ghost text-xs" onClick={() => setEditing(a)}>Edit</button></td>
              </tr>
            ))}
            {p.assignments.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">—</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Editor
          key={editing.id}
          item={editing}
          users={users.map((u) => ({ id: u.id, label: `@${u.login}` }))}
          tasks={p.tasks.map((t) => ({ id: t.id, label: `${t.key} · ${t.title}` }))}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  );
}

function Editor({ item, users, tasks, onClose, onSave, onDelete }: {
  item: ResourceAssignment;
  users: { id: string; label: string }[];
  tasks: { id: string; label: string }[];
  onClose: () => void;
  onSave: (a: ResourceAssignment) => void;
  onDelete: (id: string) => void;
}) {
  const [d, setD] = useState<ResourceAssignment>(item);
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold mb-3">Assignment</h3>
        <label className="label">User</label>
        <select className="input mb-3" value={d.userId} onChange={(e) => setD({ ...d, userId: e.target.value })}>
          {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
        <label className="label">Task (optional)</label>
        <select className="input mb-3" value={d.taskId ?? ''} onChange={(e) => setD({ ...d, taskId: e.target.value || undefined })}>
          <option value="">— project level —</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <label className="label">Allocation %</label>
        <input type="number" className="input mb-3" min={0} max={100} value={d.allocationPct ?? 0} onChange={(e) => setD({ ...d, allocationPct: Number(e.target.value) })} />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Start</label><input type="date" className="input" value={d.startDate?.slice(0, 10) ?? ''} onChange={(e) => setD({ ...d, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} /></div>
          <div><label className="label">End</label><input type="date" className="input" value={d.endDate?.slice(0, 10) ?? ''} onChange={(e) => setD({ ...d, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} /></div>
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
