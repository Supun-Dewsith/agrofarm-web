import { fetchWithAuth } from '../utils/auth';
import type { DiseaseAnalysisResult , ChatMessage , DiseaseChatResponse } from '../types/disease';

export const analyzePlantImage = async (file: File, language: string = 'en'): Promise<DiseaseAnalysisResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', language);

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