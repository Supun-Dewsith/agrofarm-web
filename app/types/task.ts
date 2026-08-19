export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface TaskRequest {
  title: string;
  description?: string;
  fieldId: number;
  assigneeId: number;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
}

export interface TaskResponse {
  id: number;
  title: string;
  description?: string;
  fieldId?: number;
  fieldName?: string;
  assigneeId?: number;
  assigneeName?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
}

export interface TaskStats {
  totalTasks: number;
  pending: number;
  inProgress: number;
  completed: number;
}