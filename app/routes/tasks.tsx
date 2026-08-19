import React, { useState, useEffect } from 'react';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import { taskService } from '../services/taskService';
import type { TaskResponse, TaskRequest } from '../types/task';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskResponse | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.getAllTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
      setError('Failed to load tasks from backend. Please ensure Spring Boot is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSaveTask = async (taskData: TaskRequest, id?: number) => {
    try {
      if (id) {
        await taskService.updateTask(id, taskData);
      } else {
        await taskService.createTask(taskData);
      }
      await fetchTasks();
    } catch (err) {
      console.error('Error saving task:', err);
      alert('Failed to save task.');
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskService.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task.');
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (!task) return false;
    const status = task.status ? task.status.toUpperCase() : 'PENDING';
    if (activeTab === 'PENDING') return status === 'PENDING';
    if (activeTab === 'IN_PROGRESS') return status === 'IN_PROGRESS';
    if (activeTab === 'COMPLETED') return status === 'COMPLETED';
    return true;
  });

  const totalTasks = tasks.length;
  const pendingCount = tasks.filter(t => t && t.status?.toUpperCase() === 'PENDING').length;
  const inProgressCount = tasks.filter(t => t && t.status?.toUpperCase() === 'IN_PROGRESS').length;
  const completedCount = tasks.filter(t => t && t.status?.toUpperCase() === 'COMPLETED').length;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 bg-slate-50 min-h-screen">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Task Management</h1>
          <p className="text-sm text-slate-500">Assign and track farm activities</p>
        </div>
        <button
          onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }}
          className="bg-[#1e4638] hover:bg-[#16352a] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <span>+ Create Task</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tasks</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{totalTasks}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">📋</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</p>
            <h3 className="text-2xl font-black text-orange-500 mt-1">{pendingCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-bold">⏳</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
            <h3 className="text-2xl font-black text-blue-500 mt-1">{inProgressCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold">⚡</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed</p>
            <h3 className="text-2xl font-black text-emerald-500 mt-1">{completedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center font-bold">✅</div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-800">All Tasks</h2>
          
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${activeTab === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${activeTab === 'PENDING' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('IN_PROGRESS')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${activeTab === 'IN_PROGRESS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              In Progress
            </button>
            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${activeTab === 'COMPLETED' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Loading / Content */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-medium">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium">No tasks found.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredTasks.map((task, index) => (
              task ? (
                <TaskCard
                  key={task.id || index}
                  task={task}
                  onEdit={(t) => { setTaskToEdit(t); setIsModalOpen(true); }}
                  onDelete={handleDeleteTask}
                />
              ) : null
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        taskToEdit={taskToEdit}
      />

    </div>
  );
}