import api from './client';
import type { Project, ProjectMember, Board, Label, Invitation } from '@collabo/types';
import type { ProjectRole } from '@collabo/types';

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const res = await api.get('/projects');
    return res.data.data;
  },

  get: async (id: string): Promise<Project> => {
    const res = await api.get(`/projects/${id}`);
    return res.data.data;
  },

  create: async (data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    startDate?: string;
    dueDate?: string;
  }): Promise<Project> => {
    const res = await api.post('/projects', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<{
    name: string;
    description: string | null;
    status: string;
    color: string;
    icon: string | null;
    startDate: string | null;
    dueDate: string | null;
  }>): Promise<Project> => {
    const res = await api.patch(`/projects/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  getBoard: async (id: string): Promise<Project & { board: Board }> => {
    const res = await api.get(`/projects/${id}/board`);
    return res.data.data;
  },

  getMembers: async (id: string): Promise<ProjectMember[]> => {
    const res = await api.get(`/projects/${id}/members`);
    return res.data.data;
  },

  inviteMember: async (id: string, email: string, role: ProjectRole): Promise<Invitation> => {
    const res = await api.post(`/projects/${id}/invitations`, { email, role });
    return res.data.data;
  },

  updateMemberRole: async (projectId: string, userId: string, role: ProjectRole): Promise<void> => {
    await api.patch(`/projects/${projectId}/members/${userId}/role`, { role });
  },

  removeMember: async (projectId: string, userId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/members/${userId}`);
  },

  getLabels: async (id: string): Promise<Label[]> => {
    const res = await api.get(`/projects/${id}/labels`);
    return res.data.data;
  },

  createLabel: async (id: string, data: { name: string; color: string }): Promise<Label> => {
    const res = await api.post(`/projects/${id}/labels`, data);
    return res.data.data;
  },

  deleteLabel: async (projectId: string, labelId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/labels/${labelId}`);
  },

  getStats: async (id: string) => {
    const res = await api.get(`/projects/${id}/stats`);
    return res.data.data;
  },

  getActivity: async (id: string, page = 1) => {
    const res = await api.get(`/projects/${id}/activity?page=${page}`);
    return res.data;
  },

  createColumn: async (projectId: string, boardId: string, data: { name: string; color?: string }) => {
    const res = await api.post(`/projects/${projectId}/board/${boardId}/columns`, data);
    return res.data.data;
  },

  updateColumn: async (projectId: string, columnId: string, data: { name?: string; color?: string | null }) => {
    const res = await api.patch(`/projects/${projectId}/columns/${columnId}`, data);
    return res.data.data;
  },

  deleteColumn: async (projectId: string, columnId: string) => {
    await api.delete(`/projects/${projectId}/columns/${columnId}`);
  },

  reorderColumns: async (projectId: string, boardId: string, columnIds: string[]) => {
    await api.post(`/projects/${projectId}/boards/${boardId}/columns/reorder`, { columnIds });
  },
};
