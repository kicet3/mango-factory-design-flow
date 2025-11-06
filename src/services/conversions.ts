// Conversions API Service

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://127.0.0.1:8000'

export interface ConversionSummary {
  id: number
  original_filename: string
  content_name: string
  description: string
  file_type: string
  source_type: string
  conversion_type: string
  framework: string
  styling: string
  success: boolean
  total_components: number
  total_slides: number
  generation_time: number
  created_at: string
}

export interface ConversionsListResponse {
  success: boolean
  total: number
  page: number
  page_size: number
  conversions: ConversionSummary[]
}

export interface ConversionsListParams {
  page?: number
  page_size?: number
  user_id?: string
  success_only?: boolean
}

export interface Component {
  id: number
  conversion_id?: number
  component_name: string
  component_type?: string
  code: string  // ← component_code가 아니라 code
  component_code?: string  // 하위 호환성을 위해 유지
  file_path?: string
  dependencies?: string[]
  props_interface?: string
  imports?: string[]
  styles?: any
  layout_styles?: any
  image_mapping?: any
  prop_data_type?: any
  used_by_slides?: number[]
  order_index?: number
  created_at: string
}

export interface Slide {
  id: number
  conversion_id?: number
  slide_number: number
  slide_title?: string
  slide_content?: string
  layout_component?: string
  data?: Record<string, any>  // ← 슬라이드 데이터 (컴포넌트에 props로 전달)
  layout_description?: string
  component_references?: string[]
  slide_metadata?: Record<string, any>
  created_at: string
}

export interface ConversionDetail {
  id: number
  user_id: number
  session_id: number
  original_filename: string
  content_name: string
  description: string
  file_type: string
  file_size: number
  source_type: string
  conversion_type: string
  framework: string
  styling: string
  conversion_mode: string
  success: boolean
  message: string
  generation_time: number
  total_components: number
  total_slides: number
  conversion_metadata: Record<string, any>
  created_at: string
  updated_at: string
  components: Component[]
  slides: Slide[]
}

/**
 * 변환 작업 목록 조회
 */
export async function fetchConversions(
  params: ConversionsListParams = {}
): Promise<ConversionsListResponse> {
  const {
    page = 1,
    page_size = 12,
    user_id,
    success_only = false
  } = params

  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: page_size.toString(),
    success_only: success_only.toString()
  })

  if (user_id) {
    queryParams.append('user_id', user_id)
  }

  const response = await fetch(`${API_BASE_URL}/conversions/?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch conversions: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 변환 작업 상세 조회
 */
export async function fetchConversionDetail(
  conversionId: number | string
): Promise<ConversionDetail> {
  const response = await fetch(`${API_BASE_URL}/conversions/${conversionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch conversion detail: ${response.statusText}`)
  }

  return response.json()
}
