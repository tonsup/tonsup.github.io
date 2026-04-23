import { useStore } from '@/store';
import { currency, fmtDate } from '@/lib/util';

export default function ProjectReport() {
  const { activeProject, users, currentUser, session } = useStore();
  if (!activeProject) return null;
  const p = activeProject;
  const doneLaneIds = new Set(p.project.swimlanes.filter((l) => l.doneLane).map((l) => l.id));

  const totalSP = p.tasks.reduce((a, b) => a + (b.storyPoints ?? 0), 0);
  const doneSP = p.tasks.filter((t) => doneLaneIds.has(t.laneId)).reduce((a, b) => a + (b.storyPoints ?? 0), 0);
  const progress = totalSP ? Math.round((doneSP / totalSP) * 100) : 0;
  const doneTasks = p.tasks.filter((t) => doneLaneIds.has(t.laneId));
  const activeTasks = p.tasks.filter((t) => !doneLaneIds.has(t.laneId));

  // Financials
  let resourceCost = 0;
  for (const t of p.tasks) {
    const hours = t.loggedHours ?? 0;
    const assignees = t.assigneeIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
    const avgRate = assignees.length ? assignees.reduce((s, u) => s + (u?.hourlyCost ?? 0), 0) / assignees.length : 0;
    resourceCost += hours * avgRate;
  }
  const expenseTotal = p.tasks.reduce((s, t) => s + (t.expenses ?? []).reduce((x, e) => x + e.amount, 0), 0);
  const actualCost = resourceCost + expenseTotal;
  const ccy = p.project.currency ?? 'THB';
  const revenue = p.project.revenueBudget ?? 0;
  const budget = p.project.costBudget ?? 0;

  // Risks
  const openRisks = p.risks.filter((r) => r.kind === 'risk' && r.status !== 'closed');
  const openIssues = p.risks.filter((r) => r.kind === 'issue' && r.status !== 'closed');

  // Resources in project
  const resourceRollup = users.map((u) => {
    const mine = p.assignments.filter((a) => a.userId === u.id);
    const alloc = mine.reduce((s, a) => s + (a.allocationPct ?? 0), 0);
    const tasks = p.tasks.filter((t) => t.assigneeIds.includes(u.id));
    const active = tasks.filter((t) => !doneLaneIds.has(t.laneId));
    const completedCount = tasks.length - active.length;
    const loggedHours = tasks.reduce((s, t) => s + (t.loggedHours ?? 0), 0);
    return { u, alloc, active, completedCount, loggedHours };
  }).filter((r) => r.alloc > 0 || r.active.length > 0 || r.completedCount > 0);

  function doPrint() {
    window.print();
  }

  return (
    <div className="report-root">
      <div className="no-print flex justify-between items-center mb-4 sticky top-0 bg-slate-50 py-2 z-10">
        <div className="text-sm text-slate-600">Print this page (Save as PDF) — use browser Print dialog.</div>
        <button className="btn-primary" onClick={doPrint}>🖨 Print / Save as PDF</button>
      </div>

      <div className="report bg-white">
        {/* Cover */}
        <header className="mb-6 border-b pb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-slate-500">Tonsup PM · Project Status Report</div>
              <h1 className="text-3xl font-bold mt-1">{p.project.name}</h1>
              <div className="text-slate-600 mt-0.5">Key: <span className="font-semibold">{p.project.key}</span> · Status: <span className="capitalize">{p.project.status}</span></div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Generated {new Date().toLocaleString()}</div>
              <div>By @{currentUser?.login ?? session?.login}</div>
              <div>Data: {session?.dataOwner}/{session?.dataRepo}</div>
            </div>
          </div>
          {p.project.description && <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{p.project.description}</p>}
        </header>

        {/* Executive summary */}
        <Section title="1. Executive summary">
          <div className="grid grid-cols-4 gap-3 text-sm">
            <Info label="Start" value={fmtDate(p.project.startDate)} />
            <Info label="End" value={fmtDate(p.project.endDate)} />
            <Info label="Owner" value={p.project.ownerId ? `@${p.project.ownerId}` : '—'} />
            <Info label="Members" value={p.project.memberIds.length} />
            <Info label="Story points" value={`${doneSP} / ${totalSP}`} />
            <Info label="Progress" value={`${progress}%`} />
            <Info label="Active tasks" value={activeTasks.length} />
            <Info label="Completed" value={doneTasks.length} />
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Overall progress (story points)</span><span>{progress}%</span>
            </div>
            <div className="h-3 bg-slate-200 rounded overflow-hidden"><div className="h-full bg-brand-600" style={{ width: `${progress}%` }} /></div>
          </div>
        </Section>

        {/* Scope */}
        {(p.project.scope || (p.project.deliverables ?? []).length > 0) && (
          <Section title="2. Scope & deliverables">
            {p.project.scope && <p className="text-sm whitespace-pre-wrap mb-2">{p.project.scope}</p>}
            {(p.project.deliverables ?? []).length > 0 && (
              <ul className="list-disc pl-6 text-sm">{p.project.deliverables!.map((d, i) => <li key={i}>{d}</li>)}</ul>
            )}
          </Section>
        )}

        {/* Financials */}
        <Section title="3. Financials">
          <table className="w-full text-sm">
            <tbody>
              <Row label="Currency" value={ccy} />
              <Row label="Revenue budget" value={currency(revenue, ccy)} />
              <Row label="Cost budget" value={currency(budget, ccy)} />
              <Row label="Actual cost (resource + expense)" value={currency(actualCost, ccy)} />
              <Row label="  · Resource cost" value={currency(resourceCost, ccy)} />
              <Row label="  · Expenses" value={currency(expenseTotal, ccy)} />
              <Row label="Plan margin" value={currency(revenue - budget, ccy)} />
              <Row label="Actual margin" value={currency(revenue - actualCost, ccy)} />
              <Row label="Budget utilisation" value={budget ? `${Math.round((actualCost / budget) * 100)}%` : '—'} />
            </tbody>
          </table>
        </Section>

        {/* What's in progress */}
        <Section title="4. Currently in progress">
          {activeTasks.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing active.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs"><tr><th className="px-2 py-1 text-left">Key</th><th className="px-2 py-1 text-left">Title</th><th className="px-2 py-1 text-left">Assignees</th><th className="px-2 py-1 text-left">SP</th><th className="px-2 py-1 text-left">Progress</th><th className="px-2 py-1 text-left">Due</th></tr></thead>
              <tbody>
                {activeTasks.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-2 py-1">{t.key}</td>
                    <td className="px-2 py-1">{t.title}</td>
                    <td className="px-2 py-1 text-xs">{t.assigneeIds.map((a) => `@${a}`).join(', ') || '—'}</td>
                    <td className="px-2 py-1">{t.storyPoints ?? 0}</td>
                    <td className="px-2 py-1">{t.progressPct ?? 0}%</td>
                    <td className="px-2 py-1 text-xs">{fmtDate(t.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Completed */}
        <Section title="5. Completed">
          {doneTasks.length === 0 ? <p className="text-sm text-slate-500">—</p> : (
            <ul className="text-sm list-disc pl-6">{doneTasks.map((t) => <li key={t.id}>{t.key} · {t.title} ({t.storyPoints ?? 0} SP)</li>)}</ul>
          )}
        </Section>

        {/* Next */}
        <Section title="6. Next (Backlog / To-do)">
          {(() => {
            const backlogLane = p.project.swimlanes.sort((a, b) => a.order - b.order)[0];
            const upcoming = p.tasks.filter((t) => t.laneId === backlogLane?.id);
            return upcoming.length === 0 ? <p className="text-sm text-slate-500">—</p> : (
              <ul className="text-sm list-disc pl-6">{upcoming.slice(0, 20).map((t) => <li key={t.id}>{t.key} · {t.title}</li>)}</ul>
            );
          })()}
        </Section>

        {/* Sprints */}
        {p.sprints.length > 0 && (
          <Section title="7. Sprints">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs"><tr><th className="px-2 py-1 text-left">Sprint</th><th className="px-2 py-1 text-left">Status</th><th className="px-2 py-1 text-left">Start</th><th className="px-2 py-1 text-left">End</th><th className="px-2 py-1 text-left">Goal</th></tr></thead>
              <tbody>
                {p.sprints.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-2 py-1">{s.name}</td>
                    <td className="px-2 py-1">{s.status}</td>
                    <td className="px-2 py-1 text-xs">{fmtDate(s.startDate)}</td>
                    <td className="px-2 py-1 text-xs">{fmtDate(s.endDate)}</td>
                    <td className="px-2 py-1 text-xs">{s.goal ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Risks */}
        <Section title="8. Risks & Issues">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold mb-1">Open risks ({openRisks.length})</div>
              {openRisks.length === 0 ? <div className="text-xs text-slate-500">—</div> : (
                <ul className="text-sm list-disc pl-5">{openRisks.map((r) => <li key={r.id}>{r.title} (P×I = {(r.probability ?? 0) * (r.impact ?? 0)}) · {r.ownerId ? `@${r.ownerId}` : 'no owner'}</li>)}</ul>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold mb-1">Open issues ({openIssues.length})</div>
              {openIssues.length === 0 ? <div className="text-xs text-slate-500">—</div> : (
                <ul className="text-sm list-disc pl-5">{openIssues.map((r) => <li key={r.id}>{r.title} · {r.ownerId ? `@${r.ownerId}` : 'no owner'}</li>)}</ul>
              )}
            </div>
          </div>
        </Section>

        {/* Stakeholders */}
        {p.stakeholders.length > 0 && (
          <Section title="9. Stakeholders">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs"><tr><th className="px-2 py-1 text-left">Name</th><th className="px-2 py-1 text-left">Type</th><th className="px-2 py-1 text-left">Power</th><th className="px-2 py-1 text-left">Interest</th><th className="px-2 py-1 text-left">Strategy</th><th className="px-2 py-1 text-left">Contact</th></tr></thead>
              <tbody>
                {p.stakeholders.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-2 py-1">{s.name}</td>
                    <td className="px-2 py-1">{s.type}</td>
                    <td className="px-2 py-1">{s.power}</td>
                    <td className="px-2 py-1">{s.interest}</td>
                    <td className="px-2 py-1">{s.strategy}</td>
                    <td className="px-2 py-1 text-xs">{[s.email, s.phone].filter(Boolean).join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Resources */}
        {resourceRollup.length > 0 && (
          <Section title="10. Resources">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs"><tr><th className="px-2 py-1 text-left">User</th><th className="px-2 py-1 text-left">Skills</th><th className="px-2 py-1 text-left">Allocation</th><th className="px-2 py-1 text-left">Active</th><th className="px-2 py-1 text-left">Done</th><th className="px-2 py-1 text-left">Hours</th></tr></thead>
              <tbody>
                {resourceRollup.map((r) => (
                  <tr key={r.u.id} className="border-t">
                    <td className="px-2 py-1">{r.u.name ?? r.u.login} <span className="text-xs text-slate-500">@{r.u.login}</span></td>
                    <td className="px-2 py-1 text-xs">{r.u.skills?.join(', ') ?? '—'}</td>
                    <td className="px-2 py-1">{r.alloc}%</td>
                    <td className="px-2 py-1">{r.active.length}</td>
                    <td className="px-2 py-1">{r.completedCount}</td>
                    <td className="px-2 py-1">{r.loggedHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <footer className="text-xs text-slate-400 mt-6 pt-3 border-t text-center">
          Generated by Tonsup PM · https://tonsup.github.io/
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 avoid-break">
      <h2 className="text-lg font-bold mb-2 border-b pb-1">{title}</h2>
      {children}
    </section>
  );
}
function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (<div><div className="text-xs text-slate-500">{label}</div><div className="font-medium">{value}</div></div>);
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (<tr className="border-t"><td className="px-2 py-1 text-slate-600">{label}</td><td className="px-2 py-1 text-right font-medium">{value}</td></tr>);
}
