import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(10000),
  parentId: z.string().optional(),
  mentionIds: z.array(z.string()).default([]),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(10000),
});

export const addReactionSchema = z.object({
  emoji: z
    .string()
    .min(1)
    .max(10)
    .regex(/\p{Emoji}/u, 'Must be an emoji'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
