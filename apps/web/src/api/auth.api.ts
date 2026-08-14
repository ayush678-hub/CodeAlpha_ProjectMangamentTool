import api from './client';
import type { AuthResponse, LoginInput, RegisterInput } from '@collabo/types';

export const authApi = {
  register: async (data: RegisterInput): Promise<AuthResponse> => {
    const res = await api.post('/auth/register', data);
    return res.data.data;
  },

  login: async (data: LoginInput): Promise<AuthResponse> => {
    const res = await api.post('/auth/login', data);
    return res.data.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },

  me: async () => {
    const res = await api.get('/auth/me');
    return res.data.data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, password });
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword });
  },

  verifyEmail: async (token: string): Promise<void> => {
    await api.get(`/auth/verify-email?token=${token}`);
  },

  acceptInvitation: async (token: string) => {
    const res = await api.post(`/invitations/${token}/accept`);
    return res.data.data;
  },
};
