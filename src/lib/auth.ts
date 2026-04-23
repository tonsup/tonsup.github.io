// Auth: PAT (primary, zero-infra) and OAuth Device Flow (optional, needs CORS proxy).
// We store token in localStorage. Never log it.

import { GitHubClient } from './github';

const LS_TOKEN = 'tonsup_pm_token';
const LS_LOGIN = 'tonsup_pm_login';
const LS_DATA_OWNER = 'tonsup_pm_data_owner';
const LS_DATA_REPO = 'tonsup_pm_data_repo';
const LS_DATA_BRANCH = 'tonsup_pm_data_branch';
const LS_LANG = 'tonsup_pm_lang';

export interface Session {
  token: string;
  login: string;
  name?: string;
  avatarUrl?: string;
  dataOwner: string;
  dataRepo: string;
  dataBranch: string;
}

export function loadSession(): Session | null {
  const token = localStorage.getItem(LS_TOKEN);
  const login = localStorage.getItem(LS_LOGIN);
  const dataOwner = localStorage.getItem(LS_DATA_OWNER);
  const dataRepo = localStorage.getItem(LS_DATA_REPO);
  const dataBranch = localStorage.getItem(LS_DATA_BRANCH) ?? 'main';
  if (!token || !login || !dataOwner || !dataRepo) return null;
  return { token, login, dataOwner, dataRepo, dataBranch };
}

export function saveSession(s: Session) {
  localStorage.setItem(LS_TOKEN, s.token);
  localStorage.setItem(LS_LOGIN, s.login);
  localStorage.setItem(LS_DATA_OWNER, s.dataOwner);
  localStorage.setItem(LS_DATA_REPO, s.dataRepo);
  localStorage.setItem(LS_DATA_BRANCH, s.dataBranch);
}

export function clearSession() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_LOGIN);
  localStorage.removeItem(LS_DATA_OWNER);
  localStorage.removeItem(LS_DATA_REPO);
  localStorage.removeItem(LS_DATA_BRANCH);
}

export function getLang(): 'th' | 'en' {
  return (localStorage.getItem(LS_LANG) as 'th' | 'en') ?? 'th';
}
export function setLang(l: 'th' | 'en') {
  localStorage.setItem(LS_LANG, l);
}

export async function loginWithPAT(token: string, dataOwner: string, dataRepo: string, dataBranch = 'main'): Promise<Session> {
  const gh = new GitHubClient(token, dataOwner, dataRepo, dataBranch);
  const me = await gh.me();
  const s: Session = {
    token,
    login: me.login,
    name: me.name,
    avatarUrl: me.avatar_url,
    dataOwner,
    dataRepo,
    dataBranch
  };
  saveSession(s);
  return s;
}
