import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLang } from './lib/auth';

const resources = {
  th: {
    translation: {
      appName: 'Tonsup PM',
      nav: {
        dashboard: 'แดชบอร์ด',
        projects: 'โปรเจกต์',
        users: 'ผู้ใช้งาน',
        settings: 'ตั้งค่า'
      },
      login: {
        title: 'เข้าสู่ระบบ Tonsup PM',
        subtitle: 'ใช้ GitHub Personal Access Token เป็นวิธีเริ่มต้นที่ปลอดภัยและไม่ต้องมี server',
        token: 'GitHub Personal Access Token',
        tokenHint: 'ต้องมีสิทธิ์ repo (private) — token จะถูกเก็บเฉพาะใน browser เท่านั้น',
        owner: 'Data repo owner (GitHub username / org)',
        repo: 'Data repo name (จะถูกสร้างให้ถ้ายังไม่มี)',
        branch: 'Branch',
        submit: 'เข้าสู่ระบบ',
        createHint: 'สร้าง PAT ที่ github.com/settings/tokens (scope: repo)'
      },
      common: {
        save: 'บันทึก',
        cancel: 'ยกเลิก',
        delete: 'ลบ',
        create: 'สร้าง',
        edit: 'แก้ไข',
        loading: 'กำลังโหลด...',
        confirm: 'ยืนยัน',
        name: 'ชื่อ',
        description: 'คำอธิบาย',
        status: 'สถานะ',
        owner: 'เจ้าของ',
        member: 'สมาชิก',
        admin: 'ผู้ดูแล',
        viewer: 'ผู้ชม',
        role: 'บทบาท'
      },
      project: {
        key: 'รหัสโปรเจกต์',
        name: 'ชื่อโปรเจกต์',
        status: 'สถานะ',
        planning: 'วางแผน',
        active: 'ดำเนินการ',
        'on-hold': 'พักไว้',
        done: 'เสร็จสิ้น',
        cancelled: 'ยกเลิก',
        empty: 'ยังไม่มีโปรเจกต์ — สร้างใหม่ได้เลย',
        new: 'สร้างโปรเจกต์ใหม่',
        kanban: 'คัมบัง',
        overview: 'ภาพรวม',
        schedule: 'ตารางเวลา',
        risks: 'ความเสี่ยง/ปัญหา',
        stakeholders: 'ผู้มีส่วนได้เสีย',
        resources: 'ทรัพยากร',
        financials: 'การเงิน'
      },
      kanban: {
        addLane: '+ เพิ่มเลน',
        addTask: '+ เพิ่มการ์ด',
        laneName: 'ชื่อเลน',
        storyPoints: 'SP',
        progress: 'ความคืบหน้า'
      },
      dashboard: {
        title: 'แดชบอร์ดโดยรวม',
        totalProjects: 'โปรเจกต์ทั้งหมด',
        activeProjects: 'ที่ดำเนินการอยู่',
        tasksDone: 'งานที่เสร็จแล้ว',
        tasksInProgress: 'งานที่กำลังทำ'
      }
    }
  },
  en: {
    translation: {
      appName: 'Tonsup PM',
      nav: { dashboard: 'Dashboard', projects: 'Projects', users: 'Users', settings: 'Settings' },
      login: {
        title: 'Sign in to Tonsup PM',
        subtitle: 'Use a GitHub Personal Access Token — no server required.',
        token: 'GitHub Personal Access Token',
        tokenHint: 'Requires "repo" scope (private). Stored only in this browser.',
        owner: 'Data repo owner (GitHub username / org)',
        repo: 'Data repo name (will be created if missing)',
        branch: 'Branch',
        submit: 'Sign in',
        createHint: 'Create a PAT at github.com/settings/tokens (scope: repo)'
      },
      common: {
        save: 'Save', cancel: 'Cancel', delete: 'Delete', create: 'Create', edit: 'Edit',
        loading: 'Loading...', confirm: 'Confirm',
        name: 'Name', description: 'Description', status: 'Status', owner: 'Owner',
        member: 'Member', admin: 'Admin', viewer: 'Viewer', role: 'Role'
      },
      project: {
        key: 'Key', name: 'Project name', status: 'Status',
        planning: 'Planning', active: 'Active', 'on-hold': 'On hold', done: 'Done', cancelled: 'Cancelled',
        empty: 'No projects yet — create one.',
        new: 'New project',
        kanban: 'Kanban', overview: 'Overview', schedule: 'Schedule',
        risks: 'Risks/Issues', stakeholders: 'Stakeholders', resources: 'Resources', financials: 'Financials'
      },
      kanban: {
        addLane: '+ Add lane', addTask: '+ Add card',
        laneName: 'Lane name', storyPoints: 'SP', progress: 'Progress'
      },
      dashboard: {
        title: 'Portfolio dashboard',
        totalProjects: 'Total projects',
        activeProjects: 'Active',
        tasksDone: 'Tasks done',
        tasksInProgress: 'Tasks in progress'
      }
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: getLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
