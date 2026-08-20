import React, { useState, useEffect } from 'react';
import type { TaskRequest, TaskResponse, TaskPriority, TaskStatus } from '../types/task';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: TaskRequest, id?: number) => Promise<void>;
  taskToEdit?: TaskResponse | null;
}

export default function TaskModal({ isOpen, onClose, onSave, taskToEdit }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fieldId, setFieldId] = useState<number>(1);
  const [assigneeId, setAssigneeId] = useState<number>(1);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('PENDING');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setFieldId(taskToEdit.fieldId || 1);
      setAssigneeId(taskToEdit.assigneeId || 1);
      setPriority(taskToEdit.priority || 'MEDIUM');
      setStatus(taskToEdit.status || 'PENDING');
      setDueDate(taskToEdit.dueDate ? taskToEdit.dueDate.split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setFieldId(1);
      setAssigneeId(1);
      setPriority('MEDIUM');
      setStatus('PENDING');
      setDueDate(new Date().toISOString().split('T')[0]);
    }
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const taskData: TaskRequest = {
        title,
        description,
        fieldId: Number(fieldId),
        assigneeId: Number(assigneeId),
        priority,
        status,
        dueDate,
      };
      await onSave(taskData, taskToEdit ? taskToEdit.id : undefined);
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
        
        <div className="bg-[#1e4638] px-6 py-4 flex items-center justify-between text-white">
          <h3 className="text-lg font-bold">
            {taskToEdit ? 'Edit Task' : 'Create New Task'}
          </h3>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Task Title *</label>
            <input 
              type="text" 
              required
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Irrigation System Check" 
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4638] text-sm text-slate-800"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Description</label>
            <textarea 
              rows={3}
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this task..." 
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4638] text-sm text-slate-800 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Field ID *</label>
              <input 
                type="number" 
                required
                value={fieldId} 
                onChange={(e) => setFieldId(Number(e.target.value))}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4638] text-sm text-slate-800"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Assignee ID *</label>
              <input 
                type="number" 
                required
                value={assigneeId} 
                onChange={(e) => setAssigneeId(Number(e.target.value))}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4638] text-sm text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Priority</label>
              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4638] text-sm text-slate-800 bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Status</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4638] text-sm text-slate-800 bg-white"
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Due Date *</label>
            <input 
              type="date" 
              required
              value={dueDate} 
              onChange={(e) => setDueDate(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e4638] text-sm text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#1e4638] text-white font-bold text-sm hover:bg-[#16352a] transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : (taskToEdit ? 'Update Task' : 'Create Task')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}