// TeachingPlanViewer - 교안 수업 페이지 (React 코드 렌더링)
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Presentation, List, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

type ViewMode = 'slide' | 'basic';

interface Page {
  id: number;
  name: string;
  reactCode: string;
  jsonData: string;
}

export default function TeachingPlanViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const planData = location.state?.planData;

  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [materialName, setMaterialName] = useState('교안');
  const [viewMode, setViewMode] = useState<ViewMode>('slide');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // planData 로드
  useEffect(() => {
    if (planData) {
      console.log('Loading plan data for viewer:', planData);

      if (planData.metadata) {
        setMaterialName(planData.metadata.material_name || '교안');
      }

      if (planData.components && Array.isArray(planData.components)) {
        const loadedPages: Page[] = planData.components.map((component: any, index: number) => ({
          id: index + 1,
          name: `슬라이드 ${index + 1}`,
          reactCode: component.code || '',
          jsonData: JSON.stringify(component.jsonData || {}, null, 2)
        }));

        setPages(loadedPages);
      }
    }
  }, [planData]);

  const currentPage = pages[currentPageIndex];

  // JSON 데이터 파싱
  const parsedData = React.useMemo(() => {
    if (!currentPage) return {};
    try {
      return JSON.parse(currentPage.jsonData);
    } catch {
      return {};
    }
  }, [currentPage]);

  // React 코드 렌더링
  useEffect(() => {
    if (!currentPage?.reactCode.trim() || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    let processedCode = currentPage.reactCode;

    // import 문 제거
    processedCode = processedCode.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');

    // 컴포넌트 이름 추출
    let componentName = 'GeneratedComponent';

    const exportDefaultFunctionMatch = processedCode.match(/export\s+default\s+function\s+(\w+)/);
    if (exportDefaultFunctionMatch) {
      componentName = exportDefaultFunctionMatch[1];
      processedCode = processedCode.replace(/export\s+default\s+/, '');
    }

    const exportDefaultMatch = processedCode.match(/export\s+default\s+(\w+);?/);
    if (exportDefaultMatch) {
      componentName = exportDefaultMatch[1];
      processedCode = processedCode.replace(/export\s+default\s+\w+;?\s*$/, '');
    }

    const functionMatch = processedCode.match(/function\s+(\w+)/);
    if (functionMatch && !exportDefaultFunctionMatch) {
      componentName = functionMatch[1];
    }

    const constMatch = processedCode.match(/const\s+(\w+)\s*=/);
    if (constMatch && !functionMatch) {
      componentName = constMatch[1];
    }

    // HTML 생성
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              overflow: hidden;
              background: white;
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <div id="error-display" style="display: none; padding: 20px; background: #ffeeee; color: #cc0000; font-family: monospace; white-space: pre-wrap; border: 2px solid #cc0000; margin: 20px;"></div>

          <script>
            window.onerror = function(msg, url, lineNo, columnNo, error) {
              const errorDiv = document.getElementById('error-display');
              errorDiv.style.display = 'block';
              errorDiv.textContent = 'Error: ' + msg + '\\nLine: ' + lineNo + '\\n\\n' + (error ? error.stack : '');
              return false;
            };
          </script>

          <script type="text/babel">
            const { useState, useEffect } = React;

            (function() {
              try {
                const data = ${JSON.stringify(parsedData)};

                ${processedCode}

                const rootElement = document.getElementById('root');
                const root = ReactDOM.createRoot(rootElement);
                root.render(React.createElement(${componentName}, { data: data }));
              } catch (error) {
                console.error('Rendering error:', error);
                const errorDiv = document.getElementById('error-display');
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'Rendering Error:\\n\\n' + error.message + '\\n\\nStack:\\n' + error.stack;
              }
            })();
          </script>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  }, [currentPage, parsedData]);

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  // PDF 출력 - 현재 슬라이드
  const handlePrintCurrentSlide = () => {
    if (!iframeRef.current) {
      toast.error('슬라이드를 불러올 수 없습니다.');
      return;
    }

    try {
      const iframe = iframeRef.current;
      const iframeWindow = iframe.contentWindow;

      if (iframeWindow) {
        iframeWindow.print();
        toast.success(`슬라이드 ${currentPageIndex + 1} 출력을 시작합니다.`);
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error('출력 중 오류가 발생했습니다.');
    }
  };

  // PDF 출력 - 전체 슬라이드
  const handlePrintAllSlides = () => {
    toast.info('전체 슬라이드 출력 기능은 개발 중입니다.');
    // TODO: 전체 슬라이드를 순차적으로 렌더링하여 PDF 생성
  };

  // 뷰 모드 전환
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    toast.success(mode === 'slide' ? '슬라이드 모드로 전환되었습니다.' : '베이직 모드로 전환되었습니다.');
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 슬라이드 모드에서만 화살표 키 작동
      if (viewMode === 'slide') {
        if (e.key === 'ArrowLeft') {
          goToPreviousPage();
        } else if (e.key === 'ArrowRight') {
          goToNextPage();
        }
      }

      // ESC는 모든 모드에서 작동
      if (e.key === 'Escape') {
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, pages.length, viewMode]);

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* 상단 툴바 */}
      <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
          <div className="h-6 w-px bg-gray-700"></div>
          <h1 className="text-lg font-bold">{materialName}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* 뷰 모드 선택 */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
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

          <div className="h-6 w-px bg-gray-700"></div>

          {/* PDF 출력 */}
          <DropdownMenu>
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

          <div className="h-6 w-px bg-gray-700"></div>

          <span className="text-sm text-gray-400">
            {currentPageIndex + 1} / {pages.length}
          </span>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {pages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white">
            <div className="text-center">
              <p className="text-xl mb-2">교안 데이터를 불러올 수 없습니다</p>
              <p className="text-sm text-gray-400">교안 관리 페이지로 돌아가주세요</p>
            </div>
          </div>
        ) : viewMode === 'slide' ? (
          /* ========== 슬라이드 모드 ========== */
          <>
            {/* iframe - 전체 화면 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="bg-white shadow-2xl"
                style={{
                  width: '1280px',
                  height: '720px',
                  maxWidth: '100vw',
                  maxHeight: 'calc(100vh - 60px)'
                }}
              >
                <iframe
                  ref={iframeRef}
                  className="w-full h-full border-0"
                  title="teaching-plan-content"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>

            {/* 네비게이션 버튼 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousPage}
              disabled={currentPageIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white disabled:opacity-30 shadow-lg"
              title="이전 슬라이드 (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextPage}
              disabled={currentPageIndex === pages.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white disabled:opacity-30 shadow-lg"
              title="다음 슬라이드 (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>

            {/* 하단 페이지 인디케이터 */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900/80 backdrop-blur">
              {pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentPageIndex
                      ? 'bg-white w-8'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  title={`슬라이드 ${index + 1}`}
                />
              ))}
            </div>
          </>
        ) : (
          /* ========== 베이직 모드 ========== */
          <div className="h-full flex bg-gray-100">
            {/* 좌측 슬라이드 목록 */}
            <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">슬라이드 목록</h2>
                <div className="space-y-2">
                  {pages.map((page, index) => (
                    <button
                      key={page.id}
                      onClick={() => setCurrentPageIndex(index)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        index === currentPageIndex
                          ? 'bg-primary text-white'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{page.name}</span>
                        <span className="text-xs opacity-75">{index + 1}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 우측 컨텐츠 영역 - 인터랙션 가능 */}
            <div className="flex-1 overflow-y-auto bg-white p-8">
              <div className="max-w-4xl mx-auto">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {pages[currentPageIndex]?.name}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintCurrentSlide}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF 출력
                  </Button>
                </div>

                {/* iframe - 인터랙션 가능 */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ minHeight: '600px' }}>
                  <iframe
                    ref={iframeRef}
                    className="w-full border-0"
                    style={{ height: '720px' }}
                    title="teaching-plan-content"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 단축키 안내 */}
      {viewMode === 'slide' && (
        <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-gray-900/80 backdrop-blur px-3 py-2 rounded">
          ← → : 슬라이드 이동 | ESC : 나가기
        </div>
      )}
    </div>
  );
}
