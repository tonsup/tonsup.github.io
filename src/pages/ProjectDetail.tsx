import { useEffect } from 'react';
import { Routes, Route, useParams, NavLink, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import Kanban from './Kanban';
import ProjectOverview from './ProjectOverview';
import Sprints from './Sprints';
import Scheduler from './Scheduler';
import RiskRegister from './RiskRegister';
import StakeholderRegister from './StakeholderRegister';
import Resources from './Resources';
import Financials from './Financials';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { loadProject, activeProject } = useStore();

  useEffect(() => {
    if (id) void loadProject(id);
  }, [id, loadProject]);

  if (!id) return <Navigate to="/projects" replace />;
  if (!activeProject || activeProject.project.id !== id) return <div>{t('common.loading')}</div>;

  const base = `/projects/${id}`;
  const tabs = [
    { to: base, label: t('project.overview'), end: true },
    { to: `${base}/kanban`, label: t('project.kanban') },
    { to: `${base}/sprints`, label: 'Sprints' },
    { to: `${base}/schedule`, label: t('project.schedule') },
    { to: `${base}/risks`, label: t('project.risks') },
    { to: `${base}/stakeholders`, label: t('project.stakeholders') },
    { to: `${base}/resources`, label: t('project.resources') },
    { to: `${base}/financials`, label: t('project.financials') }
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-slate-500">{activeProject.project.key}</div>
        <h1 className="text-2xl font-bold">{activeProject.project.name}</h1>
      </div>
      <nav className="flex gap-1 border-b overflow-x-auto">
        {tabs.map((tb) => (
          <NavLink
            key={tb.to}
            to={tb.to}
            end={tb.end}
            className={({ isActive }) =>
              `px-3 py-2 text-sm border-b-2 whitespace-nowrap ${isActive ? 'border-brand-600 text-brand-700 font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900'}`
            }
          >
            {tb.label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<ProjectOverview />} />
        <Route path="kanban" element={<Kanban />} />
        <Route path="sprints" element={<Sprints />} />
        <Route path="schedule" element={<Scheduler />} />
        <Route path="risks" element={<RiskRegister />} />
        <Route path="stakeholders" element={<StakeholderRegister />} />
        <Route path="resources" element={<Resources />} />
        <Route path="financials" element={<Financials />} />
      </Routes>
    </div>
  );
}
