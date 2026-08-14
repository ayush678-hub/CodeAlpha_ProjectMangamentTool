import { EventEmitter } from 'events';

export const eventEmitter = new EventEmitter();
eventEmitter.setMaxListeners(50);

export const AppEvents = {
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_MOVED: 'task:moved',
  TASK_ASSIGNED: 'task:assigned',
  TASK_STATUS_CHANGED: 'task:statusChanged',
  COMMENT_ADDED: 'comment:added',
  COMMENT_EDITED: 'comment:edited',
  COMMENT_DELETED: 'comment:deleted',
  USER_MENTIONED: 'user:mentioned',
  MEMBER_JOINED: 'member:joined',
  MEMBER_REMOVED: 'member:removed',
  COLUMN_CREATED: 'column:created',
  COLUMN_REORDERED: 'column:reordered',
  NOTIFICATION_CREATED: 'notification:created',
} as const;

export type AppEvent = (typeof AppEvents)[keyof typeof AppEvents];
