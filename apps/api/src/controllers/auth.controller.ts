import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = registerSchema.parse(req.body);
      const result = await authService.register(input);
      sendSuccess(res, result, 201, 'Registration successful. Please verify your email.');
    } catch (e) { next(e); }
  },

  login: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input.email, input.password);
      sendSuccess(res, result, 200, 'Login successful');
    } catch (e) { next(e); }
  },

  logout: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      await authService.logout(refreshToken);
      sendSuccess(res, null, 200, 'Logged out successfully');
    } catch (e) { next(e); }
  },

  refresh: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const result = await authService.refresh(refreshToken);
      sendSuccess(res, result);
    } catch (e) { next(e); }
  },

  me: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { password: _, ...user } = req.user!;
      sendSuccess(res, { user });
    } catch (e) { next(e); }
  },

  verifyEmail: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.query as { token: string };
      await authService.verifyEmail(token);
      sendSuccess(res, null, 200, 'Email verified successfully');
    } catch (e) { next(e); }
  },

  forgotPassword: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      await authService.forgotPassword(email);
      sendSuccess(res, null, 200, 'If that email exists, a reset link has been sent.');
    } catch (e) { next(e); }
  },

  resetPassword: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      await authService.resetPassword(token, password);
      sendSuccess(res, null, 200, 'Password reset successfully');
    } catch (e) { next(e); }
  },

  changePassword: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      await authService.changePassword(req.userId!, currentPassword, newPassword);
      sendSuccess(res, null, 200, 'Password changed successfully');
    } catch (e) { next(e); }
  },

  acceptInvitation: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const member = await authService.acceptInvitation(token, req.userId!);
      sendSuccess(res, member, 200, 'Invitation accepted successfully');
    } catch (e) { next(e); }
  },
};
