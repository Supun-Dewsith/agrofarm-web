export interface BoundingBox {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] standard 0-1000 scale
  confidence: number;
  description: string;
}

export interface IpmTreatmentItem {
  category: string; // 'Organic & Biological' | 'Chemical Intervention' | 'Cultural & Mechanical'
  method: string;
  dosage_and_timing: string;
  phi_interval?: string;
}

export interface ClassProbability {
  name: string;
  probability: number;
}

export interface LifeCycleStage {
  stage_name: string;
  duration: string;
  description: string;
}

export interface DiseaseAnalysisResult {
  id?: number;
  user_id?: number;
  farm_id?: number;
  field_id?: number;
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

  // 1. Biological & Pathogen Profile
  pathogen_type?: string;
  scientific_name?: string;
  optimal_temperature?: string;
  humidity_level?: string;
  weather_correlation?: string;
  life_cycle_stages?: LifeCycleStage[];

  // 2. Yield & Economic Impact Forecast
  yield_loss_risk?: string;
  yield_loss_percentage?: number;
  spread_speed?: string;
  harvest_impact?: string;

  // 3. Integrated Pest Management (IPM) Matrix
  ipm_matrix?: IpmTreatmentItem[];

  // 4. Multi-class Probability Distribution
  probability_distribution?: ClassProbability[];

  // 5. Reference Specimen URL / Flag
  reference_image_url?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DiseaseChatResponse {
  answer: string;
}