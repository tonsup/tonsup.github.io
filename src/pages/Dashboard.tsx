import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import { useEffect, useState } from 'react';
import type { ProjectDB } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Dashboard() {
  const { t } = useTranslation();
  const { projectsIndex, db } = useStore();
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
    return () => {
      alive = false;
    };
  }, [db, projectsIndex]);

  const totalProjects = projectsIndex.length;
  const activeProjects = projectsIndex.filter((p) => p.status === 'active').length;

  let done = 0, inprog = 0, totalSP = 0, doneSP = 0, totalCost = 0, totalRevenue = 0;
  for (const d of details) {
    const doneLaneIds = new Set(d.project.swimlanes.filter((l) => l.doneLane).map((l) => l.id));
    for (const task of d.tasks) {
      if (doneLaneIds.has(task.laneId)) done++;
      else inprog++;
      if (task.storyPoints) {
        totalSP += task.storyPoints;
        if (doneLaneIds.has(task.laneId)) doneSP += task.storyPoints;
      }
    }
    if (d.project.costBudget) totalCost += d.project.costBudget;
    if (d.project.revenueBudget) totalRevenue += d.project.revenueBudget;
  }

  const statusData = ['planning', 'active', 'on-hold', 'done', 'cancelled'].map((s) => ({
    name: t(`project.${s}` as any),
    value: projectsIndex.filter((p) => p.status === s).length
  }));
  const COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

  const spData = details.map((d) => {
    const doneLaneIds = new Set(d.project.swimlanes.filter((l) => l.doneLane).map((l) => l.id));
    const total = d.tasks.reduce((a, b) => a + (b.storyPoints ?? 0), 0);
    const doneV = d.tasks.filter((t) => doneLaneIds.has(t.laneId)).reduce((a, b) => a + (b.storyPoints ?? 0), 0);
    return { name: d.project.key, total, done: doneV };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label={t('dashboard.totalProjects')} value={totalProjects} />
        <Kpi label={t('dashboard.activeProjects')} value={activeProjects} />
        <Kpi label={t('dashboard.tasksDone')} value={done} />
        <Kpi label={t('dashboard.tasksInProgress')} value={inprog} />
        <Kpi label="Story Points" value={`${doneSP} / ${totalSP}`} />
        <Kpi label="Cost budget" value={totalCost.toLocaleString()} />
        <Kpi label="Revenue budget" value={totalRevenue.toLocaleString()} />
        <Kpi label="Plan margin" value={totalRevenue ? `${(((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(1)}%` : '-'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Projects by status</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Story points per project</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={spData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#94a3b8" name="Total SP" />
                <Bar dataKey="done" fill="#10b981" name="Done SP" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
