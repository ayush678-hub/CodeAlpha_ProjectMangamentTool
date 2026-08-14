import { Request, Response, NextFunction } from 'express';
import { userRepository } from '../repositories/user.repository';
import { sendSuccess } from '../utils/response';
import { createError } from '../middleware/error';
import { updateProfileSchema } from '../validators/auth.validator';
import { uploadToCloudinary } from '../middleware/upload';
import { delCache, CACHE_KEYS } from '../lib/redis';

export const userController = {
  getProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await userRepository.findById(id);
      if (!user) throw createError('User not found', 404, 'NOT_FOUND');
      sendSuccess(res, user);
    } catch (e) { next(e); }
  },

  updateProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = updateProfileSchema.parse(req.body);
      const user = await userRepository.update(req.userId!, input);
      await delCache(CACHE_KEYS.userProfile(req.userId!));
      sendSuccess(res, user, 200, 'Profile updated');
    } catch (e) { next(e); }
  },

  uploadAvatar: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) throw createError('No file uploaded', 400, 'NO_FILE');
      const result = await uploadToCloudinary(req.file.buffer, 'collabo/avatars', 'image');
      const user = await userRepository.update(req.userId!, { avatar: result.url });
      await delCache(CACHE_KEYS.userProfile(req.userId!));
      sendSuccess(res, user, 200, 'Avatar updated');
    } catch (e) { next(e); }
  },

  getNotifPrefs: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const prefs = await userRepository.getNotifPrefs(req.userId!);
      sendSuccess(res, prefs);
    } catch (e) { next(e); }
  },

  updateNotifPrefs: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const prefs = await userRepository.upsertNotifPrefs(req.userId!, req.body);
      sendSuccess(res, prefs, 200, 'Notification preferences updated');
    } catch (e) { next(e); }
  },

  searchUsers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { q, exclude } = req.query as { q?: string; exclude?: string };
      const excludeIds = exclude ? exclude.split(',') : [];
      const users = await userRepository.searchUsers(q ?? '', excludeIds);
      sendSuccess(res, users);
    } catch (e) { next(e); }
  },
};
