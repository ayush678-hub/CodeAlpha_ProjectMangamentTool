import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import {
  createProjectSchema,
  updateProjectSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  createColumnSchema,
  updateColumnSchema,
  reorderColumnsSchema,
  createLabelSchema,
  updateLabelSchema,
} from '../validators/project.validator';

export const projectController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projects = await projectService.getUserProjects(req.userId!);
      sendSuccess(res, projects);
    } catch (e) { next(e); }
  },

  get: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const project = await projectService.getProject(req.params.id, req.userId!);
      sendSuccess(res, project);
    } catch (e) { next(e); }
  },

  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = createProjectSchema.parse(req.body);
      const project = await projectService.createProject(req.userId!, input);
      sendSuccess(res, project, 201);
    } catch (e) { next(e); }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = updateProjectSchema.parse(req.body);
      const project = await projectService.updateProject(req.params.id, req.userId!, input);
      sendSuccess(res, project);
    } catch (e) { next(e); }
  },

  delete: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await projectService.deleteProject(req.params.id);
      sendSuccess(res, null, 200, 'Project deleted');
    } catch (e) { next(e); }
  },

  getBoard: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const project = await projectService.getBoard(req.params.id, req.userId!);
      sendSuccess(res, project);
    } catch (e) { next(e); }
  },

  // Columns
  createColumn: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, color } = createColumnSchema.parse(req.body);
      const { boardId } = req.params;
      const column = await projectService.createColumn(boardId, name, color);
      sendSuccess(res, column, 201);
    } catch (e) { next(e); }
  },

  updateColumn: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = updateColumnSchema.parse(req.body);
      const column = await projectService.updateColumn(req.params.columnId, data);
      sendSuccess(res, column);
    } catch (e) { next(e); }
  },

  deleteColumn: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await projectService.deleteColumn(req.params.columnId);
      sendSuccess(res, null, 200, 'Column deleted');
    } catch (e) { next(e); }
  },

  reorderColumns: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { columnIds } = reorderColumnsSchema.parse(req.body);
      await projectService.reorderColumns(req.params.boardId, columnIds);
      sendSuccess(res, null, 200, 'Columns reordered');
    } catch (e) { next(e); }
  },

  // Members
  getMembers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const members = await projectService.getMembers(req.params.id);
      sendSuccess(res, members);
    } catch (e) { next(e); }
  },

  inviteMember: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, role } = inviteMemberSchema.parse(req.body);
      const invitation = await projectService.inviteMember(req.params.id, req.userId!, email, role);
      sendSuccess(res, invitation, 201, 'Invitation sent');
    } catch (e) { next(e); }
  },

  updateMemberRole: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role } = updateMemberRoleSchema.parse(req.body);
      await projectService.updateMemberRole(req.params.id, req.params.userId, role);
      sendSuccess(res, null, 200, 'Member role updated');
    } catch (e) { next(e); }
  },

  removeMember: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await projectService.removeMember(req.params.id, req.params.userId, req.userId!);
      sendSuccess(res, null, 200, 'Member removed');
    } catch (e) { next(e); }
  },

  // Labels
  getLabels: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const labels = await projectService.getLabels(req.params.id);
      sendSuccess(res, labels);
    } catch (e) { next(e); }
  },

  createLabel: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, color } = createLabelSchema.parse(req.body);
      const label = await projectService.createLabel(req.params.id, name, color);
      sendSuccess(res, label, 201);
    } catch (e) { next(e); }
  },

  updateLabel: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = updateLabelSchema.parse(req.body);
      const label = await projectService.updateLabel(req.params.labelId, data);
      sendSuccess(res, label);
    } catch (e) { next(e); }
  },

  deleteLabel: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await projectService.deleteLabel(req.params.labelId);
      sendSuccess(res, null, 200, 'Label deleted');
    } catch (e) { next(e); }
  },

  // Stats & Activity
  getStats: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await projectService.getStats(req.params.id);
      sendSuccess(res, stats);
    } catch (e) { next(e); }
  },

  getActivity: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const activity = await projectService.getActivity(req.params.id, page, limit);
      sendPaginated(res, activity, activity.length, page, limit);
    } catch (e) { next(e); }
  },
};
