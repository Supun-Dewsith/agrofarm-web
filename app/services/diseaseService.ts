import { fetchWithAuth } from '../utils/auth';
import type { DiseaseAnalysisResult } from '../types/disease';

export const analyzePlantImage = async (file: File): Promise<DiseaseAnalysisResult> => {
  const formData = new FormData();
  formData.append('file', file);

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