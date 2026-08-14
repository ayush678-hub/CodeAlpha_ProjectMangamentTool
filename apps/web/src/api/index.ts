import api from './client';
import type { Task, Comment, Notification, User } from '@collabo/types';

// ============================================================
// TASKS
// ============================================================
export const tasksApi = {
  list: async (projectId: string, params?: Record<string, string>): Promise<{ data: Task[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> => {
    const res = await api.get(`/projects/${projectId}/tasks`, { params });
    return res.data;
  },

  get: async (id: string): Promise<Task> => {
    const res = await api.get(`/tasks/${id}`);
    return res.data.data;
  },

  create: async (projectId: string, data: {
    title: string;
    description?: string;
    columnId: string;
    priority?: string;
    assigneeIds?: string[];
    labelIds?: string[];
    dueDate?: string;
  }): Promise<Task> => {
    const res = await api.post(`/projects/${projectId}/tasks`, data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<{
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assigneeIds: string[];
    labelIds: string[];
    dueDate: string | null;
    estimatedHours: number | null;
    archived: boolean;
  }>): Promise<Task> => {
    const res = await api.patch(`/tasks/${id}`, data);
    return res.data.data;
  },

  move: async (id: string, columnId: string, order: number): Promise<Task> => {
    const res = await api.patch(`/tasks/${id}/move`, { columnId, order });
    return res.data.data;
  },

  reorder: async (tasks: Array<{ id: string; order: number; columnId: string }>): Promise<void> => {
    await api.post('/tasks/reorder', { tasks });
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  duplicate: async (id: string): Promise<Task> => {
    const res = await api.post(`/tasks/${id}/duplicate`);
    return res.data.data;
  },

  // Subtasks
  createSubtask: async (taskId: string, title: string) => {
    const res = await api.post(`/tasks/${taskId}/subtasks`, { title });
    return res.data.data;
  },

  updateSubtask: async (taskId: string, subtaskId: string, data: { title?: string; completed?: boolean }) => {
    const res = await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, data);
    return res.data.data;
  },

  deleteSubtask: async (taskId: string, subtaskId: string) => {
    await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
  },

  // Attachments
  uploadAttachment: async (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  deleteAttachment: async (taskId: string, attachmentId: string) => {
    await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
  },

  // Time entries
  addTimeEntry: async (taskId: string, data: { hours: number; description?: string }) => {
    const res = await api.post(`/tasks/${taskId}/time-entries`, data);
    return res.data.data;
  },

  getTimeEntries: async (taskId: string) => {
    const res = await api.get(`/tasks/${taskId}/time-entries`);
    return res.data.data;
  },

  getCalendar: async (projectId: string, startDate: string, endDate: string): Promise<Task[]> => {
    const res = await api.get(`/projects/${projectId}/calendar`, {
      params: { startDate, endDate },
    });
    return res.data.data;
  },
};

// ============================================================
// COMMENTS
// ============================================================
export const commentsApi = {
  list: async (taskId: string): Promise<Comment[]> => {
    const res = await api.get(`/tasks/${taskId}/comments`);
    return res.data.data;
  },

  create: async (taskId: string, data: { content: string; parentId?: string; mentionIds?: string[] }): Promise<Comment> => {
    const res = await api.post(`/tasks/${taskId}/comments`, data);
    return res.data.data;
  },

  update: async (id: string, content: string): Promise<Comment> => {
    const res = await api.patch(`/comments/${id}`, { content });
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/comments/${id}`);
  },

  toggleReaction: async (id: string, emoji: string) => {
    const res = await api.post(`/comments/${id}/reactions`, { emoji });
    return res.data.data;
  },
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationsApi = {
  list: async (page = 1): Promise<{ notifications: Notification[]; unreadCount: number }> => {
    const res = await api.get(`/notifications?page=${page}`);
    return res.data.data;
  },

  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};

// ============================================================
// USERS
// ============================================================
export const usersApi = {
  getProfile: async (id: string): Promise<User> => {
    const res = await api.get(`/users/${id}`);
    return res.data.data;
  },

  updateProfile: async (data: Partial<{ name: string; bio: string; jobTitle: string; timezone: string }>) => {
    const res = await api.patch('/users/me', data);
    return res.data.data;
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  searchUsers: async (q: string, exclude?: string): Promise<User[]> => {
    const res = await api.get('/users/search', { params: { q, exclude } });
    return res.data.data;
  },

  getNotifPrefs: async () => {
    const res = await api.get('/users/me/notification-prefs');
    return res.data.data;
  },

  updateNotifPrefs: async (prefs: Record<string, boolean>) => {
    const res = await api.patch('/users/me/notification-prefs', prefs);
    return res.data.data;
  },
};

// ============================================================
// SEARCH
// ============================================================
export const searchApi = {
  search: async (q: string) => {
    const res = await api.get('/search', { params: { q } });
    return res.data.data;
  },
};
