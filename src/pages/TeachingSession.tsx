// TeachingSession - 수업하기 페이지 (React 코드 실행 with 두 가지 모드)
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  Presentation,
  List
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchMaterialDetail, type MaterialDetail } from "@/services/conversions"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"

type ViewMode = 'slide' | 'basic'

// MaterialDetail을 기존 ConversionDetail 형식으로 변환하는 어댑터
interface ConversionDetail {
  id: number
  content_name: string
  conversion_type?: string
  components: Array<{
    id: number
    component_name: string
    code?: string
    component_code?: string
  }>
  slides: Array<{
    id: number
    slide_number: number
    slide_title?: string
    slide_content?: string
    layout_component?: string
    data?: Record<string, any>
  }>
}

function adaptMaterialToConversion(material: MaterialDetail): ConversionDetail {
  // API 응답에 conversion과 slides가 이미 있는 경우 사용
  if (material.conversion && material.slides) {
    return {
      id: material.material_id,
      content_name: material.conversion.content_name || material.material_name,
      conversion_type: material.conversion.conversion_type,
      components: material.conversion.components || [],
      slides: material.slides.map(slide => ({
        id: slide.slide_number,
        slide_number: slide.slide_number,
        slide_title: material.material_name,
        slide_content: slide.layout_description,
        layout_component: slide.layout_component,
        data: slide.data
      }))
    }
  }

  // generated_data를 슬라이드로 변환 (fallback)
  const slides = material.generated_data && Array.isArray(material.generated_data)
    ? material.generated_data.map((item, index) => ({
        id: index + 1,
        slide_number: index + 1,
        slide_title: material.material_name,
        slide_content: `${material.subject_name} - ${material.topic}`,
        layout_component: item.layout_component || material.layout_component_name,
        data: item.data
      }))
    : []

  return {
    id: material.material_id,
    content_name: material.conversion?.content_name || material.material_name,
    conversion_type: material.conversion_type || 'basic',
    components: material.component ? [{
      id: material.component.component_id,
      component_name: material.component.component_name,
      code: material.component.code
    }] : [],
    slides
  }
}

export default function TeachingSession() {
  const { conversionId } = useParams<{ conversionId: string }>()
  const navigate = useNavigate()
  const [conversion, setConversion] = useState<ConversionDetail | null>(null)
  const [materialSlides, setMaterialSlides] = useState<any[]>([]) // Store generated_slides with data and styles
  const [loading, setLoading] = useState(true)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('slide')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // API에서 교재 데이터 가져오기
  useEffect(() => {
    const loadMaterialDetail = async () => {
      if (!conversionId) return

      setLoading(true)
      try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token

        const material = await fetchMaterialDetail(parseInt(conversionId), accessToken)

        // Store generated_slides with data and styles
        if (material.generated_slides && material.generated_slides.length > 0) {
          setMaterialSlides(material.generated_slides)
          console.log("Loaded generated_slides with data and styles:", material.generated_slides)
        }

        // MaterialDetail을 ConversionDetail 형식으로 변환
        const adaptedData = adaptMaterialToConversion(material)
        setConversion(adaptedData)

        // 기본적으로 basic 모드 사용
        setViewMode('basic')
      } catch (error) {
        console.error('Failed to fetch material detail:', error)
        toast.error('수업 자료를 불러오는데 실패했습니다', {
          duration: 2000,
          position: 'top-right'
        })
      } finally {
        setLoading(false)
      }
    }

    loadMaterialDetail()
  }, [conversionId])

  // 현재 슬라이드의 컴포넌트 코드를 iframe에 렌더링
  useEffect(() => {
    // materialSlides (generated_slides)를 기준으로 체크 - slides가 비어있을 수 있음
    if (!conversion || !materialSlides[currentSlideIndex] || !iframeRef.current) return

    const currentMaterialSlide = materialSlides[currentSlideIndex] // Get current slide's data and styles
    // conversion.slides가 있으면 사용, 없으면 materialSlides에서 가져옴
    const currentSlide = conversion.slides[currentSlideIndex] || {
      id: currentSlideIndex + 1,
      slide_number: currentMaterialSlide.slide_number,
      slide_title: '',
      slide_content: currentMaterialSlide.layout_description,
      layout_component: currentMaterialSlide.layout_component,
      data: currentMaterialSlide.data
    }
    const iframe = iframeRef.current
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) return

    // 디버깅: 현재 슬라이드와 컴포넌트 정보 출력
    console.log('=== Slide Matching Debug ===')
    console.log('Current Slide:', currentSlide)
    console.log('Current Material Slide:', currentMaterialSlide)
    console.log('Layout Component Name:', currentSlide.layout_component)
    console.log('Available Components:', conversion.components.map(c => ({
      id: c.id,
      name: c.component_name,
      hasCode: !!(c.code || c.component_code),
      codeLength: (c.code || c.component_code)?.length || 0,
      codePreview: (c.code || c.component_code)?.substring(0, 100) || 'NO CODE'
    })))
    console.log('Full Component Object:', conversion.components[0])

    // 슬라이드의 layout_component와 component_name을 매칭
    const layoutComponentName = currentSlide.layout_component

    if (!layoutComponentName) {
      // layout_component가 없으면 슬라이드 콘텐츠만 표시
      const simpleHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body {
                width: 100%;
                height: 100%;
                font-family: system-ui, -apple-system, sans-serif;
                overflow: auto;
                background: white;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .content {
                text-align: center;
                padding: 40px;
              }
              h1 { font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; }
              p { font-size: 1.125rem; line-height: 1.75; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <div class="content">
              ${currentSlide.slide_title ? `<h1>${currentSlide.slide_title}</h1>` : ''}
              ${currentSlide.slide_content ? `<p>${currentSlide.slide_content}</p>` : ''}
              ${!currentSlide.slide_title && !currentSlide.slide_content ? '<p>슬라이드 콘텐츠가 없습니다</p>' : ''}
            </div>
          </body>
        </html>
      `
      iframeDoc.open()
      iframeDoc.write(simpleHtml)
      iframeDoc.close()
      return
    }

    // layout_component와 매칭되는 컴포넌트 찾기 (여러 방법 시도)
    let component = conversion.components.find(c =>
      c.component_name === layoutComponentName
    )

    // 매칭 실패 시 대소문자 무시하고 재시도
    if (!component) {
      console.warn(`Exact match failed for: ${layoutComponentName}, trying case-insensitive match`)
      component = conversion.components.find(c =>
        c.component_name?.toLowerCase() === layoutComponentName.toLowerCase()
      )
    }

    // 여전히 실패 시 부분 매칭 시도
    if (!component) {
      console.warn(`Case-insensitive match failed, trying partial match`)
      component = conversion.components.find(c =>
        c.component_name?.includes(layoutComponentName) ||
        layoutComponentName.includes(c.component_name || '')
      )
    }

    // 여전히 실패 시 슬라이드 번호로 매칭 시도
    if (!component && conversion.components.length > 0) {
      console.warn(`Partial match failed, using slide index: ${currentSlideIndex}`)
      component = conversion.components[currentSlideIndex] || conversion.components[0]
    }

    // code 또는 component_code 중 하나라도 있으면 OK
    const componentCode = component?.code || component?.component_code

    if (!component || !componentCode) {
      console.error(`Component not found or has no code: ${layoutComponentName}`)
      console.error('Available components:', conversion.components.map(c => c.component_name))

      const errorHtml = `
        <!DOCTYPE html>
        <html class="h-full">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="h-full flex items-center justify-center bg-red-50">
            <div class="text-center p-8 max-w-2xl">
              <h1 class="text-2xl font-bold text-red-600 mb-4">컴포넌트를 찾을 수 없습니다</h1>
              <p class="text-gray-700 mb-2">찾으려는 레이아웃 컴포넌트: <strong>${layoutComponentName}</strong></p>
              ${!component ? '<p class="text-sm text-gray-600 mb-4">컴포넌트가 존재하지 않습니다</p>' : ''}
              ${component && !componentCode ? '<p class="text-sm text-gray-600 mb-4">컴포넌트 코드가 없습니다</p>' : ''}
              <div class="text-left bg-white p-4 rounded border mt-4">
                <p class="text-sm font-semibold mb-2">사용 가능한 컴포넌트:</p>
                <ul class="text-sm text-gray-600 list-disc list-inside">
                  ${conversion.components.map(c => `<li>${c.component_name || 'Unnamed'}</li>`).join('')}
                </ul>
              </div>
            </div>
          </body>
        </html>
      `
      iframeDoc.open()
      iframeDoc.write(errorHtml)
      iframeDoc.close()
      return
    }

    console.log('✅ Component matched:', component.component_name)
    console.log('Component details:', {
      id: component.id,
      name: component.component_name,
      hasCode: !!componentCode,
      codeLength: componentCode?.length,
      fullComponent: component
    })

    // React 컴포넌트 코드 처리 (code 또는 component_code 사용)
    let processedCode = componentCode

    // code가 빈 문자열인 경우 체크
    if (!processedCode || processedCode.trim() === '') {
      console.error('Component code is empty!')
      const errorHtml = `
        <!DOCTYPE html>
        <html class="h-full">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="h-full flex items-center justify-center bg-yellow-50">
            <div class="text-center p-8 max-w-2xl">
              <h1 class="text-2xl font-bold text-yellow-600 mb-4">컴포넌트 코드가 비어있습니다</h1>
              <p class="text-gray-700 mb-2">컴포넌트 이름: <strong>${component.component_name}</strong></p>
              <p class="text-sm text-gray-600 mb-4">컴포넌트는 존재하지만 코드가 비어있습니다.</p>
              <div class="text-left bg-white p-4 rounded border mt-4">
                <p class="text-sm font-semibold mb-2">컴포넌트 정보:</p>
                <pre class="text-xs text-gray-600 overflow-auto">${JSON.stringify(component, null, 2)}</pre>
              </div>
            </div>
          </body>
        </html>
      `
      iframeDoc.open()
      iframeDoc.write(errorHtml)
      iframeDoc.close()
      return
    }

    // import 문 제거
    processedCode = processedCode.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '')

    // 컴포넌트 이름 추출
    let componentName = component.component_name || 'GeneratedComponent'

    const exportDefaultFunctionMatch = processedCode.match(/export\s+default\s+function\s+(\w+)/)
    if (exportDefaultFunctionMatch) {
      componentName = exportDefaultFunctionMatch[1]
      processedCode = processedCode.replace(/export\s+default\s+/, '')
    }

    const exportDefaultMatch = processedCode.match(/export\s+default\s+(\w+);?/)
    if (exportDefaultMatch) {
      componentName = exportDefaultMatch[1]
      processedCode = processedCode.replace(/export\s+default\s+\w+;?\s*$/, '')
    }

    const functionMatch = processedCode.match(/function\s+(\w+)/)
    if (functionMatch && !exportDefaultFunctionMatch) {
      componentName = functionMatch[1]
    }

    const constMatch = processedCode.match(/const\s+(\w+)\s*=/)
    if (constMatch && !functionMatch) {
      componentName = constMatch[1]
    }

    // 현재 슬라이드의 data와 styles를 props로 전달
    let slideData = currentMaterialSlide.data || {}
    let slideStyles = currentMaterialSlide.styles || {}

    // data가 배열이면 첫 번째 요소 사용
    if (Array.isArray(slideData) && slideData.length > 0) {
      slideData = slideData[0]
    }

    // Replace 'fixed' with 'absolute' for container rendering
    const elementStyles = { ...slideStyles }
    Object.keys(elementStyles).forEach(key => {
      if (elementStyles[key]?.className) {
        elementStyles[key].className = elementStyles[key].className
          .replace(/\bfixed\b/g, 'absolute')
      }
    })

    console.log('📊 Slide Data being passed as props:', slideData)
    console.log('🎨 Element Styles being passed as props:', elementStyles)

    // HTML 생성 (MaterialEditorNew와 동일한 로직)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <script crossorigin="anonymous" src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin="anonymous" src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script crossorigin="anonymous" src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: 100%;
              height: 100%;
              font-family: system-ui, -apple-system, sans-serif;
              overflow: auto;
              background: white;
            }
            #root {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            #root > * {
              width: 100%;
              height: 100%;
              max-width: calc(100vh * 16 / 9);
              max-height: calc(100vw * 9 / 16);
              aspect-ratio: 16 / 9;
            }
            #error-display {
              padding: 20px;
              background: #fee;
              color: #c00;
              font-family: monospace;
              white-space: pre-wrap;
              border: 2px solid #c00;
              margin: 20px;
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <div id="error-display" style="display: none;"></div>

          <script>
            window.onerror = function(msg, url, lineNo, columnNo, error) {
              const errorDiv = document.getElementById('error-display');
              if (errorDiv) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'Error: ' + msg + '\\nLine: ' + lineNo + '\\n\\n' + (error ? error.stack : '');
              }
              console.error('Global error:', msg, error);
              return false;
            };
          </script>

          <script type="text/babel" data-type="module">
            (function() {
              // Wait for React to be available
              function waitForReact() {
                return new Promise((resolve) => {
                  if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') {
                    resolve();
                  } else {
                    setTimeout(() => waitForReact().then(resolve), 100);
                  }
                });
              }

              waitForReact().then(() => {
                try {
                  console.log('React available, executing component code...');
                  const { useState, useEffect, useMemo } = React;

                  ${processedCode}

                  console.log('Component code executed');
                  console.log('Component name:', '${componentName}');
                  console.log('Component exists:', typeof ${componentName});

                  // MaterialEditorNew와 동일한 방식으로 propsData 객체 생성
                  const propsData = {
                    data: ${JSON.stringify(slideData)},
                    elementStyles: ${JSON.stringify(elementStyles)}
                  };

                  console.log('Props data prepared');

                  const rootElement = document.getElementById('root');
                  console.log('Root element:', rootElement);

                  if (!rootElement) {
                    throw new Error('Root element not found');
                  }

                  const root = ReactDOM.createRoot(rootElement);
                  console.log('React root created');

                  // propsData 객체를 통해 data와 elementStyles 전달
                  root.render(React.createElement(${componentName}, propsData));
                  console.log('Render complete!');
                } catch (error) {
                  console.error('Rendering error:', error);
                  const errorDiv = document.getElementById('error-display');
                  if (errorDiv) {
                    errorDiv.style.display = 'block';
                    errorDiv.textContent = 'Rendering Error:\\n\\n' + error.message + '\\n\\nStack:\\n' + error.stack;
                  }
                }
              }).catch((error) => {
                console.error('React wait error:', error);
              });
            })();
          </script>
        </body>
      </html>
    `

    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()
  }, [conversion, currentSlideIndex, viewMode, materialSlides])

  const handlePreviousSlide = () => {
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNextSlide = () => {
    if (conversion && materialSlides.length > 0) {
      setCurrentSlideIndex((prev) => Math.min(materialSlides.length - 1, prev + 1))
    }
  }

  const handlePrintCurrentSlide = () => {
    if (!iframeRef.current) {
      toast.error('슬라이드를 불러올 수 없습니다')
      return
    }

    try {
      const iframeWindow = iframeRef.current.contentWindow
      if (iframeWindow) {
        iframeWindow.print()
        toast.success(`슬라이드 ${currentSlideIndex + 1} 출력을 시작합니다`)
      }
    } catch (error) {
      console.error('Print error:', error)
      toast.error('출력 중 오류가 발생했습니다')
    }
  }

  const handlePrintAllSlides = () => {
    toast.info('전체 슬라이드 출력 기능은 개발 중입니다')
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    toast.success(mode === 'slide' ? '슬라이드 모드로 전환되었습니다' : '베이직 모드로 전환되었습니다')
  }

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 슬라이드 모드에서만 화살표 키 작동
      if (viewMode === 'slide') {
        if (e.key === 'ArrowLeft') {
          handlePreviousSlide()
        } else if (e.key === 'ArrowRight') {
          handleNextSlide()
        }
      }

      // ESC는 모든 모드에서 작동
      if (e.key === 'Escape') {
        navigate('/generate-v2/materials')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [conversion, currentSlideIndex, viewMode])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-white" />
          <p className="text-white">수업 자료를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!conversion || materialSlides.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <p className="text-xl text-white">수업 자료를 찾을 수 없습니다</p>
          <Button onClick={() => navigate('/generate-v2/materials')}>
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  const totalSlides = materialSlides.length

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* 상단 툴바 */}
      <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/generate-v2/materials')}
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로
          </Button>
          <div className="h-6 w-px bg-gray-700"></div>
          <h1 className="text-lg font-bold">{conversion.content_name}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* 뷰 모드 선택 - 주석 처리 */}
          {/* <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange('slide')}
              className={`h-8 px-3 ${
                viewMode === 'slide'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Presentation className="w-4 h-4 mr-1" />
              슬라이드
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange('basic')}
              className={`h-8 px-3 ${
                viewMode === 'basic'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <List className="w-4 h-4 mr-1" />
              베이직
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-700"></div> */}

          {/* PDF 출력 - 주석 처리 */}
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-gray-800"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF 출력
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handlePrintCurrentSlide}>
                <Download className="w-4 h-4 mr-2" />
                현재 슬라이드
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintAllSlides}>
                <Download className="w-4 h-4 mr-2" />
                전체 슬라이드
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-gray-700"></div> */}

          <span className="text-sm text-gray-400">
            {currentSlideIndex + 1} / {totalSlides}
          </span>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {viewMode === 'slide' ? (
          /* ========== 슬라이드 모드 (PPT 스타일) ========== */
          <>
            {/* iframe - 전체 화면 */}
            <div className="absolute inset-0">
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0 bg-white"
                title={`slide-${currentSlideIndex + 1}`}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>

            {/* 네비게이션 버튼 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousSlide}
              disabled={currentSlideIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white disabled:opacity-30 shadow-lg"
              title="이전 슬라이드 (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextSlide}
              disabled={currentSlideIndex === totalSlides - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white disabled:opacity-30 shadow-lg"
              title="다음 슬라이드 (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>

            {/* 하단 페이지 인디케이터 */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900/80 backdrop-blur">
              {materialSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlideIndex
                      ? 'bg-white w-8'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  title={`슬라이드 ${index + 1}`}
                />
              ))}
            </div>
          </>
        ) : (
          /* ========== 베이직 모드 (사이드바 + iframe flex 레이아웃) ========== */
          <div className="absolute inset-0 flex">
            {/* 좌측 슬라이드 선택 패널 */}
            <div className="h-full bg-white/95 backdrop-blur-md shadow-2xl transition-all duration-300 ease-in-out w-16 hover:w-72 overflow-hidden flex-shrink-0 group">
              {/* 헤더 */}
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    슬라이드 목록
                  </span>
                  <span className="ml-auto text-xs text-gray-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {materialSlides.length}개
                  </span>
                </div>
              </div>

              {/* 슬라이드 목록 */}
              <div className="overflow-y-auto h-[calc(100%-50px)] p-2">
                <div className="space-y-1">
                  {materialSlides.map((slide, index) => (
                    <button
                      key={slide.slide_number || index}
                      onClick={() => setCurrentSlideIndex(index)}
                      className={`w-full text-left px-2 py-2 rounded-lg transition-all flex items-center gap-2 ${
                        index === currentSlideIndex
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                      title={slide.layout_component || `슬라이드 ${index + 1}`}
                    >
                      {/* 슬라이드 번호 아이콘 - 항상 표시 */}
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        index === currentSlideIndex
                          ? 'bg-white/20'
                          : 'bg-gray-200'
                      }`}>
                        {index + 1}
                      </span>
                      {/* 슬라이드 제목 - hover 시에만 표시 */}
                      <span className="text-sm font-medium truncate whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {slide.layout_component || `슬라이드 ${index + 1}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* iframe - 나머지 공간에서 가운데 정렬 */}
            <div className="flex-1 flex items-center justify-center">
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0 bg-white"
                title={`slide-${currentSlideIndex + 1}`}
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              />
            </div>
          </div>
        )}
      </div>

      {/* 단축키 안내 */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-gray-900/80 backdrop-blur px-3 py-2 rounded z-10">
        ← → : 슬라이드 이동 | ESC : 나가기
      </div>
    </div>
  )
}
