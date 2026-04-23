import { create } from 'zustand';
import { GitHubClient } from '@/lib/github';
import { DB } from '@/lib/db';
import type { Session } from '@/lib/auth';
import type { AppConfig, ProjectDB, UserProfile } from '@/types';
import type { ProjectIndexEntry } from '@/lib/db';

interface AppState {
  session: Session | null;
  db: DB | null;
  config: AppConfig | null;
  currentUser: UserProfile | null;
  users: UserProfile[];
  projectsIndex: ProjectIndexEntry[];
  activeProject: ProjectDB | null;
  loading: boolean;
  error: string | null;

  setSession: (s: Session | null) => void;
  setError: (e: string | null) => void;
  initAfterLogin: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<ProjectDB | null>;
  saveProject: (db: ProjectDB) => Promise<void>;
  upsertUser: (u: UserProfile) => Promise<void>;
  refreshUsers: () => Promise<void>;
  logout: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  session: null,
  db: null,
  config: null,
  currentUser: null,
  users: [],
  projectsIndex: [],
  activeProject: null,
  loading: false,
  error: null,

  setSession: (s) => {
    if (!s) {
      set({ session: null, db: null, config: null, currentUser: null, users: [], projectsIndex: [], activeProject: null });
      return;
    }
    const gh = new GitHubClient(s.token, s.dataOwner, s.dataRepo, s.dataBranch);
    set({ session: s, db: new DB(gh) });
  },

  setError: (e) => set({ error: e }),

  initAfterLogin: async () => {
    const { db, session } = get();
    if (!db || !session) return;
    set({ loading: true, error: null });
    try {
      let config = await db.getConfig();
      if (!config) {
        config = await db.bootstrap(session.login);
      }
      // ensure current user exists in user registry
      let me = await db.getUser(session.login);
      if (!me) {
        const now = new Date().toISOString();
        me = {
          id: session.login,
          login: session.login,
          name: session.name,
          avatarUrl: session.avatarUrl,
          role: config.admins.includes(session.login) ? 'admin' : 'member',
          createdAt: now,
          updatedAt: now
        };
        await db.saveUser(me);
      } else if (config.admins.includes(session.login) && me.role !== 'admin') {
        me = { ...me, role: 'admin', updatedAt: new Date().toISOString() };
        await db.saveUser(me);
      }
      const users = await db.listUsers();
      const projectsIndex = await db.listProjects();
      set({ config, currentUser: me, users, projectsIndex, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? String(e) });
    }
  },

  refreshProjects: async () => {
    const { db } = get();
    if (!db) return;
    const projectsIndex = await db.listProjects();
    set({ projectsIndex });
  },

  loadProject: async (id) => {
    const { db } = get();
    if (!db) return null;
    const p = await db.getProject(id);
    set({ activeProject: p });
    return p;
  },

  saveProject: async (pdb) => {
    const { db } = get();
    if (!db) return;
    await db.saveProject(pdb);
    const projectsIndex = await db.listProjects();
    set({ activeProject: pdb, projectsIndex });
  },

  upsertUser: async (u) => {
    const { db } = get();
    if (!db) return;
    await db.saveUser(u);
    const users = await db.listUsers();
    set({ users });
  },

  refreshUsers: async () => {
    const { db } = get();
    if (!db) return;
    const users = await db.listUsers();
    set({ users });
  },

  logout: () => {
    localStorage.clear();
    location.reload();
  }
}));
