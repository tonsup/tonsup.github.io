# Tonsup PM

เว็บแอปบริหารโปรเจกต์แบบครบวงจร (Kanban / Sprint / Risk / Stakeholder / Scheduler / Resource / Cost / Financial Dashboard)
รันเป็น SPA บน **GitHub Pages** โดยใช้ **GitHub repo เป็นฐานข้อมูล JSON** — ฟรี 100% ไม่มี backend เพิ่ม

> Phase 1 (MVP) ตอนนี้ครอบคลุม: Auth (PAT), User Management, Projects, Kanban พร้อม swimlane ปรับได้ + drag-drop, Story Points, Progress, i18n TH/EN, Dashboard portfolio
> Phase 2+: Sprint calendar, Gantt Scheduler, Risk/Issue Register, Stakeholder Register, Resource Assignment, Cost/Financial (โครง types.ts เตรียมไว้แล้ว — จะทยอยเพิ่ม UI)

## สถาปัตยกรรม

```
Browser (SPA React)
   │  HTTPS + PAT
   ▼
GitHub REST API
   │
   ▼
Private repo  tonsup/pm-data
   config.json
   users/<login>.json
   projects/_index.json
   projects/<id>.json      ← ProjectDB (tasks, sprints, risks, ...)
```

- ไม่มี server, ไม่มี database, ไม่มีค่าใช้จ่าย
- Optimistic concurrency ผ่าน GitHub file SHA
- Rate limit: 5,000 req/hr ต่อ user ที่ authenticate แล้ว

## ติดตั้งครั้งแรก

### 1) สร้าง Data Repo (private)
สร้าง repo ชื่อ `pm-data` ใน GitHub ของคุณ (จะถูกสร้างอัตโนมัติเมื่อ login ครั้งแรกถ้ายังไม่มี — ต้องเป็นชื่อ user ตัวเอง)

### 2) สร้าง Personal Access Token
- ไปที่ https://github.com/settings/tokens
- Fine-grained token (แนะนำ): จำกัดเฉพาะ repo `pm-data`
  - Contents: **Read and write**
  - Metadata: Read-only
  - Expiration: ตั้ง 90 วัน
- หรือ classic token scope `repo`

### 3) เปิดเว็บ
ไปที่ https://tonsup.github.io/ → Login:
- Token: PAT
- Owner: `tonsup`
- Repo: `pm-data`
- Branch: `main`

Login ครั้งแรกจะสร้าง `config.json` และ `projects/_index.json` ให้อัตโนมัติ ผู้ login คนแรกได้ role `admin`

## การพัฒนา (local)

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
```

## Deploy

- Push ขึ้น `main` ของ repo `tonsup/tonsup.github.io` → GitHub Actions จะ build + publish ไป Pages อัตโนมัติ
- ไปที่ **Settings → Pages** ของ repo แล้วตั้ง Source = "GitHub Actions"

## ความปลอดภัย

- **Token ไม่ถูกส่งไปที่ server ใด ๆ** — อยู่ใน localStorage ของ browser เท่านั้น
- อย่า commit `.env` ที่มี token
- อย่าแชร์ token ในที่สาธารณะ (chat, issue, screenshot)
- ใช้ fine-grained token แทน classic ถ้าเป็นไปได้
- ตั้ง expiration สั้น ๆ (30-90 วัน) และสร้างใหม่เป็นรอบ

## Roadmap

- [x] Auth (PAT) + session
- [x] User management + roles
- [x] Projects list + create
- [x] Kanban with custom swimlanes + drag-drop
- [x] Tasks with story points, progress, priority, due date
- [x] Portfolio dashboard + per-project overview
- [x] i18n TH/EN
- [ ] Sprints + real calendar reference + burndown
- [ ] Dependency graph between tasks
- [ ] Risk / Issue register (types พร้อมแล้ว)
- [ ] Stakeholder register (Power/Interest grid)
- [ ] Gantt scheduler (`frappe-gantt`)
- [ ] Resource assignment + utilisation dashboard
- [ ] Cost tracking (actual vs budget) + financial margin
- [ ] OAuth Device Flow (ต้องมี CORS proxy เช่น Cloudflare Worker)
- [ ] Conflict resolution UI when two users edit same project file
