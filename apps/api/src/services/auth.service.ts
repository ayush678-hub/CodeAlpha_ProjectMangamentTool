import { v4 as uuidv4 } from 'uuid';
import { userRepository } from '../repositories/user.repository';
import { projectRepository } from '../repositories/project.repository';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendEmail, emailTemplates } from '../utils/email';
import { createError } from '../middleware/error';
import { env } from '../lib/env';
import prisma from '../lib/prisma';
import type { RegisterInput } from '../validators/auth.validator';

export const authService = {
  register: async (input: RegisterInput) => {
    const [existingEmail, existingUsername] = await Promise.all([
      userRepository.findByEmail(input.email),
      userRepository.findByUsername(input.username),
    ]);

    if (existingEmail) throw createError('Email already in use', 409, 'EMAIL_IN_USE');
    if (existingUsername) throw createError('Username already taken', 409, 'USERNAME_TAKEN');

    const hashedPassword = await hashPassword(input.password);
    const verifyToken = uuidv4();

    const user = await userRepository.create({
      name: input.name,
      username: input.username,
      email: input.email,
      password: hashedPassword,
      verifyToken,
      notifPrefs: { create: {} },
    });

    // Send verification email
    const verifyLink = `${env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
    const emailContent = emailTemplates.verifyEmail(input.name, verifyLink);
    await sendEmail({ to: input.email, ...emailContent });

    const tokens = await authService.generateTokenPair(user.id, user.email);

    return { user, ...tokens };
  },

  login: async (email: string, password: string) => {
    const user = await userRepository.findByEmail(email);
    if (!user) throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    if (user.status === 'SUSPENDED')
      throw createError('Account suspended', 403, 'ACCOUNT_SUSPENDED');

    const valid = await comparePassword(password, user.password);
    if (!valid) throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    // Strip password from return
    const { password: _, ...safeUser } = user;

    const tokens = await authService.generateTokenPair(user.id, user.email);
    return { user: safeUser, ...tokens };
  },

  logout: async (refreshToken: string) => {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });
  },

  refresh: async (refreshToken: string) => {
    const payload = verifyRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw createError('Invalid or expired refresh token', 401, 'TOKEN_INVALID');
    }

    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const user = await userRepository.findById(payload.userId);
    if (!user) throw createError('User not found', 401, 'UNAUTHORIZED');

    const tokens = await authService.generateTokenPair(user.id, user.email);
    return { user, ...tokens };
  },

  verifyEmail: async (token: string) => {
    const user = await userRepository.findByVerifyToken(token);
    if (!user) throw createError('Invalid verification token', 400, 'INVALID_TOKEN');

    await userRepository.update(user.id, {
      emailVerified: true,
      verifyToken: null,
    });
  },

  forgotPassword: async (email: string) => {
    const user = await userRepository.findByEmail(email);
    if (!user) return; // Don't leak whether email exists

    const resetToken = uuidv4();
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await userRepository.updateFull(user.id, { resetToken, resetTokenExp });

    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const emailContent = emailTemplates.resetPassword(user.name, resetLink);
    await sendEmail({ to: user.email, ...emailContent });
  },

  resetPassword: async (token: string, newPassword: string) => {
    const user = await userRepository.findByResetToken(token);
    if (!user || !user.resetTokenExp || user.resetTokenExp < new Date()) {
      throw createError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    const hashed = await hashPassword(newPassword);
    await userRepository.updateFull(user.id, {
      password: hashed,
      resetToken: null,
      resetTokenExp: null,
    });

    // Revoke all refresh tokens on password reset
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    });
  },

  changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await userRepository.findByIdFull(userId);
    if (!user) throw createError('User not found', 404, 'NOT_FOUND');

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) throw createError('Current password is incorrect', 400, 'INVALID_PASSWORD');

    const hashed = await hashPassword(newPassword);
    await userRepository.updateFull(userId, { password: hashed });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  },

  generateTokenPair: async (
    userId: string,
    email: string
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const accessToken = signAccessToken({ userId, email });
    const refreshTokenId = uuidv4();
    const refreshToken = signRefreshToken({ userId, tokenId: refreshTokenId });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.refreshToken.create({
      data: { id: refreshTokenId, token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  },

  acceptInvitation: async (token: string, userId: string) => {
    const invitation = await projectRepository.findInvitationByToken(token);

    if (!invitation) throw createError('Invitation not found', 404, 'NOT_FOUND');
    if (invitation.status !== 'PENDING')
      throw createError('Invitation is no longer valid', 400, 'INVITATION_INVALID');
    if (invitation.expiresAt < new Date())
      throw createError('Invitation has expired', 400, 'INVITATION_EXPIRED');

    // Add to project
    const member = await projectRepository.addMember(invitation.projectId, userId, invitation.role);
    await projectRepository.updateInvitation(invitation.id, { status: 'ACCEPTED' });

    return member;
  },
};
