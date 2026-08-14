import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Filter, Search } from 'lucide-react';
import { projectsApi } from '../api/projects.api';
import { tasksApi } from '../api/index';
import { toast } from '../stores/uiStore';
import BoardColumn from '../components/board/BoardColumn';
import TaskCard from '../components/board/TaskCard';
import TaskModal from '../components/tasks/TaskModal';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import Button from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import type { Task, Column } from '@collabo/types';

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createInColumn, setCreateInColumn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['board', projectId],
    queryFn: () => projectsApi.getBoard(projectId!),
    enabled: !!projectId,
  });

  const columns = boardData?.board?.columns ?? [];
  const columnIds = columns.map((c) => c.id);

  const reorderTaskMutation = useMutation({
    mutationFn: (tasks: Array<{ id: string; order: number; columnId: string }>) =>
      tasksApi.reorder(tasks),
    onError: () => {
      // Rollback by re-fetching
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      toast.error('Failed to reorder tasks');
    },
  });

  // Build optimistic column state
  const [optimisticColumns, setOptimisticColumns] = useState<Column[] | null>(null);
  const displayColumns = optimisticColumns ?? columns;

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'task') {
      setActiveTask(active.data.current.task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'task' && overType === 'column') {
      // Move task to empty column
      const activeTask = active.data.current?.task as Task;
      const overColumnId = over.id as string;

      if (activeTask.columnId === overColumnId) return;

      setOptimisticColumns((prev) => {
        const cols = prev ?? columns;
        return cols.map((col) => {
          if (col.id === activeTask.columnId) {
            return { ...col, tasks: col.tasks.filter((t) => t.id !== activeTask.id) };
          }
          if (col.id === overColumnId) {
            return { ...col, tasks: [...col.tasks, { ...activeTask, columnId: overColumnId }] };
          }
          return col;
        });
      });
    }

    if (activeType === 'task' && overType === 'task') {
      const activeTaskData = active.data.current?.task as Task;
      const overTaskData = over.data.current?.task as Task;

      if (activeTaskData.id === overTaskData.id) return;

      setOptimisticColumns((prev) => {
        const cols = prev ?? columns;
        const activeColIdx = cols.findIndex((c) => c.id === activeTaskData.columnId);
        const overColIdx = cols.findIndex((c) => c.id === overTaskData.columnId);

        if (activeColIdx === -1 || overColIdx === -1) return cols;

        const newCols = [...cols];

        if (activeColIdx === overColIdx) {
          // Same column — reorder
          const tasks = [...newCols[activeColIdx].tasks];
          const aIdx = tasks.findIndex((t) => t.id === activeTaskData.id);
          const oIdx = tasks.findIndex((t) => t.id === overTaskData.id);
          newCols[activeColIdx] = {
            ...newCols[activeColIdx],
            tasks: arrayMove(tasks, aIdx, oIdx),
          };
        } else {
          // Cross-column move
          const fromTasks = newCols[activeColIdx].tasks.filter((t) => t.id !== activeTaskData.id);
          const toTasks = [...newCols[overColIdx].tasks];
          const oIdx = toTasks.findIndex((t) => t.id === overTaskData.id);
          toTasks.splice(oIdx, 0, { ...activeTaskData, columnId: overTaskData.columnId });
          newCols[activeColIdx] = { ...newCols[activeColIdx], tasks: fromTasks };
          newCols[overColIdx] = { ...newCols[overColIdx], tasks: toTasks };
        }

        return newCols;
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !optimisticColumns) {
      setOptimisticColumns(null);
      return;
    }

    // Commit optimistic state to server
    const tasksToUpdate: Array<{ id: string; order: number; columnId: string }> = [];
    optimisticColumns.forEach((col) => {
      col.tasks.forEach((task, idx) => {
        tasksToUpdate.push({ id: task.id, order: idx, columnId: col.id });
      });
    });

    // Apply optimistic state permanently before API call
    queryClient.setQueryData(['board', projectId], (old: typeof boardData) => {
      if (!old?.board) return old;
      return { ...old, board: { ...old.board, columns: optimisticColumns } };
    });
    setOptimisticColumns(null);

    reorderTaskMutation.mutate(tasksToUpdate);
  };

  const handleCreateTask = (columnId: string) => {
    setCreateInColumn(columnId);
    setShowCreateTask(true);
  };

  const filteredColumns = displayColumns.map((col) => ({
    ...col,
    tasks: col.tasks.filter(
      (t) =>
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  }));

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="kanban-column p-3 space-y-3 flex-shrink-0">
            <Skeleton className="h-6 w-24" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-24 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Board toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-base pl-8 h-8 text-xs w-48"
            />
          </div>
          <Button variant="secondary" size="sm" icon={Filter}>
            Filters
          </Button>
        </div>
        <Button size="sm" icon={Plus} onClick={() => handleCreateTask(columns[1]?.id ?? columns[0]?.id)}>
          Add Task
        </Button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
              {filteredColumns.map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  onAddTask={() => handleCreateTask(column.id)}
                  onTaskClick={(task) => setSelectedTask(task)}
                />
              ))}
            </SortableContext>

            {/* Add column button */}
            <button
              className="kanban-column h-12 justify-center items-center flex text-slate-500 hover:text-slate-300 hover:border-white/15 transition-all flex-shrink-0 gap-2 text-sm px-4"
              onClick={() => {/* TODO: add column modal */}}
            >
              <Plus className="w-4 h-4" />
              Add column
            </button>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeTask && (
              <div className="opacity-90 rotate-2 scale-105">
                <TaskCard task={activeTask} onClick={() => {}} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskModal
          taskId={selectedTask.id}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Create task modal */}
      {showCreateTask && createInColumn && (
        <CreateTaskModal
          projectId={projectId!}
          defaultColumnId={createInColumn}
          columns={columns}
          onClose={() => {
            setShowCreateTask(false);
            setCreateInColumn(null);
          }}
        />
      )}
    </div>
  );
}
