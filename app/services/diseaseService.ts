import { fetchWithAuth } from '../utils/auth';
import type { DiseaseAnalysisResult, ChatMessage, DiseaseChatResponse } from '../types/disease';

export const analyzePlantImage = async (file: File, language: string = 'en', crop?: string): Promise<DiseaseAnalysisResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', language);
  if (crop && crop.trim()) {
    formData.append('crop', crop.trim());
  }

  // Send request ensuring NO Content-Type header is pre-set
  const response = await fetchWithAuth('/api/disease/analyze', {
    method: 'POST',
    body: formData,
    headers: {
      // Intentionally empty — DO NOT specify Content-Type here
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to analyze plant image');
  }

  return response.json();
};

export const askAboutDetection = async (
  question: string,
  analysis: DiseaseAnalysisResult | undefined,
  history: ChatMessage[],
  language: string = 'en'
): Promise<DiseaseChatResponse> => {
  const response = await fetchWithAuth('/api/disease/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, analysis: analysis ?? null, history, language }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Chat request failed');
  }

  return response.json();
};

export const getRecentDetections = async (limit: number = 20): Promise<DiseaseAnalysisResult[]> => {
  const response = await fetchWithAuth(`/api/disease/history?limit=${limit}`);

  if (!response.ok) {
    return [];
  }

  return response.json();
};

export const linkDetectionToPlot = async (
  detectionId: number,
  farmId: number,
  fieldId: number
): Promise<{ success: boolean; message: string }> => {
  const response = await fetchWithAuth(`/api/disease/${detectionId}/link-plot`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ farmId, fieldId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to log detection to plot history');
  }

  return response.json();
};

export const createRemediationTask = async (taskPayload: {
  title: string;
  description: string;
  farmId?: number;
  fieldId?: number;
  supervisorId?: number;
  workerIds?: number[];
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}): Promise<any> => {
  const response = await fetchWithAuth('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to create remediation task');
  }

  return response.json();
};

export const getTaskOptions = async (farmId?: number): Promise<{
  farms: Array<{ id: number; name: string }>;
  fields: Array<{ id: number; name: string }>;
  supervisors: Array<{ id: number; name: string }>;
  workers: Array<{ id: number; name: string }>;
}> => {
  const query = farmId ? `?farmId=${farmId}` : '';
  const response = await fetchWithAuth(`/api/tasks/options${query}`);

  if (!response.ok) {
    return { farms: [], fields: [], supervisors: [], workers: [] };
  }

  return response.json();
};