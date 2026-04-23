import { useMemo, useState } from 'react';
import { useStore } from '@/store';
import { nanoid } from 'nanoid';
import { fmtDate, daysBetween, addDaysISO, todayISO } from '@/lib/util';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import type { Sprint, Task } from '@/types';

export default function Sprints() {
  const { activeProject, saveProject } = useStore();
  const [selId, setSelId] = useState<string | null>(null);

  if (!activeProject) return null;
  const p = activeProject;
  const doneIds = new Set(p.project.swimlanes.filter((l) => l.doneLane).map((l) => l.id));

  const selected = p.sprints.find((s) => s.id === selId) ?? p.sprints.find((s) => s.status === 'active') ?? p.sprints[0];

  async function createSprint() {
    const name = prompt('Sprint name? (e.g. "Sprint 1")');
    if (!name) return;
    const weeks = Number(prompt('Duration in weeks?', '2') ?? '2');
    const start = prompt('Start date (YYYY-MM-DD)?', new Date().toISOString().slice(0, 10));
    if (!start) return;
    const startISO = new Date(start).toISOString();
    const endISO = addDaysISO(startISO, weeks * 7 - 1);
    const sprint: Sprint = {
      id: nanoid(10),
      projectId: p.project.id,
      name,
      startDate: startISO,
      endDate: endISO,
      status: 'planned'
    };
    await saveProject({ ...p, sprints: [...p.sprints, sprint] });
  }

  async function updateStatus(sp: Sprint, status: Sprint['status']) {
    await saveProject({ ...p, sprints: p.sprints.map((x) => (x.id === sp.id ? { ...x, status } : x)) });
  }

  async function deleteSprint(id: string) {
    if (!confirm('Delete this sprint?')) return;
    await saveProject({
      ...p,
      sprints: p.sprints.filter((s) => s.id !== id),
      tasks: p.tasks.map((t) => (t.sprintId === id ? { ...t, sprintId: undefined } : t))
    });
  }

  async function toggleTaskInSprint(taskId: string, sprintId: string | undefined) {
    await saveProject({
      ...p,
      tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, sprintId, updatedAt: new Date().toISOString() } : t))
    });
  }

  const sprintTasks = selected ? p.tasks.filter((t) => t.sprintId === selected.id) : [];
  const backlog = p.tasks.filter((t) => !t.sprintId);

  // Burndown: ideal line + actual remaining SP per day
  const burndown = useMemo(() => {
    if (!selected) return [];
    const total = sprintTasks.reduce((a, b) => a + (b.storyPoints ?? 0), 0);
    const days = Math.max(1, daysBetween(selected.startDate, selected.endDate));
    const today = todayISO();
    const todayIdx = Math.min(days, Math.max(0, daysBetween(selected.startDate, today)));
    // Actual: assume progress is linear against progressPct for completed tasks.
    // For a simple view: remaining = total - sum(SP of tasks whose lane is done) up to today
    const doneSP = sprintTasks.filter((t) => doneIds.has(t.laneId)).reduce((a, b) => a + (b.storyPoints ?? 0), 0);
    const pts: { day: string; ideal: number; actual: number | null }[] = [];
    for (let i = 0; i <= days; i++) {
      pts.push({
        day: fmtDate(addDaysISO(selected.startDate, i)),
        ideal: +(total - (total * i) / days).toFixed(1),
        actual: i <= todayIdx ? Math.max(0, total - (doneSP * i) / Math.max(1, todayIdx)) : null
      });
    }
    return pts;
  }, [selected, sprintTasks, doneIds]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <aside className="card p-3 lg:col-span-1 space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Sprints</h3>
          <button className="btn-primary text-xs" onClick={createSprint}>+ New</button>
        </div>
        {p.sprints.length === 0 && <div className="text-sm text-slate-500">No sprints yet.</div>}
        {p.sprints.map((s) => (
          <button
            key={s.id}
            className={`w-full text-left p-2 rounded ${selected?.id === s.id ? 'bg-brand-50 border border-brand-500' : 'hover:bg-slate-50 border'}`}
            onClick={() => setSelId(s.id)}
          >
            <div className="flex justify-between">
              <span className="font-medium">{s.name}</span>
              <span className="chip bg-slate-100 text-slate-700">{s.status}</span>
            </div>
            <div className="text-xs text-slate-500">{fmtDate(s.startDate)} → {fmtDate(s.endDate)}</div>
          </button>
        ))}
      </aside>

      <section className="lg:col-span-3 space-y-4">
        {selected && (
          <>
            <div className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{selected.name}</h2>
                  <div className="text-sm text-slate-500">{fmtDate(selected.startDate)} → {fmtDate(selected.endDate)} · {daysBetween(selected.startDate, selected.endDate) + 1} days</div>
                </div>
                <div className="flex gap-2 text-xs">
                  <select className="input py-1" value={selected.status} onChange={(e) => updateStatus(selected, e.target.value as Sprint['status'])}>
                    <option value="planned">planned</option>
                    <option value="active">active</option>
                    <option value="closed">closed</option>
                  </select>
                  <button className="btn-ghost" onClick={() => deleteSprint(selected.id)}>Delete</button>
                </div>
              </div>
              <textarea
                className="input mt-2 text-sm h-16"
                placeholder="Sprint goal..."
                value={selected.goal ?? ''}
                onChange={(e) => saveProject({ ...p, sprints: p.sprints.map((s) => (s.id === selected.id ? { ...s, goal: e.target.value } : s)) })}
              />
            </div>

            <div className="card p-4">
              <h3 className="font-semibold mb-2">Burndown</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={burndown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ideal" stroke="#94a3b8" dot={false} name="Ideal" />
                    <Line type="monotone" dataKey="actual" stroke="#2563eb" name="Actual" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TaskList title={`In sprint (${sprintTasks.length})`} tasks={sprintTasks} actionLabel="Remove" onClick={(t) => toggleTaskInSprint(t.id, undefined)} />
              <TaskList title={`Backlog (${backlog.length})`} tasks={backlog} actionLabel="Add" onClick={(t) => toggleTaskInSprint(t.id, selected.id)} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function TaskList({ title, tasks, onClick, actionLabel }: { title: string; tasks: Task[]; onClick: (t: Task) => void; actionLabel: string }) {
  return (
    <div className="card p-3">
      <h4 className="font-semibold mb-2">{title}</h4>
      <ul className="space-y-1 text-sm max-h-[360px] overflow-auto">
        {tasks.map((t) => (
          <li key={t.id} className="flex justify-between items-center border-b last:border-0 py-1">
            <span className="truncate mr-2">{t.key} · {t.title}</span>
            <div className="flex items-center gap-2">
              {t.storyPoints ? <span className="chip bg-brand-50 text-brand-700">{t.storyPoints} SP</span> : null}
              <button className="btn-ghost text-xs" onClick={() => onClick(t)}>{actionLabel}</button>
            </div>
          </li>
        ))}
        {tasks.length === 0 && <li className="text-slate-400 text-xs">—</li>}
      </ul>
    </div>
  );
}
