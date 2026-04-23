import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store';
import { nanoid } from 'nanoid';
import { fmtDate } from '@/lib/util';
import type { ScheduleItem } from '@/types';
// @ts-ignore - frappe-gantt has no bundled types
import Gantt from 'frappe-gantt';

export default function Scheduler() {
  const { activeProject, saveProject } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Week');

  useEffect(() => {
    if (!activeProject || !ref.current) return;
    const items = activeProject.schedule;
    ref.current.innerHTML = '';
    if (items.length === 0) return;

    const ganttTasks = items.map((it) => ({
      id: it.id,
      name: it.name,
      start: it.startDate.slice(0, 10),
      end: it.endDate.slice(0, 10),
      progress: it.progressPct ?? 0,
      dependencies: (it.dependencies ?? []).join(',')
    }));

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _g = new Gantt(ref.current, ganttTasks, {
        view_mode: viewMode,
        on_click: (t: any) => {
          const item = items.find((i) => i.id === t.id);
          if (item) setEditing(item);
        },
        on_date_change: async (t: any, start: Date, end: Date) => {
          const next = activeProject.schedule.map((it) =>
            it.id === t.id ? { ...it, startDate: start.toISOString(), endDate: end.toISOString() } : it
          );
          await saveProject({ ...activeProject, schedule: next });
        },
        on_progress_change: async (t: any, progress: number) => {
          const next = activeProject.schedule.map((it) => (it.id === t.id ? { ...it, progressPct: progress } : it));
          await saveProject({ ...activeProject, schedule: next });
        }
      });
    } catch (e) {
      console.error('Gantt error', e);
    }
  }, [activeProject, viewMode, saveProject]);

  if (!activeProject) return null;
  const p = activeProject;

  async function addItem() {
    const name = prompt('Task name?');
    if (!name) return;
    const start = prompt('Start (YYYY-MM-DD)?', new Date().toISOString().slice(0, 10));
    if (!start) return;
    const days = Number(prompt('Duration (days)?', '5') ?? '5');
    const startISO = new Date(start).toISOString();
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(1, days) - 1);
    const item: ScheduleItem = {
      id: nanoid(10),
      projectId: p.project.id,
      name,
      startDate: startISO,
      endDate: end.toISOString(),
      durationDays: days,
      progressPct: 0,
      dependencies: []
    };
    await saveProject({ ...p, schedule: [...p.schedule, item] });
  }

  async function save(item: ScheduleItem) {
    await saveProject({ ...p, schedule: p.schedule.map((i) => (i.id === item.id ? item : i)) });
    setEditing(null);
  }
  async function remove(id: string) {
    if (!confirm('Delete this schedule item?')) return;
    await saveProject({ ...p, schedule: p.schedule.filter((i) => i.id !== id) });
    setEditing(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 items-center">
          <span className="text-xs text-slate-500 mr-2">View:</span>
          {(['Day', 'Week', 'Month'] as const).map((v) => (
            <button key={v} className={`btn-ghost text-xs ${viewMode === v ? 'bg-slate-200' : ''}`} onClick={() => setViewMode(v)}>
              {v}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={addItem}>+ Task</button>
      </div>

      {p.schedule.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500 text-center">ไม่มีรายการ — กด "+ Task" เพื่อเพิ่ม</div>
      ) : (
        <div className="card p-2 overflow-x-auto">
          <div ref={ref} />
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Start</th>
              <th className="px-3 py-2 text-left">End</th>
              <th className="px-3 py-2 text-left">Progress</th>
              <th className="px-3 py-2 text-left">Dependencies</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {p.schedule.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="px-3 py-2">{it.name}</td>
                <td className="px-3 py-2">{fmtDate(it.startDate)}</td>
                <td className="px-3 py-2">{fmtDate(it.endDate)}</td>
                <td className="px-3 py-2">{it.progressPct ?? 0}%</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {(it.dependencies ?? []).map((d) => p.schedule.find((x) => x.id === d)?.name ?? d).join(', ') || '—'}
                </td>
                <td className="px-3 py-2 text-right"><button className="btn-ghost text-xs" onClick={() => setEditing(it)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <Editor key={editing.id} item={editing} allItems={p.schedule} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />}
    </div>
  );
}

function Editor({ item, allItems, onClose, onSave, onDelete }: {
  item: ScheduleItem;
  allItems: ScheduleItem[];
  onClose: () => void;
  onSave: (i: ScheduleItem) => void;
  onDelete: (id: string) => void;
}) {
  const [d, setD] = useState<ScheduleItem>(item);
  const deps = allItems.filter((x) => x.id !== item.id);
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold mb-3">Edit schedule item</h3>
        <label className="label">Name</label>
        <input className="input mb-3" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Start</label><input type="date" className="input" value={d.startDate.slice(0, 10)} onChange={(e) => setD({ ...d, startDate: new Date(e.target.value).toISOString() })} /></div>
          <div><label className="label">End</label><input type="date" className="input" value={d.endDate.slice(0, 10)} onChange={(e) => setD({ ...d, endDate: new Date(e.target.value).toISOString() })} /></div>
        </div>
        <label className="label mt-3">Progress %</label>
        <input type="number" className="input" min={0} max={100} value={d.progressPct ?? 0} onChange={(e) => setD({ ...d, progressPct: Number(e.target.value) })} />
        <label className="label mt-3">Dependencies</label>
        <select
          multiple
          className="input h-24"
          value={d.dependencies ?? []}
          onChange={(e) => setD({ ...d, dependencies: Array.from(e.target.selectedOptions).map((o) => o.value) })}
        >
          {deps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
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
