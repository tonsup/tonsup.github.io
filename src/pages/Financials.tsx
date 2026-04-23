import { useState } from 'react';
import { useStore } from '@/store';
import { currency } from '@/lib/util';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { nanoid } from 'nanoid';
import type { Project, Task } from '@/types';

export default function Financials() {
  const { activeProject, saveProject, users } = useStore();
  if (!activeProject) return null;
  const p = activeProject;
  const ccy = p.project.currency ?? 'THB';

  // Resource cost = sum over tasks (loggedHours * user.hourlyCost of each assignee)
  let resourceCost = 0;
  for (const t of p.tasks) {
    const hours = t.loggedHours ?? 0;
    const assignees = t.assigneeIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
    const avgRate = assignees.length ? assignees.reduce((s, u) => s + (u?.hourlyCost ?? 0), 0) / assignees.length : 0;
    resourceCost += hours * avgRate;
  }
  const expenseTotal = p.tasks.reduce((s, t) => s + (t.expenses ?? []).reduce((x, e) => x + e.amount, 0), 0);
  const actualCost = resourceCost + expenseTotal;
  const budget = p.project.costBudget ?? 0;
  const revenue = p.project.revenueBudget ?? 0;
  const planMargin = revenue - budget;
  const actualMargin = revenue - actualCost;
  const budgetUsedPct = budget ? Math.round((actualCost / budget) * 100) : 0;

  async function updateProject(patch: Partial<Project>) {
    await saveProject({ ...p, project: { ...p.project, ...patch, updatedAt: new Date().toISOString() } });
  }

  // per-task cost data
  const perTask = p.tasks.map((t) => {
    const hours = t.loggedHours ?? 0;
    const assignees = t.assigneeIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
    const avgRate = assignees.length ? assignees.reduce((s, u) => s + (u?.hourlyCost ?? 0), 0) / assignees.length : 0;
    const resource = hours * avgRate;
    const expense = (t.expenses ?? []).reduce((x, e) => x + e.amount, 0);
    return { name: t.key, resource: Math.round(resource), expense: Math.round(expense), total: Math.round(resource + expense) };
  }).filter((r) => r.total > 0);

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Project financial plan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><label className="label">Currency</label><input className="input" value={ccy} onChange={(e) => updateProject({ currency: e.target.value })} /></div>
          <div><label className="label">Revenue budget</label><input type="number" className="input" value={revenue} onChange={(e) => updateProject({ revenueBudget: Number(e.target.value) })} /></div>
          <div><label className="label">Cost budget</label><input type="number" className="input" value={budget} onChange={(e) => updateProject({ costBudget: Number(e.target.value) })} /></div>
          <div><label className="label">Plan margin %</label><input type="number" className="input" value={p.project.planMarginPct ?? 0} onChange={(e) => updateProject({ planMarginPct: Number(e.target.value) })} /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Revenue" value={currency(revenue, ccy)} />
        <Kpi label="Cost budget" value={currency(budget, ccy)} />
        <Kpi label="Actual cost" value={currency(actualCost, ccy)} />
        <Kpi label="Budget used" value={`${budgetUsedPct}%`} tone={budgetUsedPct > 100 ? 'bad' : budgetUsedPct > 80 ? 'warn' : 'ok'} />
        <Kpi label="Plan margin" value={currency(planMargin, ccy)} tone={planMargin >= 0 ? 'ok' : 'bad'} />
        <Kpi label="Actual margin" value={currency(actualMargin, ccy)} tone={actualMargin >= 0 ? 'ok' : 'bad'} />
        <Kpi label="Resource cost" value={currency(resourceCost, ccy)} />
        <Kpi label="Expenses" value={currency(expenseTotal, ccy)} />
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">Cost by task</h3>
        {perTask.length === 0 ? (
          <div className="text-sm text-slate-500">No logged hours or expenses yet.</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={perTask}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="resource" stackId="c" fill="#3b82f6" name="Resource" />
                <Bar dataKey="expense" stackId="c" fill="#f59e0b" name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <ExpensesPanel />
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'bad' }) {
  const color = tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : 'text-slate-900';
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function ExpensesPanel() {
  const { activeProject, saveProject } = useStore();
  const [selTaskId, setSelTaskId] = useState<string>('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState(0);
  if (!activeProject) return null;
  const p = activeProject;

  async function addExpense() {
    if (!selTaskId || !amount) return;
    const next = p.tasks.map((t) =>
      t.id === selTaskId
        ? { ...t, expenses: [...(t.expenses ?? []), { note, amount, date: new Date().toISOString() }], updatedAt: new Date().toISOString() }
        : t
    );
    await saveProject({ ...p, tasks: next });
    setNote('');
    setAmount(0);
  }

  async function logHours(task: Task, h: number) {
    const next = p.tasks.map((t) => (t.id === task.id ? { ...t, loggedHours: (t.loggedHours ?? 0) + h, updatedAt: new Date().toISOString() } : t));
    await saveProject({ ...p, tasks: next });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card p-4">
        <h3 className="font-semibold mb-2">Log expense</h3>
        <div className="grid grid-cols-2 gap-2">
          <select className="input col-span-2" value={selTaskId} onChange={(e) => setSelTaskId(e.target.value)}>
            <option value="">— select task —</option>
            {p.tasks.map((t) => <option key={t.id} value={t.id}>{t.key} · {t.title}</option>)}
          </select>
          <input className="input" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <input type="number" className="input" placeholder="Amount" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <button className="btn-primary mt-2" onClick={addExpense}>Add expense</button>
      </div>
      <div className="card p-4">
        <h3 className="font-semibold mb-2">Log hours (quick)</h3>
        <div className="max-h-60 overflow-auto text-sm">
          {p.tasks.map((t) => (
            <div key={t.id} className="flex justify-between items-center border-b last:border-0 py-1">
              <span className="truncate">{t.key} · {t.title}</span>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500">logged {t.loggedHours ?? 0}h</span>
                <button className="btn-ghost" onClick={() => logHours(t, 1)}>+1h</button>
                <button className="btn-ghost" onClick={() => logHours(t, 4)}>+4h</button>
                <button className="btn-ghost" onClick={() => logHours(t, 8)}>+8h</button>
              </div>
            </div>
          ))}
          {p.tasks.length === 0 && <div className="text-slate-400 text-xs">—</div>}
        </div>
      </div>
    </div>
  );
}
