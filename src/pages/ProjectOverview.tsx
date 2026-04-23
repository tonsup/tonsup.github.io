import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';

export default function ProjectOverview() {
  const { t } = useTranslation();
  const { activeProject } = useStore();
  if (!activeProject) return null;
  const { project, tasks } = activeProject;
  const doneLaneIds = new Set(project.swimlanes.filter((l) => l.doneLane).map((l) => l.id));

  const totalSP = tasks.reduce((a, b) => a + (b.storyPoints ?? 0), 0);
  const doneSP = tasks.filter((ta) => doneLaneIds.has(ta.laneId)).reduce((a, b) => a + (b.storyPoints ?? 0), 0);
  const progress = totalSP ? Math.round((doneSP / totalSP) * 100) : 0;

  const inProgress = tasks.filter((ta) => !doneLaneIds.has(ta.laneId));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card p-4 lg:col-span-2">
        <h2 className="font-semibold mb-2">{t('project.overview')}</h2>
        <div className="text-sm text-slate-600 whitespace-pre-wrap">{project.description ?? '—'}</div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Info label={t('common.status')} value={t(`project.${project.status}` as any)} />
          <Info label="Start" value={project.startDate ?? '—'} />
          <Info label="End" value={project.endDate ?? '—'} />
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress ({doneSP}/{totalSP} SP)</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-600" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <div className="card p-4">
        <h2 className="font-semibold mb-2">Currently in progress</h2>
        {inProgress.length === 0 ? (
          <div className="text-sm text-slate-500">— nothing active —</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {inProgress.slice(0, 10).map((ta) => (
              <li key={ta.id} className="flex justify-between">
                <span>{ta.title}</span>
                <span className="chip bg-slate-100 text-slate-700">{ta.storyPoints ?? 0} SP</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
