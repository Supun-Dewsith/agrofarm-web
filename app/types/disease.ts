export interface BoundingBox {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] standard 0-1000 scale
  confidence: number;
  description: string;
}

export interface DiseaseAnalysisResult {
  id?: number;
  user_id?: number;
  image_url?: string;
  created_at?: string;
  plant_name: string;
  is_healthy: boolean;
  disease_name: string;
  overall_confidence: number;
  general_description: string;
  detected_spots: BoundingBox[];
  possible_treatments: string[];
  prevention_tips: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DiseaseChatResponse {
  answer: string;
}