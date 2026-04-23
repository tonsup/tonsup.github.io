import { useStore } from '@/store';

export default function Settings() {
  const { session, config, currentUser } = useStore();
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="card p-4 text-sm space-y-2">
        <Row label="Signed in as" value={`@${session?.login}`} />
        <Row label="Role" value={currentUser?.role ?? '—'} />
        <Row label="Data repo" value={`${session?.dataOwner}/${session?.dataRepo}@${session?.dataBranch}`} />
        <Row label="Admins" value={config?.admins.join(', ') ?? '—'} />
      </div>
      <div className="card p-4 text-sm text-slate-600">
        <p className="font-semibold mb-1">Tokens & security</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Token stored in localStorage of this browser only. Sign out clears it.</li>
          <li>Never share your PAT. Use short-expiry, fine-grained tokens scoped to the data repo.</li>
          <li>Create tokens at <code>github.com/settings/tokens</code>.</li>
        </ul>
      </div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b last:border-0 py-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
