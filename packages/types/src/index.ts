// ============================================================
// User Types
// ============================================================
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string | null;
  bio?: string | null;
  jobTitle?: string | null;
  timezone: string;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  notificationPreferences: NotificationPreferences;
}

export interface NotificationPreferences {
  emailOnTaskAssign: boolean;
  emailOnMention: boolean;
  emailOnComment: boolean;
  emailOnDeadline: boolean;
  emailOnProjectInvite: boolean;
  pushOnTaskAssign: boolean;
  pushOnMention: boolean;
  pushOnComment: boolean;
}

// ============================================================
// Auth Types
// ============================================================
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ============================================================
// Project Types
// ============================================================
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  color: string;
  icon?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  ownerId: string;
  owner: User;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
    members: number;
  };
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: UserRole;
  user: User;
  joinedAt: string;
}

// ============================================================
// Board / Column Types
// ============================================================
export interface Board {
  id: string;
  projectId: string;
  columns: Column[];
}

export interface Column {
  id: string;
  name: string;
  order: number;
  color?: string | null;
  boardId: string;
  tasks: Task[];
  createdAt: string;
}

// ============================================================
// Task Types
// ============================================================
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  columnId: string;
  projectId: string;
  reporterId: string;
  reporter: User;
  assignees: TaskAssignee[];
  labels: Label[];
  subtasks: Subtask[];
  attachments: Attachment[];
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  estimatedHours?: number | null;
  _count?: {
    comments: number;
    subtasks: number;
    attachments: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignee {
  userId: string;
  user: User;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
  taskId: string;
  createdAt: string;
}

// ============================================================
// Label Types
// ============================================================
export interface Label {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

// ============================================================
// Comment Types
// ============================================================
export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author: User;
  parentId?: string | null;
  replies?: Comment[];
  reactions: CommentReaction[];
  mentions: User[];
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
}

export interface CommentReaction {
  emoji: string;
  userId: string;
  user: User;
}

// ============================================================
// Attachment Types
// ============================================================
export interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  taskId: string;
  uploadedBy: User;
  createdAt: string;
}

// ============================================================
// Notification Types
// ============================================================
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_MENTION'
  | 'COMMENT_MENTION'
  | 'COMMENT_ADDED'
  | 'DEADLINE_APPROACHING'
  | 'TASK_STATUS_CHANGED'
  | 'PROJECT_INVITE'
  | 'TASK_OVERDUE'
  | 'MEMBER_JOINED'
  | 'INFO';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  userId: string;
  actorId?: string | null;
  actor?: User | null;
  projectId?: string | null;
  taskId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// ============================================================
// Activity Types
// ============================================================
export interface Activity {
  id: string;
  action: string;
  description: string;
  userId: string;
  user: User;
  projectId?: string | null;
  taskId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// ============================================================
// Invitation Types
// ============================================================
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  projectId: string;
  project: Project;
  invitedBy: User;
  expiresAt: string;
  createdAt: string;
}

// ============================================================
// API Response Types
// ============================================================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================
// WebSocket Event Types
// ============================================================
export type WsEventType =
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'task:moved'
  | 'task:assigned'
  | 'comment:added'
  | 'comment:edited'
  | 'comment:deleted'
  | 'column:created'
  | 'column:updated'
  | 'column:deleted'
  | 'column:reordered'
  | 'member:joined'
  | 'member:removed'
  | 'presence:update'
  | 'typing:start'
  | 'typing:stop'
  | 'notification:new';

export interface WsEvent<T = unknown> {
  type: WsEventType;
  projectId?: string;
  taskId?: string;
  userId: string;
  timestamp: string;
  payload: T;
}

export interface PresenceUser {
  userId: string;
  user: Pick<User, 'id' | 'name' | 'avatar'>;
  joinedAt: string;
}

// ============================================================
// Search Types
// ============================================================
export interface SearchResult {
  projects: Project[];
  tasks: Task[];
  users: User[];
}

// ============================================================
// Filter Types
// ============================================================
export interface TaskFilters {
  assigneeIds?: string[];
  priorities?: TaskPriority[];
  statuses?: TaskStatus[];
  labelIds?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}
