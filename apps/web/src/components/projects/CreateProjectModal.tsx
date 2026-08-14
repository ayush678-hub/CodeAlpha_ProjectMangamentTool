import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects.api';
import { toast } from '../../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import { Input } from '../ui/Input';
import Button from '../ui/Button';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreateProjectForm {
  name: string;
  description: string;
  color: string;
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#a855f7', '#f43f5e',
];

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateProjectForm>({
    defaultValues: { color: '#6366f1' },
  });

  const selectedColor = watch('color');

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created!', project.name);
      onClose();
      navigate(`/projects/${project.id}/board`);
    },
    onError: () => toast.error('Failed to create project'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Project" size="md">
      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))}>
        <Modal.Body className="space-y-5">
          <Input
            {...register('name', { required: 'Project name is required' })}
            label="Project Name"
            placeholder="e.g. Product Redesign 2024"
            error={errors.name?.message}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea
              {...register('description')}
              placeholder="What is this project about?"
              className="input-base resize-none min-h-20"
              rows={3}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Project Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className="w-7 h-7 rounded-lg flex-shrink-0 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    ring: selectedColor === color ? `3px solid ${color}40` : 'none',
                    outline: selectedColor === color ? `2px solid ${color}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={createMutation.isPending}>Create Project</Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
