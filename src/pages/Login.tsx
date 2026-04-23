import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loginWithPAT } from '@/lib/auth';
import { useStore } from '@/store';

export default function Login() {
  const { t } = useTranslation();
  const { setSession } = useStore();
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('pm-data');
  const [branch, setBranch] = useState('main');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const s = await loginWithPAT(token.trim(), owner.trim(), repo.trim(), branch.trim() || 'main');
      setSession(s);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <form onSubmit={submit} className="card w-full max-w-md p-6">
        <h1 className="text-xl font-bold mb-1">{t('login.title')}</h1>
        <p className="text-sm text-slate-500 mb-4">{t('login.subtitle')}</p>

        <label className="label">{t('login.token')}</label>
        <input
          className="input"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_xxx / github_pat_xxx"
          required
        />
        <p className="text-xs text-slate-500 mt-1 mb-3">{t('login.tokenHint')}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('login.owner')}</label>
            <input className="input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="tonsup" required />
          </div>
          <div>
            <label className="label">{t('login.repo')}</label>
            <input className="input" value={repo} onChange={(e) => setRepo(e.target.value)} required />
          </div>
        </div>
        <div className="mt-3">
          <label className="label">{t('login.branch')}</label>
          <input className="input" value={branch} onChange={(e) => setBranch(e.target.value)} />
        </div>

        {err && <div className="mt-3 text-sm text-red-600">⚠ {err}</div>}

        <button className="btn-primary w-full justify-center mt-5" disabled={busy}>
          {busy ? '...' : t('login.submit')}
        </button>
        <p className="text-xs text-slate-500 mt-3">
          {t('login.createHint')}
        </p>
      </form>
    </div>
  );
}
