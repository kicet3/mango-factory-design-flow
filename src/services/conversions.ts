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
 * 변환 작업 목록 조회 (사용자별)
 */
export async function fetchConversions(
  params: ConversionsListParams = {},
  accessToken?: string
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}/conversions/?${queryParams.toString()}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch conversions: ${response.statusText}`)
  }

  return response.json()
}

/**
 * 전체 변환 작업 목록 조회 (모든 사용자)
 */
export async function fetchAllConversions(
  params: ConversionsListParams = {},
  accessToken?: string
): Promise<ConversionsListResponse> {
  const {
    page = 1,
    page_size = 12,
    success_only = false
  } = params

  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: page_size.toString()
  })

  if (success_only) {
    queryParams.append('success_only', 'true')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}/conversions/all/list?${queryParams.toString()}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch all conversions: ${response.statusText}`)
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

// Materials Generation Types
export interface SubjectData {
  subject_name: string
  topic: string
  difficulty?: string
  learning_goals?: string[]
  examples?: Array<{
    question: string
    answer: string
  }>
  course_info?: {
    course_id: number
    course_type_id: number
    course_type_name: string
    grade_level_id: number
    grade_level_name: string
    difficulty_id: number
    expected_duration_min: number
    description?: string
    additional_message?: string
    course_material_scope?: {
      course_sections_index?: number  // 선택한 단원 인덱스
      course_weeks_indices?: number[]  // 선택한 차시 인덱스들
    }
  }
}

export interface GenerateMaterialsRequest {
  user_id: string
  course_id: number
  conversion_id: number
  component_id?: number
  subject_data: SubjectData
  class_duration_minutes?: number
  num_items?: number
  preserve_structure?: boolean
}

export interface GenerateMaterialsResponse {
  success: boolean
  message: string
  conversion_id: number
  component_id: number
  component_name: string
  original_prop_data_type: any
  original_sample_data: any
  generated_data: any
  num_items_generated: number
  generation_time: number
  gpt_model: string
  created_at: string
}

/**
 * 교과목 데이터를 기반으로 수업 자료 생성
 * POST /materials/generate
 */
export async function generateMaterials(
  request: GenerateMaterialsRequest,
  accessToken?: string
): Promise<GenerateMaterialsResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}/materials/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to generate materials: ${response.statusText}`)
  }

  return response.json()
}

export interface MaterialSummary {
  material_id: number
  material_name: string
  content_name?: string
  subject_name: string
  topic: string
  difficulty: string
  grade_level: string | null
  num_items_generated: number
  class_duration_minutes: number | null
  gpt_model: string
  created_at: string
  activity_type?: string[]
  lesson_style?: string[]
  competency?: string[]
  lesson_intro?: string
}

export interface MaterialsListResponse {
  total: number
  materials: MaterialSummary[]
}

export interface MaterialsListParams {
  limit?: number
  offset?: number
  order_by?: 'created_at' | 'updated_at' | 'material_name' | 'subject_name' | 'topic' | 'difficulty' | 'grade_level' | 'num_items_generated' | 'class_duration_minutes'
  order_dir?: 'ASC' | 'DESC'
}

/**
 * 전체 교재 목록 조회 (페이지네이션)
 * GET /materials/
 */
export async function fetchMaterials(
  params: MaterialsListParams = {},
  accessToken?: string
): Promise<MaterialsListResponse> {
  const {
    limit = 20,
    offset = 0,
    order_by = 'created_at',
    order_dir = 'DESC'
  } = params

  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    order_by,
    order_dir
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}/materials/?${queryParams.toString()}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to fetch materials: ${response.statusText}`)
  }

  return response.json()
}

export interface MaterialComponent {
  component_id: number
  component_name: string
  code: string
  imports: string[]
  styles: string
  layout_styles: any
  image_mapping: any
  prop_data_type: any
}

export interface MaterialDetail {
  material_id: number
  user_id: number
  conversion_id: number
  component_id: number | null
  conversion_type: string | null
  material_name: string
  subject_name: string
  topic: string
  difficulty: string
  grade_level: string | null
  subject_data: any
  generated_data: any
  num_items_generated: number
  layout_component_name: string | null
  prop_data_type: any
  original_sample_data: any
  class_duration_minutes: number | null
  generation_time: number | null
  gpt_model: string
  generation_metadata: any
  component: MaterialComponent | null
  generated_slides: Array<{
    data: any
    slide_number: number
    layout_component: string
    layout_description: string
  }>
  conversion?: {
    id: number
    content_name: string
    conversion_type: string
    components: Array<{
      id: number
      conversion_id: number
      component_name: string
      code: string
      imports: any
      props_interface: any
      styles: any
      layout_styles: any
      image_mapping: any
      prop_data_type: any
      used_by_slides: number[]
      order_index: number
      created_at: string
    }>
  }
  slides?: Array<{
    data: any
    slide_number: number
    layout_component: string
    layout_description: string
  }>
  created_at: string
  updated_at: string
}

/**
 * 교재 데이터 상세 조회
 * GET /materials/{material_id}
 */
export async function fetchMaterialDetail(
  materialId: number,
  accessToken?: string
): Promise<MaterialDetail> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}/materials/${materialId}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to fetch material detail: ${response.statusText}`)
  }

  return response.json()
}

export interface UpdateMaterialRequest {
  slide_data?: any
  text_styles?: any
  material_name?: string
  content_name?: string
}

export interface UpdateMaterialResponse {
  success: boolean
  message: string
  material_id: number
  updated_at: string
}

/**
 * 교재 데이터 수정
 * PATCH /materials/{material_id}
 */
export async function updateMaterial(
  materialId: number,
  updates: UpdateMaterialRequest,
  accessToken?: string
): Promise<UpdateMaterialResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}/materials/${materialId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to update material: ${response.statusText}`)
  }

  return response.json()
}

export interface DeleteMaterialResponse {
  success: boolean
  message: string
  material_id: number
}

/**
 * 교재 데이터 삭제
 * DELETE /materials/{material_id}
 */
export async function deleteMaterial(
  materialId: number,
  accessToken?: string
): Promise<DeleteMaterialResponse> {
  const headers: Record<string, string> = {}

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}/materials/${materialId}`, {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to delete material: ${response.statusText}`)
  }

  return response.json()
}
