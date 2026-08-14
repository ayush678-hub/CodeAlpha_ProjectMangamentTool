import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/index';
import { toast } from '../../stores/uiStore';
import Modal from '../ui/Modal';
import { Input } from '../ui/Input';
import Button from '../ui/Button';
import type { Column } from '@collabo/types';

interface CreateTaskModalProps {
  projectId: string;
  defaultColumnId: string;
  columns: Column[];
  onClose: () => void;
}

interface CreateTaskForm {
  title: string;
  description: string;
  columnId: string;
  priority: string;
  dueDate: string;
}

export default function CreateTaskModal({ projectId, defaultColumnId, columns, onClose }: CreateTaskModalProps) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<CreateTaskForm>({
    defaultValues: {
      columnId: defaultColumnId,
      priority: 'MEDIUM',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTaskForm) =>
      tasksApi.create(projectId, {
        title: data.title,
        description: data.description || undefined,
        columnId: data.columnId,
        priority: data.priority,
        dueDate: data.dueDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      toast.success('Task created');
      onClose();
    },
    onError: () => toast.error('Failed to create task'),
  });

  return (
    <Modal isOpen onClose={onClose} title="Create Task" size="md">
      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}>
        <Modal.Body className="space-y-4">
          <Input
            {...register('title', { required: 'Title is required' })}
            label="Task Title"
            placeholder="What needs to be done?"
            error={errors.title?.message}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea
              {...register('description')}
              placeholder="Add more details..."
              className="input-base resize-none min-h-20"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Column</label>
              <select {...register('columnId')} className="input-base">
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Priority</label>
              <select {...register('priority')} className="input-base">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <Input
            {...register('dueDate')}
            label="Due Date"
            type="date"
          />
        </Modal.Body>

        <Modal.Footer>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={createMutation.isPending}>Create Task</Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
