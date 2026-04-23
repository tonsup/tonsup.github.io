import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { nanoid } from 'nanoid';
import type { ProjectDB } from '@/types';

export default function Projects() {
  const { t } = useTranslation();
  const { projectsIndex, saveProject, currentUser } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');

  async function create() {
    if (!name.trim() || !key.trim() || !currentUser) return;
    const now = new Date().toISOString();
    const id = nanoid(10);
    const lanes = [
      { id: nanoid(8), name: 'Backlog', order: 0 },
      { id: nanoid(8), name: 'To Do', order: 1 },
      { id: nanoid(8), name: 'In Progress', order: 2 },
      { id: nanoid(8), name: 'Review', order: 3 },
      { id: nanoid(8), name: 'Done', order: 4, doneLane: true }
    ];
    const db: ProjectDB = {
      project: {
        id,
        key: key.toUpperCase(),
        name,
        status: 'planning',
        memberIds: [currentUser.id],
        ownerId: currentUser.id,
        swimlanes: lanes,
        createdAt: now,
        updatedAt: now
      },
      tasks: [],
      sprints: [],
      risks: [],
      stakeholders: [],
      schedule: [],
      assignments: []
    };
    await saveProject(db);
    setOpen(false);
    setName('');
    setKey('');
  }

  const canCreate = currentUser?.role === 'admin' || currentUser?.role === 'member';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.projects')}</h1>
        {canCreate && (
          <button className="btn-primary" onClick={() => setOpen(true)}>
            {t('project.new')}
          </button>
        )}
      </div>

      {projectsIndex.length === 0 && <div className="text-slate-500">{t('project.empty')}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {projectsIndex.map((p) => (
          <Link to={`/projects/${p.id}`} key={p.id} className="card p-4 hover:shadow-md transition block">
            <div className="flex items-center justify-between">
              <div className="font-bold">{p.key}</div>
              <span className="chip bg-slate-100 text-slate-700">{t(`project.${p.status}` as any)}</span>
            </div>
            <div className="mt-1 text-sm">{p.name}</div>
            <div className="text-xs text-slate-500 mt-2">Updated {new Date(p.updatedAt).toLocaleString()}</div>
          </Link>
        ))}
      </div>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="text-lg font-bold mb-3">{t('project.new')}</h2>
          <label className="label">{t('project.key')}</label>
          <input className="input mb-3" value={key} onChange={(e) => setKey(e.target.value)} placeholder="PM" maxLength={8} />
          <label className="label">{t('project.name')}</label>
          <input className="input mb-4" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <button className="btn-ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button className="btn-primary" onClick={create}>{t('common.create')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
