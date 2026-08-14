import { PrismaClient, TaskPriority, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const hashedPassword = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@collabo.dev' },
    update: {},
    create: {
      name: 'Alex Admin',
      username: 'alexadmin',
      email: 'admin@collabo.dev',
      password: hashedPassword,
      emailVerified: true,
      bio: 'Full-stack developer and project lead',
      jobTitle: 'Engineering Lead',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alexadmin',
      notifPrefs: { create: {} },
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@collabo.dev' },
    update: {},
    create: {
      name: 'Maya Member',
      username: 'mayamember',
      email: 'member@collabo.dev',
      password: hashedPassword,
      emailVerified: true,
      bio: 'Frontend developer passionate about UX',
      jobTitle: 'Frontend Engineer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mayamember',
      notifPrefs: { create: {} },
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@collabo.dev' },
    update: {},
    create: {
      name: 'Sam Viewer',
      username: 'samviewer',
      email: 'viewer@collabo.dev',
      password: hashedPassword,
      emailVerified: true,
      jobTitle: 'Product Manager',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=samviewer',
      notifPrefs: { create: {} },
    },
  });

  console.log('✅ Users created');

  // Create project
  const project = await prisma.project.upsert({
    where: { id: 'seed-project-001' },
    update: {},
    create: {
      id: 'seed-project-001',
      name: 'Collabo Platform',
      description: 'Building the next-generation project management platform',
      status: 'ACTIVE',
      color: '#6366f1',
      startDate: new Date(),
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      ownerId: admin.id,
      members: {
        createMany: {
          data: [
            { userId: admin.id, role: 'OWNER' },
            { userId: member.id, role: 'MEMBER' },
            { userId: viewer.id, role: 'VIEWER' },
          ],
          skipDuplicates: true,
        },
      },
    },
  });

  console.log('✅ Project created');

  // Create labels
  const labels = await Promise.all([
    prisma.label.upsert({ where: { name_projectId: { name: 'Bug', projectId: project.id } }, update: {}, create: { name: 'Bug', color: '#ef4444', projectId: project.id } }),
    prisma.label.upsert({ where: { name_projectId: { name: 'Feature', projectId: project.id } }, update: {}, create: { name: 'Feature', color: '#22c55e', projectId: project.id } }),
    prisma.label.upsert({ where: { name_projectId: { name: 'Documentation', projectId: project.id } }, update: {}, create: { name: 'Documentation', color: '#3b82f6', projectId: project.id } }),
    prisma.label.upsert({ where: { name_projectId: { name: 'Frontend', projectId: project.id } }, update: {}, create: { name: 'Frontend', color: '#a855f7', projectId: project.id } }),
    prisma.label.upsert({ where: { name_projectId: { name: 'Backend', projectId: project.id } }, update: {}, create: { name: 'Backend', color: '#f97316', projectId: project.id } }),
  ]);

  // Create board
  const board = await prisma.board.upsert({
    where: { projectId: project.id },
    update: {},
    create: { projectId: project.id },
  });

  // Create columns
  const columnData = [
    { name: 'Backlog', order: 0 },
    { name: 'To Do', order: 1 },
    { name: 'In Progress', order: 2 },
    { name: 'Review', order: 3 },
    { name: 'Done', order: 4 },
  ];

  const columns: Array<{ id: string; name: string; order: number; boardId: string }> = [];
  for (const col of columnData) {
    const existing = await prisma.column.findFirst({ where: { boardId: board.id, name: col.name } });
    if (existing) {
      columns.push(existing);
    } else {
      const created = await prisma.column.create({ data: { ...col, boardId: board.id } });
      columns.push(created);
    }
  }

  const [backlog, todo, inProgress, review, done] = columns;

  console.log('✅ Board and columns created');

  // Create tasks
  const tasksData = [
    {
      title: 'Set up project infrastructure',
      description: '## Overview\n\nConfigure the monorepo with all required tooling.\n\n- Docker compose\n- TypeScript configs\n- ESLint + Prettier',
      columnId: done.id,
      priority: 'HIGH' as TaskPriority,
      status: 'DONE' as TaskStatus,
      order: 0,
      labelIds: [labels[4].id],
      assigneeIds: [admin.id],
    },
    {
      title: 'Design database schema',
      description: 'Create Prisma schema for all entities: Users, Projects, Tasks, Comments, Notifications...',
      columnId: done.id,
      priority: 'HIGH' as TaskPriority,
      status: 'DONE' as TaskStatus,
      order: 1,
      labelIds: [labels[4].id],
      assigneeIds: [admin.id],
    },
    {
      title: 'Implement authentication system',
      description: 'JWT-based auth with register/login/refresh/reset-password flows',
      columnId: inProgress.id,
      priority: 'URGENT' as TaskPriority,
      status: 'IN_PROGRESS' as TaskStatus,
      order: 0,
      labelIds: [labels[1].id, labels[4].id],
      assigneeIds: [admin.id, member.id],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Build Kanban board with drag-and-drop',
      description: 'Implement dnd-kit based drag-and-drop with optimistic updates and rollback',
      columnId: inProgress.id,
      priority: 'HIGH' as TaskPriority,
      status: 'IN_PROGRESS' as TaskStatus,
      order: 1,
      labelIds: [labels[1].id, labels[3].id],
      assigneeIds: [member.id],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Add WebSocket real-time updates',
      description: 'Socket.IO integration for live task updates, comments, and presence',
      columnId: todo.id,
      priority: 'HIGH' as TaskPriority,
      status: 'TODO' as TaskStatus,
      order: 0,
      labelIds: [labels[1].id, labels[4].id],
      assigneeIds: [admin.id],
    },
    {
      title: 'Design system and UI components',
      description: 'Build reusable component library with dark mode support',
      columnId: review.id,
      priority: 'MEDIUM' as TaskPriority,
      status: 'IN_REVIEW' as TaskStatus,
      order: 0,
      labelIds: [labels[3].id],
      assigneeIds: [member.id],
    },
    {
      title: 'Fix avatar upload bug',
      description: 'Avatar images are not persisting after page refresh',
      columnId: todo.id,
      priority: 'URGENT' as TaskPriority,
      status: 'TODO' as TaskStatus,
      order: 1,
      labelIds: [labels[0].id],
      assigneeIds: [member.id],
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Write API documentation',
      description: 'OpenAPI/Swagger documentation for all REST endpoints',
      columnId: backlog.id,
      priority: 'LOW' as TaskPriority,
      status: 'TODO' as TaskStatus,
      order: 0,
      labelIds: [labels[2].id],
      assigneeIds: [],
    },
  ];

  for (const taskData of tasksData) {
    const { labelIds, assigneeIds, ...rest } = taskData;
    const existing = await prisma.task.findFirst({
      where: { title: taskData.title, projectId: project.id },
    });
    if (!existing) {
      const task = await prisma.task.create({
        data: {
          ...rest,
          projectId: project.id,
          reporterId: admin.id,
          completedAt: rest.status === 'DONE' ? new Date() : undefined,
          assignees: assigneeIds.length
            ? { createMany: { data: assigneeIds.map((userId) => ({ userId })) } }
            : undefined,
          labels: labelIds.length
            ? { createMany: { data: labelIds.map((labelId) => ({ labelId })) } }
            : undefined,
        },
      });

      // Add subtasks to auth task
      if (task.title.includes('authentication')) {
        await prisma.subtask.createMany({
          data: [
            { title: 'Create user schema', completed: true, order: 0, taskId: task.id },
            { title: 'Implement registration endpoint', completed: true, order: 1, taskId: task.id },
            { title: 'Implement login endpoint', completed: true, order: 2, taskId: task.id },
            { title: 'Add JWT access + refresh tokens', completed: false, order: 3, taskId: task.id },
            { title: 'Add password reset flow', completed: false, order: 4, taskId: task.id },
          ],
        });

        // Add a comment
        await prisma.comment.create({
          data: {
            content: 'I\'ve completed the basic register and login flows. Working on refresh token rotation next. @mayamember can you review the user schema?',
            taskId: task.id,
            authorId: admin.id,
          },
        });
      }
    }
  }

  console.log('✅ Tasks, subtasks, and comments seeded');

  // Create some activities
  await prisma.activity.createMany({
    data: [
      {
        action: 'PROJECT_CREATED',
        description: 'Created project "Collabo Platform"',
        userId: admin.id,
        projectId: project.id,
      },
      {
        action: 'MEMBER_JOINED',
        description: 'Maya Member joined the project',
        userId: member.id,
        projectId: project.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Activities seeded');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nDemo accounts:');
  console.log('  admin@collabo.dev   / Password123!  (Owner)');
  console.log('  member@collabo.dev  / Password123!  (Member)');
  console.log('  viewer@collabo.dev  / Password123!  (Viewer)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
