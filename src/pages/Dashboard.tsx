import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import { useEffect, useMemo, useState } from 'react';
import type { ProjectDB } from '@/types';
import { currency } from '@/lib/util';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';

export default function Dashboard() {
  const { t } = useTranslation();
  const { projectsIndex, db, users } = useStore();
  const [details, setDetails] = useState<ProjectDB[]>([]);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!db) return;
      const out: ProjectDB[] = [];
      for (const p of projectsIndex) {
        const full = await db.getProject(p.id);
        if (full) out.push(full);
      }
      if (alive) setDetails(out);
    }
    void run();
    return () => { alive = false; };
  }, [db, projectsIndex]);

  const metrics = useMemo(() => {
    let done = 0, inprog = 0, totalSP = 0, doneSP = 0;
    let totalCostBudget = 0, totalRevenue = 0, totalActualCost = 0;
    let openRisks = 0, openIssues = 0;
    const perProject: {
      id: string; key: string; name: string; status: string;
      progressPct: number; costBudget: number; actualCost: number;
      revenue: number; margin: number; openRisks: number; openIssues: number;
    }[] = [];
    const userStats = new Map<string, { login: string; name?: string; avatar?: string; allocation: number; activeTasks: number; loggedHours: number; cost: number; projects: Set<string> }>();
    const heatmap: number[][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));

    for (const d of details) {
      const doneLaneIds = new Set(d.project.swimlanes.filter((l) => l.doneLane).map((l) => l.id));
      let projTotalSP = 0, projDoneSP = 0;
      for (const task of d.tasks) {
        if (doneLaneIds.has(task.laneId)) done++; else inprog++;
        projTotalSP += task.storyPoints ?? 0;
        if (doneLaneIds.has(task.laneId)) projDoneSP += task.storyPoints ?? 0;
      }
      totalSP += projTotalSP;
      doneSP += projDoneSP;

      let projResourceCost = 0;
      for (const t of d.tasks) {
        const hours = t.loggedHours ?? 0;
        const assignees = t.assigneeIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
        const avgRate = assignees.length ? assignees.reduce((s, u) => s + (u?.hourlyCost ?? 0), 0) / assignees.length : 0;
        projResourceCost += hours * avgRate;
        for (const uid of t.assigneeIds) {
          const u = users.find((x) => x.id === uid);
          if (!u) continue;
          let st = userStats.get(uid);
          if (!st) {
            st = { login: u.login, name: u.name, avatar: u.avatarUrl, allocation: 0, activeTasks: 0, loggedHours: 0, cost: 0, projects: new Set() };
            userStats.set(uid, st);
          }
          st.projects.add(d.project.id);
          st.loggedHours += hours;
          st.cost += hours * (u.hourlyCost ?? 0);
          if (!doneLaneIds.has(t.laneId)) st.activeTasks++;
        }
      }
      for (const a of d.assignments) {
        const st = userStats.get(a.userId);
        if (st) st.allocation += a.allocationPct ?? 0;
      }
      const projExpense = d.tasks.reduce((s, t) => s + (t.expenses ?? []).reduce((x, e) => x + e.amount, 0), 0);
      const actualCost = projResourceCost + projExpense;
      totalActualCost += actualCost;
      totalCostBudget += d.project.costBudget ?? 0;
      totalRevenue += d.project.revenueBudget ?? 0;

      for (const r of d.risks) {
        if (r.status !== 'closed') {
          if (r.kind === 'risk') openRisks++; else openIssues++;
          const p = Math.min(5, Math.max(1, r.probability ?? 3)) - 1;
          const i = Math.min(5, Math.max(1, r.impact ?? 3)) - 1;
          heatmap[4 - p][i]++;
        }
      }

      perProject.push({
        id: d.project.id,
        key: d.project.key,
        name: d.project.name,
        status: d.project.status,
        progressPct: projTotalSP ? Math.round((projDoneSP / projTotalSP) * 100) : 0,
        costBudget: d.project.costBudget ?? 0,
        actualCost,
        revenue: d.project.revenueBudget ?? 0,
        margin: (d.project.revenueBudget ?? 0) - actualCost,
        openRisks: d.risks.filter((r) => r.kind === 'risk' && r.status !== 'closed').length,
        openIssues: d.risks.filter((r) => r.kind === 'issue' && r.status !== 'closed').length
      });
    }

    return { done, inprog, totalSP, doneSP, totalCostBudget, totalRevenue, totalActualCost, openRisks, openIssues, perProject, userStats, heatmap };
  }, [details, users]);

  const statusData = ['planning', 'active', 'on-hold', 'done', 'cancelled'].map((s) => ({
    name: t(`project.${s}` as any),
    value: projectsIndex.filter((p) => p.status === s).length
  }));
  const COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'];
  const costData = metrics.perProject.map((p) => ({ name: p.key, budget: p.costBudget, actual: Math.round(p.actualCost) }));

  const userRows = Array.from(metrics.userStats.values())
    .filter((u) => u.allocation > 0 || u.activeTasks > 0 || u.loggedHours > 0)
    .sort((a, b) => b.allocation - a.allocation);

  function heatCell(v: number) {
    if (v === 0) return 'bg-slate-50 text-slate-400';
    if (v <= 1) return 'bg-emerald-100 text-emerald-700';
    if (v <= 3) return 'bg-amber-100 text-amber-700';
    if (v <= 5) return 'bg-orange-100 text-orange-700';
    return 'bg-red-200 text-red-700';
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label={t('dashboard.totalProjects')} value={projectsIndex.length} />
        <Kpi label={t('dashboard.activeProjects')} value={projectsIndex.filter((p) => p.status === 'active').length} />
        <Kpi label={t('dashboard.tasksDone')} value={metrics.done} />
        <Kpi label={t('dashboard.tasksInProgress')} value={metrics.inprog} />
        <Kpi label="Story Points" value={`${metrics.doneSP} / ${metrics.totalSP}`} />
        <Kpi label="Revenue budget" value={currency(metrics.totalRevenue)} />
        <Kpi label="Cost budget" value={currency(metrics.totalCostBudget)} />
        <Kpi label="Actual cost" value={currency(metrics.totalActualCost)} tone={metrics.totalActualCost > metrics.totalCostBudget ? 'bad' : 'ok'} />
        <Kpi label="Plan margin" value={currency(metrics.totalRevenue - metrics.totalCostBudget)} />
        <Kpi label="Actual margin" value={currency(metrics.totalRevenue - metrics.totalActualCost)} tone={metrics.totalRevenue - metrics.totalActualCost >= 0 ? 'ok' : 'bad'} />
        <Kpi label="Open risks" value={metrics.openRisks} tone={metrics.openRisks > 5 ? 'warn' : undefined} />
        <Kpi label="Open issues" value={metrics.openIssues} tone={metrics.openIssues > 0 ? 'bad' : 'ok'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Projects by status</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {statusData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Cost: budget vs actual</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: any) => currency(Number(v))} />
                <Legend />
                <Bar dataKey="budget" fill="#94a3b8" name="Budget" />
                <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-2">
          <h2 className="font-semibold mb-2">Per-project status</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Project</th>
                  <th className="px-3 py-2 text-left">Progress</th>
                  <th className="px-3 py-2 text-left">Budget</th>
                  <th className="px-3 py-2 text-left">Actual</th>
                  <th className="px-3 py-2 text-left">Margin</th>
                  <th className="px-3 py-2 text-left">Risks</th>
                  <th className="px-3 py-2 text-left">Issues</th>
                </tr>
              </thead>
              <tbody>
                {metrics.perProject.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2"><div className="font-medium">{p.key}</div><div className="text-xs text-slate-500">{p.name}</div></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-200 rounded"><div className="h-2 bg-brand-600 rounded" style={{ width: `${p.progressPct}%` }} /></div>
                        <span className="text-xs">{p.progressPct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{currency(p.costBudget)}</td>
                    <td className="px-3 py-2 text-xs">{currency(p.actualCost)}</td>
                    <td className={`px-3 py-2 text-xs ${p.margin < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{currency(p.margin)}</td>
                    <td className="px-3 py-2 text-xs">{p.openRisks}</td>
                    <td className="px-3 py-2 text-xs">{p.openIssues}</td>
                  </tr>
                ))}
                {metrics.perProject.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-400">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-2">Risk heatmap (open)</h2>
          <div className="text-xs text-slate-500 mb-1">Rows: Probability 5→1 · Cols: Impact 1→5</div>
          <div className="grid grid-cols-5 gap-1 text-xs">
            {metrics.heatmap.map((row, ri) => row.map((v, ci) => (
              <div key={`${ri}-${ci}`} className={`rounded p-2 text-center font-semibold ${heatCell(v)}`}>{v || ''}</div>
            )))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-2">Resource utilisation (portfolio-wide)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Allocation %</th>
                <th className="px-3 py-2 text-left">Active tasks</th>
                <th className="px-3 py-2 text-left">Projects</th>
                <th className="px-3 py-2 text-left">Logged hours</th>
                <th className="px-3 py-2 text-left">Cost</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((u) => (
                <tr key={u.login} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {u.avatar && <img src={u.avatar} className="w-6 h-6 rounded-full" />}
                      <div>
                        <div className="font-medium">{u.name ?? u.login}</div>
                        <div className="text-xs text-slate-500">@{u.login}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="w-32 h-2 bg-slate-200 rounded"><div className={`h-2 rounded ${u.allocation > 100 ? 'bg-red-500' : 'bg-brand-600'}`} style={{ width: `${Math.min(100, u.allocation)}%` }} /></div>
                    <div className="text-xs mt-0.5">{u.allocation}%</div>
                  </td>
                  <td className="px-3 py-2">{u.activeTasks}</td>
                  <td className="px-3 py-2">{u.projects.size}</td>
                  <td className="px-3 py-2">{u.loggedHours}</td>
                  <td className="px-3 py-2">{currency(u.cost)}</td>
                </tr>
              ))}
              {userRows.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">—</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'bad' }) {
  const color = tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : 'text-slate-900';
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
