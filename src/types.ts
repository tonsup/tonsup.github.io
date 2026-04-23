// Shared domain types for Tonsup PM

export type ID = string;
export type ISODate = string;

export type Role = 'admin' | 'member' | 'viewer';

export interface AppConfig {
  /** GitHub owner of the data repo, e.g. "tonsup" */
  dataOwner: string;
  /** Repo name of the data repo, e.g. "pm-data" */
  dataRepo: string;
  /** Branch to read/write, default "main" */
  dataBranch: string;
  /** Admin GitHub usernames */
  admins: string[];
}

export interface UserProfile {
  id: ID;               // github login
  login: string;        // github login
  name?: string;
  email?: string;
  avatarUrl?: string;
  role: Role;
  skills?: string[];
  hourlyCost?: number;  // cost per hour in project currency
  bandwidthHoursPerWeek?: number;
  contact?: { phone?: string; slack?: string; line?: string };
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Project {
  id: ID;
  key: string;          // short code e.g. "PM"
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on-hold' | 'done' | 'cancelled';
  startDate?: ISODate;
  endDate?: ISODate;
  ownerId?: ID;
  memberIds: ID[];
  swimlanes: Swimlane[];
  // Financials
  currency?: string;         // e.g. "THB"
  revenueBudget?: number;
  costBudget?: number;
  planMarginPct?: number;
  // Scope / deliverables (free text for MVP; structured later)
  scope?: string;
  deliverables?: string[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Swimlane {
  id: ID;
  name: string;         // e.g. Backlog, To Do, In Progress, Review, Done
  wipLimit?: number;
  order: number;
  doneLane?: boolean;   // marks a terminal lane for progress calc
}

export interface Task {
  id: ID;
  projectId: ID;
  key: string;          // e.g. "PM-12"
  title: string;
  description?: string;
  laneId: ID;
  sprintId?: ID;
  assigneeIds: ID[];
  reporterId?: ID;
  storyPoints?: number;
  progressPct?: number;       // 0-100
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  labels?: string[];
  dependencies?: ID[];        // other task IDs blocking this one
  startDate?: ISODate;
  dueDate?: ISODate;
  estimateHours?: number;
  loggedHours?: number;
  expenses?: { note: string; amount: number; date: ISODate }[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Sprint {
  id: ID;
  projectId: ID;
  name: string;
  goal?: string;
  startDate: ISODate;
  endDate: ISODate;
  status: 'planned' | 'active' | 'closed';
}

export interface RiskItem {
  id: ID;
  projectId: ID;
  title: string;
  description?: string;
  kind: 'risk' | 'issue';
  category?: string;
  probability?: 1 | 2 | 3 | 4 | 5;
  impact?: 1 | 2 | 3 | 4 | 5;
  status: 'open' | 'mitigating' | 'accepted' | 'closed';
  ownerId?: ID;
  mitigation?: string;
  linkedIds?: ID[];     // other risks/issues
  linkedTaskIds?: ID[];
  progressPct?: number;
  updates?: { at: ISODate; by: ID; note: string }[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Stakeholder {
  id: ID;
  projectId: ID;
  name: string;
  organization?: string;
  role?: string;
  email?: string;
  phone?: string;
  type: 'sponsor' | 'customer' | 'user' | 'supplier' | 'regulator' | 'internal' | 'other';
  power?: 1 | 2 | 3 | 4 | 5;       // Power/Interest grid
  interest?: 1 | 2 | 3 | 4 | 5;
  expectations?: string;
  communicationPlan?: string;       // how/when to communicate
  strategy?: 'manage-closely' | 'keep-satisfied' | 'keep-informed' | 'monitor';
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ScheduleItem {
  id: ID;
  projectId: ID;
  taskId?: ID;          // optional link back to a Task
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  durationDays?: number;
  resourceIds?: ID[];
  dependencies?: ID[];
  progressPct?: number;
}

export interface ResourceAssignment {
  id: ID;
  projectId: ID;
  userId: ID;
  taskId?: ID;
  allocationPct?: number; // 0-100 of user bandwidth
  startDate?: ISODate;
  endDate?: ISODate;
}

/** Snapshot of a project file on disk */
export interface ProjectDB {
  project: Project;
  tasks: Task[];
  sprints: Sprint[];
  risks: RiskItem[];
  stakeholders: Stakeholder[];
  schedule: ScheduleItem[];
  assignments: ResourceAssignment[];
}
