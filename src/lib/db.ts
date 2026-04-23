// High-level data access layer. Repo layout:
//   config.json                  → AppConfig + admins
//   users/<login>.json           → UserProfile
//   projects/<projectId>.json    → ProjectDB (project + tasks + sprints + ...)
//   projects/_index.json         → [{id, key, name, status}] for fast listing

import { GitHubClient, GhFile } from './github';
import type { AppConfig, Project, ProjectDB, UserProfile } from '@/types';

const INDEX_PATH = 'projects/_index.json';
const CONFIG_PATH = 'config.json';

export type ProjectIndexEntry = Pick<Project, 'id' | 'key' | 'name' | 'status' | 'ownerId'> & { updatedAt: string };

export class DB {
  private shaCache = new Map<string, string>();

  constructor(public gh: GitHubClient) {}

  // -------- bootstrap --------
  async bootstrap(adminLogin: string): Promise<AppConfig> {
    await this.gh.ensureRepoExists();
    const existing = await this.gh.getJson<AppConfig>(CONFIG_PATH);
    if (existing) {
      this.shaCache.set(CONFIG_PATH, existing.sha);
      return existing.data;
    }
    const cfg: AppConfig = {
      dataOwner: this.gh['owner'] as string,
      dataRepo: this.gh['repo'] as string,
      dataBranch: this.gh['branch'] as string,
      admins: [adminLogin]
    };
    const res = await this.gh.putJson<AppConfig>(CONFIG_PATH, cfg, undefined, 'chore(pm): init config');
    this.shaCache.set(CONFIG_PATH, res.sha);
    // initialise empty index
    await this.gh.putJson<ProjectIndexEntry[]>(INDEX_PATH, [], undefined, 'chore(pm): init projects index');
    return cfg;
  }

  async getConfig(): Promise<AppConfig | null> {
    const f = await this.gh.getJson<AppConfig>(CONFIG_PATH);
    if (f) this.shaCache.set(CONFIG_PATH, f.sha);
    return f?.data ?? null;
  }

  async saveConfig(cfg: AppConfig): Promise<void> {
    const sha = this.shaCache.get(CONFIG_PATH);
    const res = await this.gh.putJson<AppConfig>(CONFIG_PATH, cfg, sha);
    this.shaCache.set(CONFIG_PATH, res.sha);
  }

  // -------- users --------
  async listUsers(): Promise<UserProfile[]> {
    const files = await this.gh.listDir('users');
    const users: UserProfile[] = [];
    for (const f of files) {
      if (f.type !== 'file' || !f.name.endsWith('.json')) continue;
      const res = await this.gh.getJson<UserProfile>(f.path);
      if (res) {
        this.shaCache.set(f.path, res.sha);
        users.push(res.data);
      }
    }
    return users;
  }

  async getUser(login: string): Promise<UserProfile | null> {
    const path = `users/${login}.json`;
    const f = await this.gh.getJson<UserProfile>(path);
    if (f) this.shaCache.set(path, f.sha);
    return f?.data ?? null;
  }

  async saveUser(u: UserProfile): Promise<void> {
    const path = `users/${u.login}.json`;
    const sha = this.shaCache.get(path);
    const res = await this.gh.putJson<UserProfile>(path, u, sha);
    this.shaCache.set(path, res.sha);
  }

  // -------- projects --------
  async listProjects(): Promise<ProjectIndexEntry[]> {
    const f = await this.gh.getJson<ProjectIndexEntry[]>(INDEX_PATH);
    if (!f) return [];
    this.shaCache.set(INDEX_PATH, f.sha);
    return f.data;
  }

  async getProject(id: string): Promise<ProjectDB | null> {
    const path = `projects/${id}.json`;
    const f = await this.gh.getJson<ProjectDB>(path);
    if (f) this.shaCache.set(path, f.sha);
    return f?.data ?? null;
  }

  async saveProject(db: ProjectDB): Promise<void> {
    const path = `projects/${db.project.id}.json`;
    db.project.updatedAt = new Date().toISOString();
    const sha = this.shaCache.get(path);
    const res = await this.gh.putJson<ProjectDB>(path, db, sha);
    this.shaCache.set(path, res.sha);
    // update index
    await this.upsertIndex(db.project);
  }

  async deleteProject(id: string): Promise<void> {
    const path = `projects/${id}.json`;
    const sha = this.shaCache.get(path) ?? (await this.gh.getJson(path))?.sha;
    if (sha) await this.gh.deleteFile(path, sha);
    this.shaCache.delete(path);
    const idx = await this.listProjects();
    const next = idx.filter((p) => p.id !== id);
    const isha = this.shaCache.get(INDEX_PATH);
    const res = await this.gh.putJson<ProjectIndexEntry[]>(INDEX_PATH, next, isha);
    this.shaCache.set(INDEX_PATH, res.sha);
  }

  private async upsertIndex(p: Project): Promise<void> {
    const idxFile = (await this.gh.getJson<ProjectIndexEntry[]>(INDEX_PATH)) ?? { sha: undefined as any, data: [] as ProjectIndexEntry[], path: INDEX_PATH };
    if (idxFile.sha) this.shaCache.set(INDEX_PATH, idxFile.sha);
    const entry: ProjectIndexEntry = {
      id: p.id, key: p.key, name: p.name, status: p.status, ownerId: p.ownerId, updatedAt: p.updatedAt
    };
    const existing = idxFile.data.findIndex((x) => x.id === p.id);
    const next = [...idxFile.data];
    if (existing >= 0) next[existing] = entry;
    else next.push(entry);
    const res = await this.gh.putJson<ProjectIndexEntry[]>(INDEX_PATH, next, this.shaCache.get(INDEX_PATH));
    this.shaCache.set(INDEX_PATH, res.sha);
  }
}
