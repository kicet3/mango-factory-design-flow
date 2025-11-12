export interface ConversionData {
  id: number;
  original_filename: string;
  content_name: string;
  description: string | null;
  file_type: string;
  source_type: string;
  conversion_type: string;
  framework: string;
  styling: string;
  success: boolean;
  total_components: number;
  total_slides: number;
  generation_time: number;
  created_at: string;
  lesson_title: string | null;
  activity_type: string | null;
  lesson_style: string | null;
  competency: string | null;
  lesson_intro: string | null;
  status: string;
  progress: number;
  current_step: string | null;
  error_message: string | null;
  job_id: string | null;
  // 추가 필드
  recommended_subjects?: string[]; // 추천과목
  teaching_styles?: string[]; // 수업 스타일
}

export interface ConversionsResponse {
  success: boolean;
  total: number;
  page: number;
  page_size: number;
  conversions: ConversionData[];
}
