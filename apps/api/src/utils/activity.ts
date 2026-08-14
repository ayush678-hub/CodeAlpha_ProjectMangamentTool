import prisma from '../lib/prisma';

interface ActivityParams {
  action: string;
  description: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export const createActivity = async (params: ActivityParams): Promise<void> => {
  try {
    await prisma.activity.create({
      data: {
        action: params.action,
        description: params.description,
        userId: params.userId,
        projectId: params.projectId,
        taskId: params.taskId,
        metadata: params.metadata as object | undefined,
      },
    });
  } catch (error) {
    // Don't let activity log failures break the main flow
    console.error('Failed to create activity log:', error);
  }
};
