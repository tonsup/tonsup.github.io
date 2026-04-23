import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import { nanoid } from 'nanoid';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProjectDB, Swimlane, Task } from '@/types';

export default function Kanban() {
  const { t } = useTranslation();
  const { activeProject, saveProject } = useStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [addingLane, setAddingLane] = useState(false);
  const [newLaneName, setNewLaneName] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!activeProject) return null;
  const p = activeProject;

  const tasksByLane = useMemo(() => {
    const map = new Map<string, Task[]>();
    p.project.swimlanes.forEach((l) => map.set(l.id, []));
    p.tasks.forEach((t) => {
      if (!map.has(t.laneId)) map.set(t.laneId, []);
      map.get(t.laneId)!.push(t);
    });
    return map;
  }, [p]);

  const sortedLanes = [...p.project.swimlanes].sort((a, b) => a.order - b.order);

  async function persist(next: ProjectDB) {
    await saveProject(next);
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith('task:')) {
      const taskId = id.slice(5);
      setActiveTask(p.tasks.find((t) => t.id === taskId) ?? null);
    }
  }

  function findLaneOfTask(taskId: string): string | undefined {
    return p.tasks.find((t) => t.id === taskId)?.laneId;
  }

  function resolveLaneId(over: { id: string | number } | null): string | undefined {
    if (!over) return;
    const s = String(over.id);
    if (s.startsWith('lane:')) return s.slice(5);
    if (s.startsWith('task:')) return findLaneOfTask(s.slice(5));
    return;
  }

  async function onDragOver(_e: DragOverEvent) {
    // We let onDragEnd finalise; live reorder across lanes is complex, we keep it simple.
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const activeId = String(e.active.id);
    if (!activeId.startsWith('task:')) return;
    const taskId = activeId.slice(5);
    const overLaneId = resolveLaneId(e.over ?? null);
    if (!overLaneId) return;

    const task = p.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Build new tasks array.
    let tasks = p.tasks.slice();

    if (task.laneId !== overLaneId) {
      tasks = tasks.map((t) => (t.id === taskId ? { ...t, laneId: overLaneId, updatedAt: new Date().toISOString() } : t));
    } else if (String(e.over?.id ?? '').startsWith('task:')) {
      // Reorder within lane
      const overTaskId = String(e.over!.id).slice(5);
      const inLane = tasks.filter((t) => t.laneId === overLaneId);
      const fromIdx = inLane.findIndex((t) => t.id === taskId);
      const toIdx = inLane.findIndex((t) => t.id === overTaskId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
      const reordered = arrayMove(inLane, fromIdx, toIdx);
      const others = tasks.filter((t) => t.laneId !== overLaneId);
      tasks = [...others, ...reordered];
    } else {
      return;
    }

    await persist({ ...p, tasks });
  }

  async function addLane() {
    if (!newLaneName.trim()) return;
    const lane: Swimlane = { id: nanoid(8), name: newLaneName.trim(), order: sortedLanes.length };
    const next: ProjectDB = { ...p, project: { ...p.project, swimlanes: [...p.project.swimlanes, lane] } };
    setNewLaneName('');
    setAddingLane(false);
    await persist(next);
  }

  async function renameLane(laneId: string, name: string) {
    const next: ProjectDB = {
      ...p,
      project: { ...p.project, swimlanes: p.project.swimlanes.map((l) => (l.id === laneId ? { ...l, name } : l)) }
    };
    await persist(next);
  }

  async function toggleDone(laneId: string) {
    const next: ProjectDB = {
      ...p,
      project: { ...p.project, swimlanes: p.project.swimlanes.map((l) => (l.id === laneId ? { ...l, doneLane: !l.doneLane } : l)) }
    };
    await persist(next);
  }

  async function deleteLane(laneId: string) {
    if (!confirm('Delete this lane and its tasks?')) return;
    const next: ProjectDB = {
      ...p,
      project: { ...p.project, swimlanes: p.project.swimlanes.filter((l) => l.id !== laneId) },
      tasks: p.tasks.filter((t) => t.laneId !== laneId)
    };
    await persist(next);
  }

  async function addTask(laneId: string) {
    const title = prompt('Task title?');
    if (!title) return;
    const now = new Date().toISOString();
    const nextKey = `${p.project.key}-${p.tasks.length + 1}`;
    const task: Task = {
      id: nanoid(10),
      projectId: p.project.id,
      key: nextKey,
      title,
      laneId,
      assigneeIds: [],
      storyPoints: 0,
      progressPct: 0,
      createdAt: now,
      updatedAt: now
    };
    await persist({ ...p, tasks: [...p.tasks, task] });
  }

  async function saveTask(updated: Task) {
    const next = { ...p, tasks: p.tasks.map((t) => (t.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : t)) };
    setEditingTask(null);
    await persist(next);
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return;
    await persist({ ...p, tasks: p.tasks.filter((t) => t.id !== id) });
    setEditingTask(null);
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {sortedLanes.map((lane) => (
            <LaneColumn
              key={lane.id}
              lane={lane}
              tasks={tasksByLane.get(lane.id) ?? []}
              onAddTask={() => addTask(lane.id)}
              onRename={(n) => renameLane(lane.id, n)}
              onToggleDone={() => toggleDone(lane.id)}
              onDelete={() => deleteLane(lane.id)}
              onOpenTask={(tk) => setEditingTask(tk)}
            />
          ))}
          <div className="min-w-[260px]">
            {addingLane ? (
              <div className="card p-2">
                <input className="input" autoFocus value={newLaneName} onChange={(e) => setNewLaneName(e.target.value)} placeholder="Lane name" />
                <div className="flex gap-2 mt-2">
                  <button className="btn-primary" onClick={addLane}>Add</button>
                  <button className="btn-ghost" onClick={() => setAddingLane(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="btn-ghost w-full justify-center border border-dashed border-slate-300" onClick={() => setAddingLane(true)}>
                {t('kanban.addLane')}
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {editingTask && (
        <TaskEditor
          task={editingTask}
          lanes={sortedLanes}
          onClose={() => setEditingTask(null)}
          onSave={saveTask}
          onDelete={() => deleteTask(editingTask.id)}
        />
      )}
    </div>
  );
}

function LaneColumn({
  lane,
  tasks,
  onAddTask,
  onRename,
  onToggleDone,
  onDelete,
  onOpenTask
}: {
  lane: Swimlane;
  tasks: Task[];
  onAddTask: () => void;
  onRename: (n: string) => void;
  onToggleDone: () => void;
  onDelete: () => void;
  onOpenTask: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `lane:${lane.id}` });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(lane.name);

  return (
    <div ref={setNodeRef} className={`lane ${isOver ? 'ring-2 ring-brand-500' : ''}`}>
      <div className="flex items-center justify-between px-1">
        {editing ? (
          <input
            autoFocus
            className="input py-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (name !== lane.name) onRename(name);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        ) : (
          <button className="font-semibold text-sm text-left flex-1" onClick={() => setEditing(true)}>
            {lane.name}
            {lane.doneLane && <span className="ml-2 chip bg-emerald-100 text-emerald-700">done</span>}
          </button>
        )}
        <span className="text-xs text-slate-500">{tasks.length}</span>
      </div>
      <div className="flex gap-1 px-1 text-xs">
        <button className="text-slate-500 hover:text-slate-900" onClick={onToggleDone} title="Toggle done lane">✓</button>
        <button className="text-slate-500 hover:text-red-600" onClick={onDelete} title="Delete lane">🗑</button>
      </div>

      <SortableContext items={tasks.map((t) => `task:${t.id}`)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[40px]">
          {tasks.map((t) => (
            <SortableTask key={t.id} task={t} onOpen={() => onOpenTask(t)} />
          ))}
        </div>
      </SortableContext>

      <button className="btn-ghost justify-center text-xs mt-1" onClick={onAddTask}>
        + Add card
      </button>
    </div>
  );
}

function SortableTask({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `task:${task.id}` });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={isDragging ? 'opacity-40' : ''} onDoubleClick={onOpen}>
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, dragging }: { task: Task; dragging?: boolean }) {
  return (
    <div className={`card-task ${dragging ? 'dragging' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">{task.title}</div>
        {task.storyPoints ? <span className="chip bg-brand-50 text-brand-700">{task.storyPoints} SP</span> : null}
      </div>
      <div className="text-xs text-slate-500 mt-1">{task.key}</div>
      {typeof task.progressPct === 'number' && task.progressPct > 0 && (
        <div className="mt-2 h-1 bg-slate-200 rounded">
          <div className="h-1 bg-brand-600 rounded" style={{ width: `${task.progressPct}%` }} />
        </div>
      )}
    </div>
  );
}

function TaskEditor({ task, lanes, onClose, onSave, onDelete }: { task: Task; lanes: Swimlane[]; onClose: () => void; onSave: (t: Task) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState<Task>(task);
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">{draft.key}</h3>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        <label className="label">Title</label>
        <input className="input mb-3" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <label className="label">Description</label>
        <textarea className="input mb-3 h-24" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Lane</label>
            <select className="input" value={draft.laneId} onChange={(e) => setDraft({ ...draft, laneId: e.target.value })}>
              {lanes.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Story points</label>
            <input type="number" className="input" value={draft.storyPoints ?? 0} onChange={(e) => setDraft({ ...draft, storyPoints: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Progress %</label>
            <input type="number" min={0} max={100} className="input" value={draft.progressPct ?? 0} onChange={(e) => setDraft({ ...draft, progressPct: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="label">Priority</label>
            <select className="input" value={draft.priority ?? ''} onChange={(e) => setDraft({ ...draft, priority: (e.target.value || undefined) as Task['priority'] })}>
              <option value="">—</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="urgent">urgent</option>
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input type="date" className="input" value={draft.dueDate?.slice(0, 10) ?? ''} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
          </div>
        </div>
        <div className="flex justify-between mt-5">
          <button className="btn-danger" onClick={onDelete}>Delete</button>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={() => onSave(draft)}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
