import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import { setLang } from '@/lib/auth';
import i18n from '@/i18n';

export default function Layout() {
  const { t } = useTranslation();
  const { currentUser, session, logout, error, loading } = useStore();

  const nav = [
    { to: '/', label: t('nav.dashboard'), icon: '📊' },
    { to: '/projects', label: t('nav.projects'), icon: '📁' },
    { to: '/users', label: t('nav.users'), icon: '👥' },
    { to: '/settings', label: t('nav.settings'), icon: '⚙️' }
  ];

  return (
    <div className="h-full flex">
      <aside className="w-56 bg-slate-900 text-slate-100 p-3 flex flex-col gap-1">
        <div className="text-lg font-bold px-2 py-3 flex items-center gap-2">
          <span>🧭</span> {t('appName')}
        </div>
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
                isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'
              }`
            }
          >
            <span>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
        <div className="flex-1" />
        <div className="text-xs text-slate-400 px-2 pb-1">
          {session?.dataOwner}/{session?.dataRepo}
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 border-b bg-white flex items-center px-4 gap-3">
          <div className="flex-1 text-sm text-slate-500">
            {loading ? t('common.loading') : error ? <span className="text-red-600">⚠ {error}</span> : null}
          </div>
          <select
            className="input w-auto text-xs py-1"
            value={i18n.language}
            onChange={(e) => {
              const lang = e.target.value as 'th' | 'en';
              setLang(lang);
              i18n.changeLanguage(lang);
            }}
          >
            <option value="th">ไทย</option>
            <option value="en">EN</option>
          </select>
          {currentUser && (
            <div className="flex items-center gap-2 text-sm">
              {currentUser.avatarUrl && <img src={currentUser.avatarUrl} className="w-7 h-7 rounded-full" />}
              <span>{currentUser.login}</span>
              <span className="chip bg-slate-100 text-slate-700">{t(`common.${currentUser.role}`)}</span>
            </div>
          )}
          <button className="btn-ghost" onClick={logout}>Logout</button>
        </header>
        <div className="flex-1 overflow-auto p-5">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
