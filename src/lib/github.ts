// Thin GitHub REST API client used as a JSON database.
// Uses personal access tokens supplied at runtime (PAT flow) or OAuth access tokens.
// Supports optimistic concurrency via file SHAs.

const API = 'https://api.github.com';

export class GitHubApiError extends Error {
  status: number;
  data: unknown;
  constructor(msg: string, status: number, data: unknown) {
    super(msg);
    this.status = status;
    this.data = data;
  }
}

export interface GhFile<T> {
  path: string;
  sha: string;
  data: T;
}

export class GitHubClient {
  constructor(
    private token: string,
    private owner: string,
    private repo: string,
    private branch = 'main'
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...extra
    };
  }

  async me(): Promise<{ login: string; name?: string; avatar_url?: string; email?: string }> {
    const r = await fetch(`${API}/user`, { headers: this.headers() });
    if (!r.ok) throw new GitHubApiError('auth failed', r.status, await safeJson(r));
    return r.json();
  }

  /** Get JSON file content + sha. Returns null if not found. */
  async getJson<T>(path: string): Promise<GhFile<T> | null> {
    const url = `${API}/repos/${this.owner}/${this.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`;
    const r = await fetch(url, { headers: this.headers() });
    if (r.status === 404) return null;
    if (!r.ok) throw new GitHubApiError(`getJson ${path}`, r.status, await safeJson(r));
    const json = await r.json();
    // decode base64
    const content = atob((json.content as string).replace(/\n/g, ''));
    // Properly decode UTF-8
    const bytes = Uint8Array.from(content, (c) => c.charCodeAt(0));
    const text = new TextDecoder('utf-8').decode(bytes);
    return { path, sha: json.sha, data: JSON.parse(text) as T };
  }

  /** Create or update JSON file. Pass previous sha on update. */
  async putJson<T>(path: string, data: T, sha?: string, message?: string): Promise<GhFile<T>> {
    const url = `${API}/repos/${this.owner}/${this.repo}/contents/${encodePath(path)}`;
    const encoded = base64EncodeUtf8(JSON.stringify(data, null, 2));
    const body: Record<string, unknown> = {
      message: message ?? (sha ? `chore(pm): update ${path}` : `chore(pm): create ${path}`),
      content: encoded,
      branch: this.branch
    };
    if (sha) body.sha = sha;
    const r = await fetch(url, { method: 'PUT', headers: this.headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) });
    if (!r.ok) throw new GitHubApiError(`putJson ${path}`, r.status, await safeJson(r));
    const json = await r.json();
    return { path, sha: json.content.sha, data };
  }

  async listDir(path: string): Promise<{ name: string; path: string; type: string }[]> {
    const url = `${API}/repos/${this.owner}/${this.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`;
    const r = await fetch(url, { headers: this.headers() });
    if (r.status === 404) return [];
    if (!r.ok) throw new GitHubApiError(`listDir ${path}`, r.status, await safeJson(r));
    const json = await r.json();
    if (!Array.isArray(json)) return [];
    return json.map((x: any) => ({ name: x.name, path: x.path, type: x.type }));
  }

  async deleteFile(path: string, sha: string): Promise<void> {
    const url = `${API}/repos/${this.owner}/${this.repo}/contents/${encodePath(path)}`;
    const body = { message: `chore(pm): delete ${path}`, sha, branch: this.branch };
    const r = await fetch(url, { method: 'DELETE', headers: this.headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) });
    if (!r.ok) throw new GitHubApiError(`deleteFile ${path}`, r.status, await safeJson(r));
  }

  /** Ensure the repo exists (user scope). Does not create org repos. */
  async ensureRepoExists(): Promise<void> {
    const r = await fetch(`${API}/repos/${this.owner}/${this.repo}`, { headers: this.headers() });
    if (r.ok) return;
    if (r.status !== 404) throw new GitHubApiError('repo check failed', r.status, await safeJson(r));
    // create private repo under authenticated user
    const cr = await fetch(`${API}/user/repos`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        name: this.repo,
        private: true,
        description: 'Tonsup PM data repository',
        auto_init: true
      })
    });
    if (!cr.ok) throw new GitHubApiError('repo create failed', cr.status, await safeJson(cr));
  }
}

function encodePath(p: string) {
  return p.split('/').map(encodeURIComponent).join('/');
}

function base64EncodeUtf8(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
