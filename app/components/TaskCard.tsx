import React from 'react';
import type { TaskResponse } from '../types/task';

interface TaskCardProps {
  task: TaskResponse;
  onEdit: (task: TaskResponse) => void;
  onDelete: (id: number) => void;
}

export default function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  // Task එක undefined නම් මුකුත් නොපෙන්වා සිටීමට
  if (!task) return null;

  const getIcon = (title: string = '') => {
    const t = title.toLowerCase();
    if (t.includes('water') || t.includes('irrigation')) return '💧';
    if (t.includes('fertilizer') || t.includes('plant') || t.includes('seed')) return '🌱';
    if (t.includes('harvest') || t.includes('wheat') || t.includes('crop')) return '🌾';
    if (t.includes('tractor') || t.includes('plow')) return '🚜';
    return '📋'; 
  };

  const getPriorityStyles = (priority: string = '') => {
    switch (priority?.toUpperCase()) {
      case 'HIGH': return 'bg-red-500 text-white';
      case 'MEDIUM': return 'bg-orange-500 text-white';
      case 'LOW': return 'bg-emerald-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getStatusStyles = (status: string = '') => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'border-orange-500 text-orange-500';
      case 'IN_PROGRESS': return 'border-blue-500 text-blue-500';
      case 'COMPLETED': return 'border-emerald-500 text-emerald-500';
      default: return 'border-slate-400 text-slate-500';
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const tAny = task as any;
  const assigneeName = tAny.assigneeName || tAny.workerName || 'Unassigned';
  const fieldName = tAny.fieldName || 'No Field';
  const taskStatus = task.status || 'PENDING';

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 flex items-start gap-4 group">
      
      <div className="pt-1.5 shrink-0">
        <input 
          type="checkbox" 
          checked={taskStatus === 'COMPLETED'}
          readOnly
          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
        />
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getIcon(task.title)}</span>
          <h4 className="text-base font-bold text-slate-800">{task.title || 'Untitled Task'}</h4>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${getPriorityStyles(task.priority)}`}>
            {task.priority || 'LOW'}
          </span>
        </div>

        <p className="text-sm text-slate-500 line-clamp-2 pl-7">
          {task.description || 'No description provided.'}
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-2 pl-7 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#1e4638] text-white flex items-center justify-center text-[9px]">
              {getInitials(assigneeName)}
            </div>
            <span>{assigneeName}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDisplayDate(task.dueDate)}</span>
          </div>

          <div className="bg-green-50 text-green-700 px-2.5 py-0.5 rounded-md border border-green-100 font-bold">
            {fieldName}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end justify-between h-full min-h-[4.5rem] shrink-0">
        <span className={`px-3 py-0.5 rounded-full text-xs font-bold lowercase border bg-white ${getStatusStyles(taskStatus)}`}>
          {taskStatus.replace('_', '-').toLowerCase()}
        </span>

        <div className="flex items-center gap-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="Edit Task"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Delete Task"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}