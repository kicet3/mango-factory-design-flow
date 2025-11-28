import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Save,
  Code,
  Database,
  Trash2,
  Image as ImageIcon,
  Type,
  Move,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  Undo,
  Redo,
  Upload,
  Sparkles,
  Send,
  Eye,
  X,
  Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EditableElement {
  id: string;
  element: HTMLElement;
  originalProps: {
    position: string;
    left: string;
    top: string;
    width: string;
    height: string;
    backgroundColor: string;
    color: string;
    fontSize: string;
    fontWeight: string;
    textAlign: string;
  };
}

// MaterialEditorNew 스타일의 elementStyles 인터페이스
interface ElementStyleData {
  className?: string;
  style?: Record<string, string | number>;
}

interface Page {
  id: number;
  name: string;
  reactCode: string;
  jsonData: string;
  componentId?: number; // API의 component ID
  slideId?: number; // API의 slide ID
  propDataType?: any; // API의 component prop_data_type
  elementStyles?: Record<string, ElementStyleData>; // MaterialEditorNew 스타일의 elementStyles
}

interface HistoryState {
  reactCode: string;
  jsonData: string;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// 이미지 갤러리용 인터페이스
interface ImageData {
  id?: number;
  name: string;
  image_url: string;
}

export default function WixStyleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 페이지 관리 - 초기값을 빈 배열로 설정 (API 데이터 로드 후 설정)
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<number>(0); // 0은 페이지 미선택 상태

  // 현재 편집 중인 코드와 데이터
  const [reactCode, setReactCode] = useState('');
  const [jsonData, setJsonData] = useState('{}');
  const [propDataType, setPropDataType] = useState<any>(null);

  // MaterialEditorNew 스타일의 elementStyles 기반 편집
  const [elementStyles, setElementStyles] = useState<Record<string, ElementStyleData>>({});
  const [selectedShape, setSelectedShape] = useState<string | null>(null);

  // 새 스타일 속성 추가용
  const [newStyleKey, setNewStyleKey] = useState("");
  const [newStyleValue, setNewStyleValue] = useState("");

  // 되돌리기/다시실행 히스토리
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [renderedElements, setRenderedElements] = useState<Map<string, EditableElement>>(new Map());

  // 편집 중인 속성값 (저장 전)
  const [editingStyles, setEditingStyles] = useState<{
    position: string;
    left: string;
    top: string;
    width: string;
    height: string;
    backgroundColor: string;
    color: string;
    fontSize: string;
    fontWeight: string;
    textAlign: string;
    display: string;
    alignItems: string;
    justifyContent: string;
    textContent: string;
    imageSrc: string;
  } | null>(null);

  // 이미지 업로드
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 이미지 갤러리
  const [availableImages, setAvailableImages] = useState<ImageData[]>([]);
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newImageName, setNewImageName] = useState('');
  const galleryImageInputRef = useRef<HTMLInputElement>(null);

  // 왼쪽 패널 토글 상태
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);

  // AI 채팅 관련 상태
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 페이지 로딩 중인지 추적 (무한 루프 방지)
  const isLoadingPageRef = useRef(false);

  // 이전 페이지 ID 추적 (페이지 변경 여부 확인용)
  const prevPageIdRef = useRef<number>(0);

  // Conversion 데이터 및 현재 컴포넌트 추적
  const [conversionData, setConversionData] = useState<any>(null);
  const [currentComponentId, setCurrentComponentId] = useState<number | null>(null);

  // 자료 정보 편집
  const [contentName, setContentName] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  // AI 수정된 최신 코드 추적
  const [latestAIModifiedCode, setLatestAIModifiedCode] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // AI 편집은 항상 코드 수정 모드

  // 미리보기 모달
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 파일 업로드
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 스타일 업데이트 debounce를 위한 ref
  const styleUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStyleUpdatesRef = useRef<Record<string, { shapeName: string; styleKey: string; value: string | number }>>({});

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  // JWT 토큰을 포함한 헤더 생성
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  };

  // FormData 요청용 JWT 토큰 헤더 (Content-Type 제외)
  const getAuthHeadersForFormData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {};

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  };

  // Conversion 데이터 로드
  useEffect(() => {
    const loadConversionData = async () => {
      if (!id || id === 'new') {
        // 새 자료 생성 모드 - 세션 스토리지에서 데이터 로드 (기존 로직 유지)
        return;
      }

      // 기존 자료 수정 모드 - API에서 데이터 로드
      try {
        const headers = await getAuthHeaders();

        const response = await fetch(`${API_BASE_URL}/conversions/${id}`, {
          method: 'GET',
          headers,
          mode: 'cors',
        });

        if (!response.ok) {
          throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ API 응답 데이터:', data);

        // Conversion 데이터 저장
        setConversionData(data);

        // 자료 정보 설정
        setContentName(data.content_name || '');
        setDescription(data.description || '');

        // 컴포넌트 맵 생성 (component_name -> {code, id, propDataType, styles})
        const componentMap = new Map<string, { code: string; id: number; propDataType: any; styles: string | null }>();
        if (data.components && data.components.length > 0) {
          data.components.forEach((comp: any) => {
            // imports가 null이거나 빈 배열이면 코드만 사용
            const fullCode = comp.imports && Array.isArray(comp.imports) && comp.imports.length > 0
              ? `${comp.imports.join('\n')}\n\n${comp.code}`
              : comp.code;
            componentMap.set(comp.component_name, {
              code: fullCode,
              id: comp.id,
              propDataType: comp.prop_data_type,
              styles: comp.styles || null // 컴포넌트의 styles 추가 (JSON string)
            });
            console.log(`📦 컴포넌트 등록: ${comp.component_name} (ID: ${comp.id}, 코드: ${fullCode?.length || 0} chars, styles: ${comp.styles ? 'Y' : 'N'})`);
          });
        }

        // 슬라이드 데이터로 pages 배열 생성 (각 슬라이드의 layout_component와 매칭)
        if (data.slides && data.slides.length > 0) {
          const newPages: Page[] = data.slides.map((slide: any, index: number) => {
            const layoutComponent = slide.layout_component;
            const matched = componentMap.get(layoutComponent);

            // slide.data는 그대로 사용 (백엔드가 { data: { slides: [...] } } 형식으로 반환)
            const slideData = slide.data || {};

            // elementStyles 처리 (MaterialEditorNew 스타일)
            // styles는 components에 JSON 문자열로 저장되어 있음
            let slideElementStyles: Record<string, ElementStyleData> = {};
            if (matched?.styles) {
              try {
                const parsedStyles = typeof matched.styles === 'string'
                  ? JSON.parse(matched.styles)
                  : matched.styles;

                // position: fixed를 absolute로 변환 (렌더링용)
                const modifiedStyles = { ...parsedStyles };
                Object.keys(modifiedStyles).forEach(key => {
                  if (modifiedStyles[key]?.className) {
                    modifiedStyles[key].className = modifiedStyles[key].className
                      .replace(/\bfixed\b/g, 'absolute');
                  }
                });
                slideElementStyles = modifiedStyles;
                console.log(`✅ 컴포넌트 styles 파싱 성공:`, slideElementStyles);
              } catch (e) {
                console.error('❌ 컴포넌트 styles JSON 파싱 실패:', e);
                slideElementStyles = {};
              }
            }

            console.log(`📄 슬라이드 ${index + 1}: layout_component="${layoutComponent}" → 컴포넌트 ID=${matched?.id}, 코드 길이=${matched?.code.length || 0}`);
            console.log(`   데이터 구조:`, slideData);
            console.log(`   스타일 구조:`, slideElementStyles);

            return {
              id: index + 1,
              name: `페이지 ${index + 1}`,
              reactCode: matched?.code || '', // layout_component와 매칭된 React 코드
              jsonData: JSON.stringify(slideData, null, 2), // slide.data를 그대로 사용
              componentId: matched?.id, // 컴포넌트 ID 저장
              slideId: slide.id, // 슬라이드 ID 저장
              propDataType: matched?.propDataType, // prop_data_type 저장
              elementStyles: slideElementStyles // elementStyles 저장
            };
          });

          console.log('📚 생성된 페이지 수:', newPages.length);
          console.log('📄 첫 번째 페이지 JSON 데이터:', newPages[0]?.jsonData);
          console.log('📄 첫 번째 페이지 elementStyles:', newPages[0]?.elementStyles);

          isLoadingPageRef.current = true;
          prevPageIdRef.current = 1; // 초기 페이지 ID 설정
          setPages(newPages);
          setCurrentPageId(1);
          setReactCode(newPages[0]?.reactCode || '');
          setJsonData(newPages[0]?.jsonData || '{}');
          setCurrentComponentId(newPages[0]?.componentId || null);
          setPropDataType(newPages[0]?.propDataType || null);
          setElementStyles(newPages[0]?.elementStyles || {});

          setTimeout(() => {
            isLoadingPageRef.current = false;
          }, 100);
        }

        toast.success('변환 데이터를 불러왔습니다');
      } catch (error) {
        console.error('❌ 변환 데이터 로드 실패:', error);
        toast.error('데이터를 불러오는데 실패했습니다');
      }
    };

    loadConversionData();
  }, [id]);

  // 초기 로드: 세션 스토리지에서 새로 생성된 자료 데이터 가져오기
  useEffect(() => {
    if (id === 'new') {
      const storedData = sessionStorage.getItem('newMaterialData');
      if (storedData) {
        try {
          const materialData = JSON.parse(storedData);
          console.log('📦 세션 스토리지에서 자료 로드:', materialData);

          // 자료 메타 정보 설정
          setContentName(materialData.name || '새 수업자료');
          setDescription(materialData.description || '');

          // 슬라이드 데이터를 페이지로 변환
          if (materialData.components && materialData.slidesData) {
            const newPages: Page[] = materialData.components.map((component: string, index: number) => {
              const slideData = materialData.slidesData[index] || {};
              return {
                id: index + 1,
                name: `페이지 ${index + 1}`,
                reactCode: component,
                jsonData: JSON.stringify(slideData, null, 2)
              };
            });

            if (newPages.length > 0) {
              prevPageIdRef.current = 1; // 초기 페이지 ID 설정
              setPages(newPages);
              setCurrentPageId(1);
              setReactCode(newPages[0].reactCode);
              setJsonData(newPages[0].jsonData);

              toast.success(`${newPages.length}개 페이지가 로드되었습니다.`);
            }
          }

          // 사용 후 세션 스토리지 정리
          sessionStorage.removeItem('newMaterialData');
        } catch (error) {
          console.error('세션 스토리지 데이터 파싱 오류:', error);
          toast.error('자료 로드 중 오류가 발생했습니다.');
        }
      }
    }
  }, [id]);

  // 페이지 변경 시 reactCode와 jsonData 업데이트
  useEffect(() => {
    // pages가 비어있거나 currentPageId가 0이면 스킵 (API 로드 대기)
    if (pages.length === 0 || currentPageId === 0) {
      console.log('⏳ 페이지 로드 대기 중... (pages:', pages.length, ', currentPageId:', currentPageId, ')');
      return;
    }

    // 실제로 페이지가 변경되었는지 확인 (스타일 수정으로 인한 pages 업데이트는 무시)
    const isActualPageChange = prevPageIdRef.current !== currentPageId;

    const page = pages.find(p => p.id === currentPageId);
    if (page) {
      // 실제 페이지 변경 시에만 전체 상태 초기화
      if (isActualPageChange) {
        console.log('🔄 페이지 변경:', currentPageId);
        console.log('📝 로드된 코드 길이:', page.reactCode.length);
        console.log('📊 로드된 JSON:', page.jsonData);
        console.log('🆔 컴포넌트 ID:', page.componentId);
        console.log('🎨 로드된 elementStyles:', page.elementStyles);

        isLoadingPageRef.current = true;
        setReactCode(page.reactCode);
        setJsonData(page.jsonData);
        setCurrentComponentId(page.componentId || null);
        setPropDataType(page.propDataType || null);
        setElementStyles(page.elementStyles || {});
        setSelectedShape(null);
        setSelectedElementId(null);
        setEditingStyles(null);
        setNewStyleKey("");
        setNewStyleValue("");

        // AI 편집 상태 초기화
        setChatMessages([]);
        setChatInput('');
        setLatestAIModifiedCode(null);
        setHasUnsavedChanges(false);
        setUploadedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // 다음 틱에서 플래그 해제
        setTimeout(() => {
          isLoadingPageRef.current = false;
          console.log('✅ 페이지 로드 완료');
        }, 0);

        // 현재 페이지 ID 저장
        prevPageIdRef.current = currentPageId;
      }
    }
  }, [currentPageId, pages]); // pages 추가: API 로드 후 페이지 데이터 반영

  // reactCode, jsonData, elementStyles 변경 시 현재 페이지 업데이트 (페이지 로딩 중이 아닐 때만)
  useEffect(() => {
    // pages가 비어있거나 currentPageId가 0이면 스킵
    if (pages.length === 0 || currentPageId === 0) {
      return;
    }

    if (!isLoadingPageRef.current) {
      console.log('💾 페이지 저장:', currentPageId);
      console.log('📝 저장된 코드 길이:', reactCode.length);
      console.log('📊 저장된 JSON:', jsonData);
      console.log('🎨 저장된 elementStyles:', elementStyles);

      setPages(prev => prev.map(page =>
        page.id === currentPageId
          ? { ...page, reactCode, jsonData, elementStyles }
          : page
      ));
    }
  }, [reactCode, jsonData, elementStyles, currentPageId, pages.length]);

  // 페이지 추가
  const addPage = () => {
    const newId = pages.length > 0 ? Math.max(...pages.map(p => p.id)) + 1 : 1;
    const newPage: Page = {
      id: newId,
      name: `페이지 ${newId}`,
      reactCode: '',
      jsonData: '{}'
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPageId(newId);
    toast.success('새 페이지가 추가되었습니다');
  };

  // 페이지 삭제
  const deletePage = (pageId: number) => {
    if (pages.length === 1) {
      toast.error('마지막 페이지는 삭제할 수 없습니다');
      return;
    }
    setPages(prev => prev.filter(p => p.id !== pageId));
    if (currentPageId === pageId) {
      const remainingPages = pages.filter(p => p.id !== pageId);
      setCurrentPageId(remainingPages[0].id);
    }
    toast.success('페이지가 삭제되었습니다');
  };

  // reactCode나 jsonData 변경 시 히스토리 저장
  useEffect(() => {
    if (!isLoadingPageRef.current && reactCode && !isUndoRedoAction.current) {
      const timeoutId = setTimeout(() => {
        // 히스토리에 현재 상태 추가
        const newState: HistoryState = {
          reactCode,
          jsonData,
          timestamp: Date.now()
        };

        // 현재 인덱스 이후의 히스토리 제거 (새로운 변경사항)
        setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(newState);

          // 최대 50개 히스토리 유지
          if (newHistory.length > 50) {
            newHistory.shift();
            setHistoryIndex(49);
            return newHistory;
          } else {
            setHistoryIndex(newHistory.length - 1);
            return newHistory;
          }
        });
      }, 500); // 500ms 디바운스
      return () => clearTimeout(timeoutId);
    }
  }, [reactCode, jsonData, historyIndex]);

  // 되돌리기 (Undo)
  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const prevState = history[historyIndex - 1];
      setReactCode(prevState.reactCode);
      setJsonData(prevState.jsonData);
      setHistoryIndex(historyIndex - 1);
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 100);
      toast.success('되돌리기 완료');
    } else {
      toast.error('더 이상 되돌릴 수 없습니다');
    }
  };

  // 다시실행 (Redo)
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const nextState = history[historyIndex + 1];
      setReactCode(nextState.reactCode);
      setJsonData(nextState.jsonData);
      setHistoryIndex(historyIndex + 1);
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 100);
      toast.success('다시실행 완료');
    } else {
      toast.error('더 이상 다시실행할 수 없습니다');
    }
  };

  // 키보드 단축키 (Ctrl+Z, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z (되돌리기)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Shift+Z (다시실행)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl+Y (다시실행 - Windows)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // 편집/보기 모드 변경 시 iframe에 메시지 전송 (MaterialEditorNew 스타일: 확인/재시도 메커니즘)
  useEffect(() => {
    console.log('🔄 EditMode changed to:', editMode);

    let confirmed = false;
    const timeouts: NodeJS.Timeout[] = [];

    const sendEditMode = () => {
      if (confirmed) return; // 이미 확인되었으면 중단

      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({
            type: 'setEditMode',
            editMode: editMode
          }, '*');
          console.log('📤 EditMode message sent:', editMode);

          // 편집 모드로 전환 시 클릭 핸들러 새로고침
          if (editMode) {
            setTimeout(() => {
              if (iframeRef.current && iframeRef.current.contentWindow) {
                const iframeWindow = iframeRef.current.contentWindow as any;
                if (typeof iframeWindow.refreshClickHandlers === 'function') {
                  console.log('🔄 Refreshing click handlers');
                  iframeWindow.refreshClickHandlers();
                }
              }
            }, 200);
          }
        } catch (error) {
          console.error('❌ Failed to send editMode:', error);
        }
      }
    };

    // iframe으로부터 확인 메시지 수신
    const handleConfirmation = (event: MessageEvent) => {
      if (event.data.type === 'editModeConfirmed' && event.data.editMode === editMode) {
        console.log('✅ EditMode confirmed by iframe');
        confirmed = true;
        // 대기 중인 타임아웃 모두 취소
        timeouts.forEach(timeout => clearTimeout(timeout));
      }
    };
    window.addEventListener('message', handleConfirmation);

    // 즉시 전송 및 exponential backoff로 재시도
    sendEditMode();
    timeouts.push(setTimeout(sendEditMode, 100));
    timeouts.push(setTimeout(sendEditMode, 300));
    timeouts.push(setTimeout(sendEditMode, 600));
    timeouts.push(setTimeout(sendEditMode, 1000));

    // 보기 모드로 전환 시 선택 해제
    if (!editMode) {
      setSelectedShape(null);
      setSelectedElementId(null);
    }

    return () => {
      window.removeEventListener('message', handleConfirmation);
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [editMode]);

  // JSON 데이터 파싱
  const parsedData = React.useMemo(() => {
    try {
      const parsed = JSON.parse(jsonData);
      console.log('📊 파싱된 데이터:', parsed);
      return parsed;
    } catch (error) {
      console.error('❌ JSON 파싱 실패:', error);
      return {};
    }
  }, [jsonData]);

  // React 코드를 실제로 렌더링 (MaterialEditorNew 스타일: elementStyles 기반)
  useEffect(() => {
    if (!reactCode.trim() || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // React 코드 정리 및 컴포넌트 이름 추출
    let processedCode = reactCode;

    // import 문 제거
    processedCode = processedCode.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');

    // export 문 제거 및 컴포넌트 이름 추출
    let componentName = 'GeneratedComponent';

    // export default function ComponentName 형태
    const exportDefaultFunctionMatch = processedCode.match(/export\s+default\s+function\s+(\w+)/);
    if (exportDefaultFunctionMatch) {
      componentName = exportDefaultFunctionMatch[1];
      processedCode = processedCode.replace(/export\s+default\s+/, '');
    }

    // export default ComponentName 형태
    const exportDefaultMatch = processedCode.match(/export\s+default\s+(\w+);?/);
    if (exportDefaultMatch) {
      componentName = exportDefaultMatch[1];
      processedCode = processedCode.replace(/export\s+default\s+\w+;?\s*$/, '');
    }

    // function ComponentName 형태 (export가 없는 경우)
    const functionMatch = processedCode.match(/function\s+(\w+)/);
    if (functionMatch && !exportDefaultFunctionMatch) {
      componentName = functionMatch[1];
    }

    // const ComponentName = 형태
    const constMatch = processedCode.match(/const\s+(\w+)\s*=/);
    if (constMatch && !functionMatch) {
      componentName = constMatch[1];
    }

    console.log('Component name detected:', componentName);
    console.log('Processed code length:', processedCode.length);
    console.log('ElementStyles:', elementStyles);

    // HTML 생성 (MaterialEditorNew 스타일: data-key 기반 선택)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">

          <!-- Tailwind CSS -->
          <script src="https://cdn.tailwindcss.com"></script>

          <!-- React -->
          <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

          <!-- Babel Standalone -->
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              overflow: hidden;
              width: 1280px;
              height: 720px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            #root {
              width: 100%;
              height: 100%;
            }
            /* 편집 모드 스타일 (MaterialEditorNew 스타일) */
            body.edit-mode .editable-shape {
              cursor: pointer;
              transition: outline 0.2s;
            }
            body.edit-mode .editable-shape:hover {
              outline: 2px dashed #3B82F6;
              outline-offset: 2px;
            }
            body.edit-mode .editable-shape.selected {
              outline: 3px solid #2563EB !important;
              outline-offset: 2px;
            }
            body.view-mode .editable-shape {
              cursor: auto;
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
            // Edit mode state - 부모로부터 실제 editMode 상태 전달받음
            let currentEditMode = ${editMode};
            console.log('🎬 iframe initialized with editMode:', currentEditMode);

            // Function to update edit mode UI
            function updateEditModeUI(isEditMode) {
              console.log('🎨 Updating UI for editMode:', isEditMode);
              if (isEditMode) {
                document.body.classList.add('edit-mode');
                document.body.classList.remove('view-mode');
                console.log('  ✓ Applied edit-mode class');
              } else {
                document.body.classList.add('view-mode');
                document.body.classList.remove('edit-mode');
                console.log('  ✓ Applied view-mode class');
                // 보기 모드에서 선택 해제
                const selectedElements = document.querySelectorAll('.selected');
                console.log(\`  ✓ Removing selection from \${selectedElements.length} elements\`);
                selectedElements.forEach(el => el.classList.remove('selected'));
              }
            }

            // 초기 UI 설정
            updateEditModeUI(currentEditMode);

            // Listen for editMode changes from parent
            window.addEventListener('message', (event) => {
              console.log('📨 Message received:', event.data);
              if (event.data.type === 'setEditMode') {
                const newEditMode = event.data.editMode;
                console.log(\`🔄 EditMode change request: \${currentEditMode} → \${newEditMode}\`);

                if (currentEditMode !== newEditMode) {
                  currentEditMode = newEditMode;
                  updateEditModeUI(currentEditMode);
                  console.log('✅ EditMode updated successfully');
                } else {
                  console.log('ℹ️ EditMode unchanged, skipping UI update');
                }

                // 부모에게 확인 메시지 전송
                window.parent.postMessage({
                  type: 'editModeConfirmed',
                  editMode: newEditMode
                }, '*');
              }
            });

            window.onerror = function(msg, url, lineNo, columnNo, error) {
              const errorDiv = document.getElementById('error-display');
              errorDiv.style.display = 'block';
              errorDiv.textContent = 'Error: ' + msg + '\\nLine: ' + lineNo + '\\n\\n' + (error ? error.stack : '');
              console.error('Global error:', msg, error);
              return false;
            };
          </script>

          <script type="text/babel">
            const { useState, useEffect, useMemo } = React;

            (function() {
              try {
                console.log('Starting render...');
                const propsData = ${JSON.stringify(parsedData)};
                const elementStylesObject = ${JSON.stringify(elementStyles)};
                console.log('Props data loaded:', propsData);
                console.log('ElementStyles loaded:', elementStylesObject);

                ${processedCode}

                console.log('Component loaded:', typeof ${componentName});

                // 렌더링
                const rootElement = document.getElementById('root');
                console.log('Root element:', rootElement);

                // props 전달 (data와 elementStyles를 함께 전달)
                const root = ReactDOM.createRoot(rootElement);
                root.render(React.createElement(${componentName}, {
                  data: propsData,
                  elementStyles: elementStylesObject
                }));

                console.log('Render initiated with props:', { data: propsData, elementStyles: elementStylesObject });

                // data-key 기반 클릭 핸들러 등록 (MaterialEditorNew 스타일)
                const addClickHandlers = () => {
                  console.log('=== Adding click handlers (data-key based) ===');
                  console.log('📦 ElementStyles:', elementStylesObject);
                  console.log('📊 Total shapes:', Object.keys(elementStylesObject).length);

                  let totalHandlers = 0;
                  const allElementsWithDataKey = document.querySelectorAll('[data-key]');
                  console.log(\`🔍 Found \${allElementsWithDataKey.length} elements with data-key attribute\`);

                  allElementsWithDataKey.forEach((element, index) => {
                    const dataKey = element.getAttribute('data-key');

                    if (dataKey && elementStylesObject[dataKey]) {
                      element.classList.add('editable-shape');
                      console.log(\`  ✓ Element #\${index}: data-key="\${dataKey}"\`);

                      element.addEventListener('click', (e) => {
                        // body 클래스로 확인하여 closure 문제 방지
                        if (!document.body.classList.contains('edit-mode')) {
                          console.log('⏸️ View mode: click ignored');
                          return;
                        }

                        e.preventDefault();
                        e.stopPropagation();

                        console.log('🖱️ Element clicked!');
                        console.log('  data-key:', dataKey);
                        console.log('  Shape data:', elementStylesObject[dataKey]);

                        // 기존 선택 제거
                        document.querySelectorAll('.selected').forEach(el => {
                          el.classList.remove('selected');
                        });

                        // 현재 요소 선택
                        element.classList.add('selected');

                        // 부모 윈도우에 선택 알림 (MaterialEditorNew 스타일)
                        window.parent.postMessage({
                          type: 'shapeSelected',
                          shapeName: dataKey
                        }, '*');
                      });

                      totalHandlers++;
                    } else if (dataKey) {
                      console.warn(\`  ⚠️ Element has data-key="\${dataKey}" but not found in elementStyles\`);
                    }
                  });

                  console.log(\`=== Total click handlers added: \${totalHandlers} ===\`);

                  if (totalHandlers === 0) {
                    console.warn('⚠️ No click handlers were added! Retrying in 1 second...');
                    setTimeout(addClickHandlers, 1000);
                  } else {
                    console.log(\`✅ Click handlers setup complete! \${totalHandlers} elements are now clickable.\`);
                  }
                };

                // Try adding handlers after render
                setTimeout(addClickHandlers, 500);

                // 전역으로 노출하여 편집 모드 전환 시 호출 가능하게 함
                window.refreshClickHandlers = addClickHandlers;

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
  }, [reactCode, parsedData]); // elementStyles 제거 - 스타일 변경 시 iframe 재렌더링 방지

  // iframe에서 메시지 수신 (MaterialEditorNew 스타일: shapeSelected 타입 추가)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Message received from iframe:', event.data);

      // MaterialEditorNew 스타일: shapeSelected 처리
      if (event.data.type === 'shapeSelected') {
        console.log('=== Shape Selection ===');
        console.log('Shape name:', event.data.shapeName);
        console.log('Current elementStyles:', elementStyles);
        console.log('Shape data:', elementStyles[event.data.shapeName]);

        setSelectedShape(event.data.shapeName);
        setSelectedElementId(null); // 기존 선택 초기화
        setEditingStyles(null); // 기존 편집 스타일 초기화

        console.log('✅ Selected shape updated!');
      } else if (event.data.type === 'ELEMENT_SELECTED') {
        const elementId = event.data.elementId;
        setSelectedElementId(elementId);
        setSelectedShape(null); // 새 방식 선택 초기화

        // 요소 선택 시 자동으로 속성 불러오기
        setTimeout(() => {
          if (iframeRef.current) {
            const iframeDoc = iframeRef.current.contentDocument;
            if (!iframeDoc) return;

            const element = iframeDoc.querySelector(`[data-element-id="${elementId}"]`);
            if (!element) return;

            const computedStyle = element.ownerDocument?.defaultView?.getComputedStyle(element);
            if (!computedStyle) return;

            // 이미지 태그인지 확인
            const isImage = element.tagName.toLowerCase() === 'img';
            const imageSrc = isImage ? (element as HTMLImageElement).src : '';

            // 텍스트 내용 (이미지가 아닌 경우에만)
            const textContent = !isImage ? ((element as HTMLElement).textContent || '') : '';

            const loadedStyles = {
              position: computedStyle.position,
              left: computedStyle.left,
              top: computedStyle.top,
              width: computedStyle.width,
              height: computedStyle.height,
              backgroundColor: computedStyle.backgroundColor,
              color: computedStyle.color,
              fontSize: computedStyle.fontSize,
              fontWeight: computedStyle.fontWeight || 'normal',
              textAlign: computedStyle.textAlign,
              display: computedStyle.display || 'block',
              alignItems: computedStyle.alignItems || 'flex-start',
              justifyContent: computedStyle.justifyContent || 'flex-start',
              textContent: textContent,
              imageSrc: imageSrc
            };

            setEditingStyles(loadedStyles);
            console.log('Auto-loaded element styles');
          }
        }, 50);
      } else if (event.data.type === 'ELEMENT_MOVED') {
        // 드래그로 요소가 이동되었을 때
        const { elementId, left, top } = event.data;
        console.log('Element moved:', elementId, 'to', left, top);

        // 편집 중인 스타일이 있으면 업데이트
        if (editingStyles && selectedElementId === elementId) {
          setEditingStyles({
            ...editingStyles,
            left: left,
            top: top
          });
        }

        // React 코드에 즉시 반영
        updateReactCodePosition(elementId, left, top);
      } else if (event.data.type === 'ELEMENT_RESIZED') {
        // 크기 조절
        const { elementId, left, top, width, height } = event.data;
        console.log('Element resized:', elementId, width, height);

        // 편집 중인 스타일이 있으면 업데이트
        if (editingStyles && selectedElementId === elementId) {
          setEditingStyles({
            ...editingStyles,
            left: left,
            top: top,
            width: width,
            height: height
          });
        }

        // React 코드에 즉시 반영
        updateReactCodeSizeAndPosition(elementId, left, top, width, height);
      } else if (event.data.type === 'iframe-log') {
        // iframe 로그 처리
        const prefix = `[iframe ${event.data.level}]`;
        if (event.data.level === 'error') {
          console.error(prefix, ...event.data.args);
        } else {
          console.log(prefix, ...event.data.args);
        }
      }
    };

    console.log('Message listener attached');
    window.addEventListener('message', handleMessage);
    return () => {
      console.log('Message listener removed');
      window.removeEventListener('message', handleMessage);
    };
  }, [editingStyles, selectedElementId, elementStyles]);

  // 선택된 요소 가져오기
  const getSelectedElement = (): HTMLElement | null => {
    if (!selectedElementId || !iframeRef.current) return null;

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return null;

    return iframeDoc.querySelector(`[data-element-id="${selectedElementId}"]`);
  };

  // 드래그로 이동된 위치를 React 코드에 반영
  const updateReactCodePosition = async (elementId: string, left: string, top: string) => {
    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

    console.log('Updating position in code:', elementId, left, top);

    const lines = reactCode.split('\n');
    let divCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('<div') && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        if (divCount === elementIndex) {
          const styleMatch = line.match(/style=\{\{([^}]*)\}\}/);

          if (styleMatch) {
            let styleContent = styleMatch[1].trim();
            const styleObj: any = {};

            // 기존 스타일 파싱
            const stylePairs = styleContent.split(',').map(s => s.trim());
            stylePairs.forEach(pair => {
              const match = pair.match(/(\w+):\s*['"]([^'"]+)['"]/);
              if (match) {
                styleObj[match[1]] = match[2];
              }
            });

            // 위치만 업데이트
            styleObj.left = left;
            styleObj.top = top;

            const newStyleContent = Object.entries(styleObj)
              .map(([k, v]) => `${k}: '${v}'`)
              .join(', ');

            lines[i] = line.replace(/style=\{\{[^}]*\}\}/, `style={{ ${newStyleContent} }}`);
            console.log('Updated position in code');
          }

          break;
        }
        divCount++;
      }
    }

    const updatedCode = lines.join('\n');
    setReactCode(updatedCode);

    // 변경사항 표시 (저장 버튼 클릭 시 저장)
    setHasUnsavedChanges(true);
  };

  // 크기와 위치를 함께 React 코드에 반영
  const updateReactCodeSizeAndPosition = (elementId: string, left: string, top: string, width: string, height: string) => {
    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

    console.log('Updating size and position in code:', elementId, left, top, width, height);

    const lines = reactCode.split('\n');
    let divCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('<div') && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        if (divCount === elementIndex) {
          const styleMatch = line.match(/style=\{\{([^}]*)\}\}/);

          if (styleMatch) {
            let styleContent = styleMatch[1].trim();
            const styleObj: any = {};

            // 기존 스타일 파싱
            const stylePairs = styleContent.split(',').map(s => s.trim());
            stylePairs.forEach(pair => {
              const match = pair.match(/(\w+):\s*['"]([^'"]+)['"]/);
              if (match) {
                styleObj[match[1]] = match[2];
              }
            });

            // 위치와 크기 업데이트
            styleObj.left = left;
            styleObj.top = top;
            styleObj.width = width;
            styleObj.height = height;

            const newStyleContent = Object.entries(styleObj)
              .map(([k, v]) => `${k}: '${v}'`)
              .join(', ');

            lines[i] = line.replace(/style=\{\{[^}]*\}\}/, `style={{ ${newStyleContent} }}`);
            console.log('Updated size and position in code');
          }

          break;
        }
        divCount++;
      }
    }

    const updatedCode = lines.join('\n');
    setReactCode(updatedCode);

    // 변경사항 표시 (저장 버튼 클릭 시 저장)
    setHasUnsavedChanges(true);
  };

  // 백엔드에 코드 저장 (공통 함수) - 현재 사용되지 않음, handleSaveToServer로 대체
  const saveToBackend = async (updatedCode: string) => {
    if (!id || id === 'new' || !currentComponentId) return;

    try {
      const headers = await getAuthHeaders();

      console.log('💾 레이아웃 변경사항 자동 저장 중:', {
        conversionId: id,
        componentId: currentComponentId,
        codeLength: updatedCode.length
      });

      const params = new URLSearchParams({
        modified_code: updatedCode
      });

      const url = `${API_BASE_URL}/conversions/${id}/components/${currentComponentId}/code?${params}`;
      console.log('📡 PATCH 요청 URL:', url.substring(0, 200) + '...');
      console.log('📡 modified_code 길이:', updatedCode.length);
      console.log('📡 URL 전체 길이:', url.length);

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        mode: 'cors',
      });

      console.log('📡 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ 응답 에러 내용:', errorText);
        throw new Error(`서버 오류: ${response.status}`);
      }

      console.log('✅ 레이아웃 변경사항 자동 저장 완료');
    } catch (error: any) {
      console.error('❌ Auto-save error:', error);
      // 에러 토스트는 표시하지 않음 (백그라운드 저장이므로)
    }
  };

  // 백엔드에서 이미지 목록 가져오기
  const loadImageGallery = async () => {
    try {
      setLoadingImages(true);
      setIsImageGalleryOpen(true);

      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/images`, {
        method: 'GET',
        headers,
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ 이미지 목록 로드:', data);

      // API 응답 형식에 맞게 처리 (배열 또는 { images: [...] })
      const images: ImageData[] = Array.isArray(data) ? data : (data.images || []);
      setAvailableImages(images);
    } catch (error) {
      console.error('❌ 이미지 목록 로드 실패:', error);
      toast.error('이미지 목록을 불러오는 중 오류가 발생했습니다.');
      setAvailableImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  // 갤러리에 이미지 업로드
  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    if (!newImageName.trim()) {
      toast.error('이미지 이름을 입력해주세요.');
      return;
    }

    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', newImageName.trim());

      const headers = await getAuthHeadersForFormData();
      const response = await fetch(`${API_BASE_URL}/images`, {
        method: 'POST',
        headers,
        body: formData,
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      const uploadedImage = await response.json();
      console.log('✅ 이미지 업로드 성공:', uploadedImage);

      // 업로드된 이미지를 목록에 추가
      setAvailableImages(prev => [...prev, uploadedImage]);
      setNewImageName('');
      if (galleryImageInputRef.current) {
        galleryImageInputRef.current.value = '';
      }
      toast.success('이미지가 업로드되었습니다.');
    } catch (error) {
      console.error('❌ 이미지 업로드 실패:', error);
      toast.error('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingImage(false);
    }
  };

  // 갤러리에서 이미지 선택 (배경 이미지로 설정)
  const handleImageSelect = (image: ImageData) => {
    // data-key 기반 선택 모드 (selectedShape)
    if (selectedShape) {
      updateShapeStyle(selectedShape, "backgroundImage", `url('${image.image_url}')`);
      updateShapeStyle(selectedShape, "backgroundSize", "cover");
      updateShapeStyle(selectedShape, "backgroundPosition", "center");
      updateShapeStyle(selectedShape, "backgroundRepeat", "no-repeat");
      setIsImageGalleryOpen(false);
      toast.success(`'${image.name}' 배경 이미지가 적용되었습니다.`);
      return;
    }
    // element-id 기반 선택 모드 (editingStyles)
    if (editingStyles) {
      updateEditingStyle('imageSrc', image.image_url);
      setIsImageGalleryOpen(false);
      toast.success(`'${image.name}' 이미지가 선택되었습니다.`);
    }
  };

  // 이미지 파일 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedElementId) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    try {
      // TODO: 실제로는 S3에 업로드하고 URL 받아오기
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await fetch('/api/upload-image', {
      //   method: 'POST',
      //   body: formData
      // });
      // const { url } = await response.json();
      // updateEditingStyle('imageSrc', url);

      // 임시: 파일을 base64로 변환 (실제로는 S3 업로드)
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Image = event.target?.result as string;

        // 편집 스타일 업데이트
        if (editingStyles) {
          updateEditingStyle('imageSrc', base64Image);
        }

        toast.success('이미지가 업로드되었습니다.');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('이미지 업로드 중 오류가 발생했습니다.');
    }
  };

  // AI 채팅 메시지 전송
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    // Conversion ID와 Component ID 확인
    if (!id || id === 'new') {
      toast.error('저장된 자료만 AI 수정이 가능합니다. 먼저 자료를 저장해주세요.');
      return;
    }

    if (!currentComponentId) {
      toast.error('현재 페이지의 컴포넌트 정보를 찾을 수 없습니다.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: chatInput.trim(),
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const userRequest = chatInput.trim();
    setChatInput('');
    setIsChatLoading(true);

    try {
      let response;
      let result;

      // 코드 수정 모드: /code 엔드포인트 사용 (FormData만 사용)
      const formData = new FormData();
      formData.append('code', reactCode);  // 현재 코드 추가
      formData.append('user_request', userRequest);
      formData.append('preserve_functionality', 'true');

      // elementStyles (스타일 데이터) 추가
      if (elementStyles && Object.keys(elementStyles).length > 0) {
        formData.append('styles', JSON.stringify(elementStyles));
        console.log('🎨 스타일 데이터 첨부:', Object.keys(elementStyles).length, '개 요소');
      }

      // 파일이 있으면 추가
      if (uploadedFile) {
        formData.append('file', uploadedFile);
        console.log('📎 파일 첨부:', uploadedFile.name);
      }

      console.log('🤖 AI 코드 수정 요청 (FormData):', {
        conversionId: id,
        componentId: currentComponentId,
        request: userRequest,
        codeLength: reactCode.length,
        stylesCount: Object.keys(elementStyles).length,
        hasFile: !!uploadedFile,
        preserve_functionality: true
      });

      // FormData는 Content-Type을 자동으로 설정하므로 헤더에 추가하지 않음
      const headers = await getAuthHeadersForFormData();

      response = await fetch(
        `${API_BASE_URL}/conversions/${id}/components/${currentComponentId}/code`,
        {
          method: 'PUT',
          headers,
          body: formData,
          mode: 'cors',
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 백엔드 에러 응답:', errorText);

        let errorMessage = `서버 오류: ${response.status} ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage = `서버 오류: ${errorJson.detail}`;
          }
        } catch (e) {
          // JSON 파싱 실패 시 원본 텍스트 사용
          if (errorText) {
            errorMessage = `서버 오류: ${errorText}`;
          }
        }

        throw new Error(errorMessage);
      }

      result = await response.json();
      console.log('✅ AI 코드 수정 결과:', result);

      // 응답에서 수정된 코드 추출
      // 백엔드 응답이 객체일 수도 있고 직접 문자열일 수도 있음
      let modifiedCode = '';
      let summary = '코드가 수정되었습니다.';

      if (typeof result === 'string') {
        modifiedCode = result;
      } else if (result && typeof result === 'object') {
        modifiedCode = result.modified_code || result.code || result.generated_code || '';
        summary = result.summary || result.message || '코드가 수정되었습니다.';
      }

      console.log('📝 추출된 코드 길이:', modifiedCode.length);

      // 수정된 코드를 현재 페이지에 반영
      if (modifiedCode) {
        setReactCode(modifiedCode);
        setLatestAIModifiedCode(modifiedCode);
        setHasUnsavedChanges(true);

        // pages 배열도 업데이트
        setPages(prev => prev.map(page =>
          page.id === currentPageId
            ? { ...page, reactCode: modifiedCode }
            : page
        ));

        // AI가 생성한 코드를 DB에 자동 저장
        console.log('💾 AI 생성 코드를 DB에 자동 저장 중...');
        await saveToBackend(modifiedCode);

        toast.success('코드가 성공적으로 수정되고 저장되었습니다!');
      }

      // AI 응답 메시지 추가
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `✅ ${summary}\n\n변경 사항이 코드에 적용되고 저장되었습니다.`,
        timestamp: Date.now()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.message || 'AI 코드 수정 중 오류가 발생했습니다.');

      const errorMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `❌ 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
        timestamp: Date.now()
      };

      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
      // 파일 업로드 초기화
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 자료 정보 업데이트
  const handleUpdateConversionInfo = async () => {
    if (!id || id === 'new') {
      toast.error('저장된 자료만 업데이트할 수 있습니다.');
      return;
    }

    try {
      const headers = await getAuthHeaders();

      console.log('💾 자료 정보 업데이트 중:', {
        conversionId: id,
        content_name: contentName,
        description: description
      });

      const body = JSON.stringify({
        content_name: contentName,
        description: description
      });

      const response = await fetch(
        `${API_BASE_URL}/conversions/${id}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: body,
          mode: 'cors',
        }
      );

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ 자료 정보 저장 완료:', result);

      setIsEditingInfo(false);
      toast.success('자료 정보가 저장되었습니다!');
    } catch (error: any) {
      console.error('Update info error:', error);
      toast.error(error.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // 서버에 코드와 데이터 저장
  const handleSaveToServer = async () => {
    if (!id || id === 'new') {
      toast.error('저장된 자료만 업데이트할 수 있습니다.');
      return;
    }

    if (!currentComponentId) {
      toast.error('현재 페이지의 컴포넌트 정보를 찾을 수 없습니다.');
      return;
    }

    if (!latestAIModifiedCode && !hasUnsavedChanges) {
      toast.error('저장할 변경사항이 없습니다.');
      return;
    }

    try {
      const headers = await getAuthHeaders();

      // 코드 수정 모드: /code 엔드포인트 사용
      const codeToSave = latestAIModifiedCode || reactCode;

      console.log('💾 서버에 코드 저장 중:', {
        conversionId: id,
        componentId: currentComponentId,
        codeLength: codeToSave.length
      });

      // PATCH 요청으로 modified_code 전달
      const params = new URLSearchParams({
        modified_code: codeToSave
      });

      const response = await fetch(
        `${API_BASE_URL}/conversions/${id}/components/${currentComponentId}/code?${params}`,
        {
          method: 'PATCH',
          headers,
          mode: 'cors',
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ 응답 에러 내용:', errorText);
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      // 응답이 있는 경우에만 JSON 파싱
      let result = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
        console.log('✅ 서버 코드 저장 완료:', result);
      } else {
        console.log('✅ 서버 코드 저장 완료 (응답 없음)');
      }

      setHasUnsavedChanges(false);
      toast.success('코드가 서버에 저장되었습니다!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // 파일 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.success(`파일 "${file.name}"이 첨부되었습니다.`);
    }
  };

  // 파일 제거 핸들러
  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('파일이 제거되었습니다.');
  };

  // 채팅 스크롤 자동 이동
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // MaterialEditorNew 스타일: elementStyles 기반 스타일 업데이트
  // State 즉시 업데이트 + iframe DOM 직접 조작 (debounce 1.5초)
  const updateShapeStyle = (shapeName: string, styleKey: string, value: string | number) => {
    console.log(`Updating ${shapeName}.${styleKey} to:`, value);

    // State 즉시 업데이트 (Input 반영)
    setElementStyles((prev: Record<string, ElementStyleData>) => ({
      ...prev,
      [shapeName]: {
        ...prev[shapeName],
        style: {
          ...(prev[shapeName]?.style || {}),
          [styleKey]: value
        }
      }
    }));

    // iframe DOM 직접 업데이트 (debounce 적용)
    const updateKey = `${shapeName}.${styleKey}`;
    pendingStyleUpdatesRef.current[updateKey] = { shapeName, styleKey, value };

    if (styleUpdateTimerRef.current) {
      clearTimeout(styleUpdateTimerRef.current);
    }

    styleUpdateTimerRef.current = setTimeout(() => {
      if (iframeRef.current) {
        const iframeDoc = iframeRef.current.contentDocument;
        if (iframeDoc) {
          const updates = { ...pendingStyleUpdatesRef.current };
          Object.values(updates).forEach(({ shapeName: sName, styleKey: sKey, value: sValue }) => {
            const elements = iframeDoc.querySelectorAll(`[data-key="${sName}"]`);
            elements.forEach((element: Element) => {
              (element as HTMLElement).style[sKey as any] = String(sValue);
            });
          });
          console.log('✅ iframe preview updated');
        }
      }
      pendingStyleUpdatesRef.current = {};
      styleUpdateTimerRef.current = null;
    }, 1500);
  };

  // MaterialEditorNew 스타일: 스타일 속성 삭제
  const deleteShapeStyleProperty = (shapeName: string, styleKey: string) => {
    console.log(`Deleting ${shapeName}.${styleKey}`);

    setElementStyles((prev: Record<string, ElementStyleData>) => {
      const newStyles = { ...prev };
      if (newStyles[shapeName]?.style) {
        const updatedStyle = { ...newStyles[shapeName].style };
        delete updatedStyle[styleKey];
        newStyles[shapeName] = {
          ...newStyles[shapeName],
          style: updatedStyle
        };
      }
      return newStyles;
    });

    // Remove from iframe element
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument;
      if (iframeDoc) {
        const elements = iframeDoc.querySelectorAll(`[data-key="${shapeName}"]`);
        elements.forEach((element: Element) => {
          (element as HTMLElement).style[styleKey as any] = '';
        });
      }
    }
  };

  // MaterialEditorNew 스타일: className 업데이트
  const updateShapeClassName = (shapeName: string, newClassName: string) => {
    console.log(`Updating ${shapeName} className to:`, newClassName);

    setElementStyles((prev: Record<string, ElementStyleData>) => ({
      ...prev,
      [shapeName]: {
        ...prev[shapeName],
        className: newClassName
      }
    }));
  };

  // MaterialEditorNew 스타일: 선택된 shape 데이터
  const selectedShapeData = selectedShape ? elementStyles[selectedShape] : null;

  // MaterialEditorNew 스타일: elementStyles 저장
  const handleSaveElementStyles = async () => {
    if (!id || id === 'new') {
      toast.error('저장된 자료만 업데이트할 수 있습니다.');
      return;
    }

    try {
      console.log('💾 ElementStyles 저장 시작...');
      console.log('현재 elementStyles:', elementStyles);

      const headers = await getAuthHeaders();

      // 현재 페이지 찾기
      const currentPage = pages.find(p => p.id === currentPageId);
      if (!currentPage?.slideId) {
        toast.error('슬라이드 정보를 찾을 수 없습니다.');
        return;
      }

      // absolute를 fixed로 변환 (저장용)
      const storedStyles: Record<string, ElementStyleData> = {};
      Object.keys(elementStyles).forEach(key => {
        storedStyles[key] = { ...elementStyles[key] };
        if (storedStyles[key]?.className) {
          storedStyles[key].className = storedStyles[key].className!
            .replace(/\babsolute\b/g, 'fixed');
        }
      });

      console.log('저장할 스타일 (fixed로 변환):', storedStyles);

      // API 호출하여 styles 업데이트
      const response = await fetch(
        `${API_BASE_URL}/conversions/${id}/slides/${currentPage.slideId}/styles`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            styles: storedStyles,
            component_id: currentPage.componentId
          }),
          mode: 'cors',
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ 응답 에러:', errorText);
        throw new Error(`서버 오류: ${response.status}`);
      }

      console.log('✅ ElementStyles 저장 완료');
      toast.success('스타일이 저장되었습니다!');

    } catch (error: any) {
      console.error('❌ ElementStyles 저장 실패:', error);
      toast.error(error.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // 편집 중인 스타일 값 변경 (임시 저장) 및 실시간 미리보기
  const updateEditingStyle = (property: keyof typeof editingStyles, value: string) => {
    if (!editingStyles) return;

    // 편집 상태 업데이트
    setEditingStyles({
      ...editingStyles,
      [property]: value
    });

    // 실시간으로 iframe에 반영
    const element = getSelectedElement();
    if (element) {
      if (property === 'textContent') {
        element.textContent = value;
      } else if (property === 'imageSrc') {
        // 이미지 src 업데이트
        if (element.tagName.toLowerCase() === 'img') {
          (element as HTMLImageElement).src = value;
        }
      } else if (property === 'left' || property === 'top' || property === 'width' || property === 'height') {
        element.style[property] = value;
      } else if (property === 'backgroundColor' || property === 'color' || property === 'fontSize' || property === 'fontWeight' || property === 'textAlign' || property === 'display' || property === 'alignItems' || property === 'justifyContent') {
        element.style[property as any] = value;
      }
    }
  };

  // 저장 버튼 - 변경사항을 실제로 적용
  const saveStyleChanges = async () => {
    console.log('🔵 saveStyleChanges 호출됨');
    console.log('editingStyles:', editingStyles);
    console.log('selectedElementId:', selectedElementId);
    console.log('id:', id);
    console.log('currentComponentId:', currentComponentId);

    if (!editingStyles || !selectedElementId) {
      toast.error('저장할 변경사항이 없습니다');
      console.log('❌ 조건 실패: editingStyles 또는 selectedElementId 없음');
      return;
    }

    const element = getSelectedElement();
    if (!element) {
      toast.error('요소를 찾을 수 없습니다');
      console.log('❌ 조건 실패: 요소를 찾을 수 없음');
      return;
    }

    if (!id || id === 'new') {
      toast.error('저장된 자료만 업데이트할 수 있습니다.');
      console.log('❌ 조건 실패: id가 없거나 new');
      return;
    }

    try {
      console.log('=== 저장 시작 ===');

      // 1. React 코드 업데이트 (한 번에 처리)
      const updatedCode = updateReactCodeBatch(selectedElementId, editingStyles);

      if (!updatedCode) {
        toast.error('코드 업데이트에 실패했습니다.');
        console.log('❌ 조건 실패: updateReactCodeBatch 반환값 없음');
        return;
      }

      console.log('✅ React 코드 업데이트 완료');

      // 2. 서버에 저장
      const headers = await getAuthHeaders();

      if (!currentComponentId) {
        toast.error('컴포넌트 ID를 찾을 수 없습니다.');
        console.log('❌ 조건 실패: currentComponentId 없음');
        return;
      }

      console.log('💾 서버에 저장 중:', {
        conversionId: id,
        componentId: currentComponentId,
        codeLength: updatedCode.length
      });

      // PATCH 요청으로 modified_code를 쿼리 파라미터로 전달
      const params = new URLSearchParams({
        modified_code: updatedCode
      });

      const url = `${API_BASE_URL}/conversions/${id}/components/${currentComponentId}/code?${params}`;
      console.log('📡 PATCH 요청 URL:', url.substring(0, 200) + '...');
      console.log('📡 modified_code 길이:', updatedCode.length);
      console.log('📡 URL 전체 길이:', url.length);
      console.log('📡 Headers:', headers);

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        mode: 'cors',
      });

      console.log('📡 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ 응답 에러 내용:', errorText);
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      // 응답이 있는 경우에만 JSON 파싱
      let result = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
        console.log('✅ 서버 저장 완료:', result);
      } else {
        console.log('✅ 서버 저장 완료 (응답 없음)');
      }

      // 3. iframe이 자동으로 재렌더링됨 (useEffect의 reactCode 의존성)
      toast.success('변경사항이 저장되었습니다');
      console.log('=== 저장 완료 ===');

      // 4. 편집 상태 초기화 (선택 유지)
      setEditingStyles(null);

    } catch (error: any) {
      console.error('❌ Save error:', error);
      toast.error(error.message || '저장 중 오류가 발생했습니다');
    }
  };

  // React 코드 및 JSON 데이터 일괄 업데이트
  const updateReactCodeBatch = (elementId: string, styles: typeof editingStyles) => {
    if (!elementId || !styles) return;

    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

    console.log('=== 코드 업데이트 시작 ===');
    console.log('Element Index:', elementIndex);
    console.log('Styles to update:', styles);

    const lines = reactCode.split('\n');
    let divCount = 0;
    let updated = false;
    let dataBindingKey: string | null = null;

    console.log('🔍 총 라인 수:', lines.length);
    console.log('🔍 찾는 element index:', elementIndex);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // <div> 또는 <img> 태그 찾기 (JSX와 React.createElement 모두 지원)
      const isDiv = (line.includes('<div') || line.includes("'div'")) && !line.trim().startsWith('//') && !line.trim().startsWith('/*');
      const isImg = (line.includes('<img') || line.includes("'img'")) && !line.trim().startsWith('//') && !line.trim().startsWith('/*');

      if (isDiv || isImg) {
        console.log(`🔍 발견한 div/img (count: ${divCount}, index: ${i}):`, line.substring(0, 100));
        if (divCount === elementIndex) {
          console.log('✅ Found target element at line', i, ':', line);

          // 이미지 태그인 경우 src 속성 업데이트
          if (isImg && styles.imageSrc) {
            console.log('Updating image src:', styles.imageSrc);

            // src 속성 업데이트
            if (line.includes('src=')) {
              // 기존 src 교체
              lines[i] = line.replace(/src=['"]([^'"]*)['"]/g, `src="${styles.imageSrc}"`);
            } else {
              // src 속성 추가
              lines[i] = line.replace(/<img/, `<img src="${styles.imageSrc}"`);
            }
            updated = true;
          }

          // 기존 style 속성 찾기
          const styleMatch = line.match(/style=\{\{([^}]*)\}\}/);

          if (styleMatch) {
            // 기존 style이 있으면 업데이트
            let styleContent = styleMatch[1].trim();
            console.log('Original style content:', styleContent);

            // style 객체를 파싱
            const styleObj: any = {};

            // 기존 스타일 파싱 (left: '10px', top: '20px' 형식)
            const stylePairs = styleContent.split(',').map(s => s.trim());
            stylePairs.forEach(pair => {
              const match = pair.match(/(\w+):\s*['"]([^'"]+)['"]/);
              if (match) {
                styleObj[match[1]] = match[2];
              }
            });

            // 새로운 값으로 업데이트 (모든 스타일 속성)
            styleObj.left = styles.left;
            styleObj.top = styles.top;
            styleObj.width = styles.width;
            styleObj.height = styles.height;
            styleObj.backgroundColor = styles.backgroundColor;
            styleObj.color = styles.color;
            styleObj.fontSize = styles.fontSize;
            styleObj.fontWeight = styles.fontWeight;
            styleObj.textAlign = styles.textAlign;
            styleObj.display = styles.display;
            styleObj.alignItems = styles.alignItems;
            styleObj.justifyContent = styles.justifyContent;

            // 다시 문자열로 변환
            const newStyleContent = Object.entries(styleObj)
              .map(([k, v]) => `${k}: '${v}'`)
              .join(', ');

            lines[i] = line.replace(/style=\{\{[^}]*\}\}/, `style={{ ${newStyleContent} }}`);
            console.log('Updated line:', lines[i]);
            updated = true;
          } else {
            // style 속성이 없으면 추가 (모든 스타일 속성 포함)
            const styleStr = `left: '${styles.left}', top: '${styles.top}', width: '${styles.width}', height: '${styles.height}', backgroundColor: '${styles.backgroundColor}', color: '${styles.color}', fontSize: '${styles.fontSize}', fontWeight: '${styles.fontWeight}', textAlign: '${styles.textAlign}', display: '${styles.display}', alignItems: '${styles.alignItems}', justifyContent: '${styles.justifyContent}'`;

            if (line.includes('className=')) {
              lines[i] = line.replace(/className=/, `style={{ ${styleStr} }} className=`);
            } else {
              // > 앞에 추가
              lines[i] = line.replace(/>/, ` style={{ ${styleStr} }}>`);
            }
            console.log('Added style to line:', lines[i]);
            updated = true;
          }

          // 텍스트 내용 확인 - {data.xxx} 패턴인지 체크
          const trimmedText = styles.textContent?.trim();
          if (trimmedText && trimmedText.length > 0) {
            console.log('Checking text content:', trimmedText);

            // 같은 줄에 </div>가 있는지 확인
            if (lines[i].includes('</div>')) {
              const textMatch = lines[i].match(/>(.*?)<\/div>/);
              if (textMatch) {
                const currentText = textMatch[1].trim();
                console.log('Current text in same line:', currentText);

                // {data.xxx} 패턴 찾기
                const dataMatch = currentText.match(/\{data\.(\w+)\}/);
                if (dataMatch) {
                  dataBindingKey = dataMatch[1];
                  console.log('Found data binding key:', dataBindingKey);
                } else {
                  // 데이터 바인딩이 아니면 직접 텍스트 교체
                  lines[i] = lines[i].replace(/>[^<]*<\/div>/, `>${trimmedText}</div>`);
                  console.log('Updated text directly:', lines[i]);
                }
              }
            } else {
              // 여러 줄 패턴
              for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                if (lines[j].includes('</div>')) {
                  for (let k = i + 1; k < j; k++) {
                    const textLine = lines[k].trim();
                    if (textLine && !textLine.startsWith('<') && !textLine.startsWith('//')) {
                      console.log('Found text line:', textLine);

                      // {data.xxx} 패턴 찾기
                      const dataMatch = textLine.match(/\{data\.(\w+)\}/);
                      if (dataMatch) {
                        dataBindingKey = dataMatch[1];
                        console.log('Found data binding key in multiline:', dataBindingKey);
                      } else {
                        // 데이터 바인딩이 아니면 직접 텍스트 교체
                        const indent = lines[k].match(/^\s*/)?.[0] || '      ';
                        lines[k] = indent + trimmedText;
                        console.log('Updated text directly in multiline:', lines[k]);
                      }
                      break;
                    }
                  }
                  break;
                }
              }
            }
          }

          break;
        }
        divCount++;
      }
    }

    // React 코드 업데이트
    const updatedCode = lines.join('\n');
    console.log('=== 업데이트된 코드 미리보기 (첫 20줄) ===');
    console.log(updatedCode.split('\n').slice(0, 20).join('\n'));

    if (updated) {
      setReactCode(updatedCode);
    }

    // JSON 데이터 업데이트 (데이터 바인딩이 있는 경우)
    if (dataBindingKey && styles.textContent) {
      console.log('Updating JSON data:', dataBindingKey, '=', styles.textContent);

      try {
        const currentData = JSON.parse(jsonData);
        currentData[dataBindingKey] = styles.textContent;
        const updatedJson = JSON.stringify(currentData, null, 2);
        setJsonData(updatedJson);
        console.log('JSON data updated');
      } catch (error) {
        console.error('Failed to update JSON data:', error);
      }
    }

    console.log('=== 코드 업데이트 완료 ===');
    console.log('updated 플래그:', updated);

    // 업데이트된 코드를 항상 반환 (updated 플래그와 관계없이)
    // 로컬 state는 이미 setReactCode로 업데이트되었으므로
    // 현재 reactCode를 반환하여 서버에 저장
    return updatedCode;
  };

  // React 코드에서 해당 요소의 속성을 업데이트
  const updateReactCode = (elementId: string | null, property: string, value: string) => {
    if (!elementId) return;

    // element-0, element-1... 형태에서 인덱스 추출
    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

    // React 코드를 줄 단위로 분리
    const lines = reactCode.split('\n');

    // div 태그를 찾아서 카운트
    let divCount = 0;
    let targetLineIndex = -1;
    let inTargetDiv = false;
    let bracketDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // <div로 시작하는 라인 찾기
      if (line.includes('<div') && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        if (divCount === elementIndex) {
          targetLineIndex = i;
          inTargetDiv = true;

          // 해당 div와 다음 몇 줄을 확인하여 업데이트
          if (property === 'textContent') {
            // 텍스트 내용 업데이트
            let foundClosingTag = false;

            for (let j = i; j < Math.min(i + 15, lines.length); j++) {
              const currentLine = lines[j];

              // 같은 줄에 여는 태그와 닫는 태그가 있는 경우: <div...>텍스트</div>
              if (j === i && currentLine.includes('</div>')) {
                const match = currentLine.match(/>([^<]*)<\/div>/);
                if (match) {
                  // {data.xxx} 패턴인지 확인
                  const contentMatch = match[1].match(/\{data\.\w+\}/);
                  if (contentMatch) {
                    lines[j] = currentLine.replace(/>\{data\.\w+\}<\/div>/, `>{data.${value.replace(/[{}]/g, '')}}</div>`);
                  } else {
                    lines[j] = currentLine.replace(/>([^<]*)<\/div>/, `>${value}</div>`);
                  }
                  foundClosingTag = true;
                  break;
                }
              }

              // 닫는 태그를 찾음
              if (j > i && currentLine.includes('</div>')) {
                // 바로 이전 줄이 텍스트인지 확인
                for (let k = j - 1; k > i; k--) {
                  const textLine = lines[k].trim();

                  // 빈 줄이나 다른 태그는 건너뛰기
                  if (!textLine || textLine.startsWith('<') || textLine.startsWith('//') || textLine.startsWith('/*')) {
                    continue;
                  }

                  // 텍스트 라인 찾음
                  const indent = lines[k].match(/^\s*/)?.[0] || '';

                  // {data.xxx} 패턴인지 확인
                  if (textLine.includes('{data.')) {
                    lines[k] = indent + `{data.${value.replace(/[{}data.]/g, '')}}`;
                  } else {
                    lines[k] = indent + value;
                  }

                  foundClosingTag = true;
                  break;
                }

                if (foundClosingTag) break;
              }
            }
          } else {
            // 스타일 속성 업데이트
            const styleMatch = line.match(/style=\{\{([^}]+)\}\}/);

            if (styleMatch) {
              // 기존 style 객체가 있는 경우
              let styleContent = styleMatch[1];

              // 속성 이름을 CSS에서 camelCase로 변환
              const cssProperty = property === 'backgroundColor' ? 'backgroundColor' :
                                  property === 'fontSize' ? 'fontSize' :
                                  property === 'textAlign' ? 'textAlign' : property;

              // 해당 속성이 이미 있는지 확인
              const propertyRegex = new RegExp(`${cssProperty}:\\s*['"][^'"]*['"]`);

              if (styleContent.match(propertyRegex)) {
                // 기존 속성 업데이트
                styleContent = styleContent.replace(propertyRegex, `${cssProperty}: '${value}'`);
              } else {
                // 새 속성 추가
                styleContent += `, ${cssProperty}: '${value}'`;
              }

              lines[i] = line.replace(/style=\{\{[^}]+\}\}/, `style={{${styleContent}}}`);
            } else {
              // style 속성이 없는 경우 - className 뒤나 태그 끝에 추가
              if (property === 'left' || property === 'top' || property === 'width' || property === 'height') {
                // 인라인 style 추가 (position/size 속성)
                // className이 있는지 확인
                if (line.includes('className=')) {
                  lines[i] = line.replace('className="', `style={{ ${property}: '${value}' }} className="`);
                } else if (line.includes('>')) {
                  lines[i] = line.replace('>', ` style={{ ${property}: '${value}' }}>`);
                }
              }
            }
          }
          break;
        }
        divCount++;
      }
    }

    // 업데이트된 코드 적용
    const updatedCode = lines.join('\n');
    setReactCode(updatedCode);
  };

  // 요소 삭제 및 React 코드 동기화
  const deleteElement = () => {
    const element = getSelectedElement();
    if (!element || !selectedElementId) return;

    if (confirm('이 요소를 삭제하시겠습니까?')) {
      // 1. iframe에서 요소 제거
      element.remove();

      // 2. React 코드에서 해당 요소 제거
      deleteFromReactCode(selectedElementId);

      setSelectedElementId(null);
      toast.success('요소가 삭제되었습니다');
    }
  };

  // React 코드에서 요소 삭제
  const deleteFromReactCode = (elementId: string) => {
    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

    const lines = reactCode.split('\n');
    let divCount = 0;
    let startLine = -1;
    let endLine = -1;
    let depth = 0;

    // 해당 div의 시작과 끝 라인 찾기
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('<div') && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        if (divCount === elementIndex) {
          startLine = i;

          // 주석도 함께 삭제 (바로 위 줄이 주석이면)
          if (i > 0 && lines[i - 1].trim().startsWith('{/*')) {
            startLine = i - 1;
          }

          // 같은 줄에 </div>가 있는지 확인 (자기 닫는 태그)
          if (line.includes('</div>') || line.includes('/>')) {
            endLine = i;
            break;
          }

          // 여러 줄에 걸친 div 찾기
          depth = 1;
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes('<div')) depth++;
            if (lines[j].includes('</div>')) {
              depth--;
              if (depth === 0) {
                endLine = j;
                break;
              }
            }
          }
          break;
        }
        divCount++;
      }
    }

    if (startLine !== -1 && endLine !== -1) {
      // 해당 라인들 삭제
      lines.splice(startLine, endLine - startLine + 1);

      // 업데이트된 코드 적용
      const updatedCode = lines.join('\n');
      setReactCode(updatedCode);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 상단 툴바 */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/materials-v2')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로가기
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* 되돌리기/다시실행 버튼 */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="되돌리기 (Ctrl+Z)"
                className="h-8 px-2"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="다시실행 (Ctrl+Shift+Z)"
                className="h-8 px-2"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            {/* 히스토리 상태 표시 */}
            {history.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {historyIndex + 1} / {history.length}
              </span>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* 편집/보기 모드 토글 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
              <span className={`text-sm font-medium ${editMode ? 'text-foreground' : 'text-muted-foreground'}`}>
                {editMode ? '편집 모드' : '보기 모드'}
              </span>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editMode ? 'bg-mango-green' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    editMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              미리보기
            </Button>
          </div>
        </div>

        {/* 자료 정보 편집 */}
        <div className="flex items-center gap-4">
          {!isEditingInfo ? (
            <>
              <div className="flex-1">
                <p className="text-sm font-medium">{contentName || '제목 없음'}</p>
                <p className="text-xs text-muted-foreground">{description || '설명 없음'}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingInfo(true)}
              >
                편집
              </Button>
            </>
          ) : (
            <>
              <div className="flex-1 flex gap-2">
                <Input
                  value={contentName}
                  onChange={(e) => setContentName(e.target.value)}
                  placeholder="자료명"
                  className="h-8"
                />
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="설명"
                  className="h-8"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingInfo(false);
                    // 원래 값으로 되돌리기
                    setContentName(conversionData?.content_name || '');
                    setDescription(conversionData?.description || '');
                  }}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  className="bg-mango-green hover:bg-mango-green/90 text-white"
                  onClick={handleUpdateConversionInfo}
                >
                  저장
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 왼쪽 - 페이지 & 데이터 */}
        <div
          className={`border-r border-border bg-card flex flex-col transition-all duration-300 ${
            isLeftPanelOpen ? 'w-96' : 'w-0'
          }`}
          style={{
            overflow: isLeftPanelOpen ? 'visible' : 'hidden',
            opacity: isLeftPanelOpen ? 1 : 0
          }}
        >
          <Tabs defaultValue="slides" className="h-full flex flex-col">
            <div className="px-4 pt-4 pb-2 border-b border-border">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="slides">
                  <Layers className="w-4 h-4 mr-2" />
                  페이지
                </TabsTrigger>
                <TabsTrigger value="data">
                  <Database className="w-4 h-4 mr-2" />
                  데이터
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="slides" className="m-0 p-4 overflow-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <Label>페이지 목록</Label>
                  <Button size="sm" onClick={addPage} variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                </div>
                <div className="space-y-2">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        currentPageId === page.id
                          ? 'bg-mango-green/10 border-mango-green'
                          : 'bg-card border-border hover:bg-muted'
                      }`}
                      onClick={() => setCurrentPageId(page.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{page.name}</span>
                        {pages.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePage(page.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        데이터: {page.jsonData ? `${page.jsonData.length}자` : '없음'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data" className="flex-1 flex flex-col m-0 p-4">
              <div className="flex-1 flex flex-col">
                <Label className="mb-2">JSON 데이터</Label>
                <Textarea
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  className="flex-1 font-mono text-xs resize-none min-h-[500px]"
                  placeholder='{"key": "value"}'
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 토글 버튼 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          className="absolute left-0 top-4 z-10 rounded-r-md rounded-l-none border-l-0 h-20 px-2"
          style={{
            left: isLeftPanelOpen ? '384px' : '0px',
            transition: 'left 0.3s ease'
          }}
        >
          {isLeftPanelOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>

        {/* 중앙 - 렌더링된 웹사이트 */}
        <div className="flex-1 bg-muted/20 overflow-auto flex items-center justify-center p-8">
          <div
            className="bg-white rounded-lg shadow-2xl overflow-hidden"
            style={{
              width: '1280px',
              height: '720px',
              minWidth: '1280px',
              minHeight: '720px',
              maxWidth: '1280px',
              maxHeight: '720px'
            }}
          >
            {!reactCode.trim() ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Code className="w-20 h-20 mb-4 opacity-20" />
                <p className="text-lg font-semibold">렌더링할 코드가 없습니다</p>
                <p className="text-sm mt-2">실제 웹사이트가 렌더링됩니다 (1280×720, 16:9)</p>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                title="rendered-content"
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        </div>

        {/* 오른쪽 - 속성 편집 패널 */}
        <div className="border-l border-border bg-card flex flex-col" style={{ width: '320px', height: '100%' }}>
          <Tabs defaultValue="properties" className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="properties" className="text-xs h-7">
                  <Move className="w-3 h-3 mr-1" />
                  속성
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-xs h-7">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI 편집
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 탭 콘텐츠 영역 - relative 컨테이너 */}
            <div className="flex-1 relative min-h-0">
              {/* 속성 편집 탭 */}
              <TabsContent value="properties" className="absolute inset-0 m-0 flex flex-col data-[state=inactive]:hidden">
                {/* 상단: 콘텐츠 편집 영역 */}
                <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* 선택 안 된 상태 (기존 방식 + 새 방식 둘 다 체크) */}
                  {!selectedShape && !selectedElementId ? (
                    <div className="text-center text-muted-foreground py-16">
                      <Move className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">요소를 선택하세요</p>
                      <p className="text-xs mt-1">화면에서 요소를 클릭하면 편집할 수 있습니다</p>
                    </div>
                  ) : selectedShape && selectedShapeData ? (
                    /* MaterialEditorNew 스타일: data-key 기반 편집 UI */
                    <>
                      {/* 위치 */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">위치</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">X (left)</Label>
                            <Input
                              type="number"
                              value={String(selectedShapeData.style?.left || "").replace('px', '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateShapeStyle(selectedShape, "left", value ? `${value}px` : "");
                              }}
                              placeholder="0"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Y (top)</Label>
                            <Input
                              type="number"
                              value={String(selectedShapeData.style?.top || "").replace('px', '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateShapeStyle(selectedShape, "top", value ? `${value}px` : "");
                              }}
                              placeholder="0"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 크기 */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">크기</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">너비 (px)</Label>
                            <Input
                              type="number"
                              value={String(selectedShapeData.style?.width || "").replace('px', '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateShapeStyle(selectedShape, "width", value ? `${value}px` : "");
                              }}
                              placeholder="auto"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">높이 (px)</Label>
                            <Input
                              type="number"
                              value={String(selectedShapeData.style?.height || "").replace('px', '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateShapeStyle(selectedShape, "height", value ? `${value}px` : "");
                              }}
                              placeholder="auto"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 글씨 색상 */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">글씨 색상</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={String(selectedShapeData.style?.color || "#000000")}
                            onChange={(e) => updateShapeStyle(selectedShape, "color", e.target.value)}
                            className="w-12 h-8 cursor-pointer"
                          />
                          <Input
                            value={String(selectedShapeData.style?.color || "")}
                            onChange={(e) => updateShapeStyle(selectedShape, "color", e.target.value)}
                            placeholder="색상"
                            className="flex-1 h-8 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* 배경색 */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">배경색</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={String(selectedShapeData.style?.backgroundColor || "#ffffff")}
                            onChange={(e) => updateShapeStyle(selectedShape, "backgroundColor", e.target.value)}
                            className="w-12 h-8 cursor-pointer"
                          />
                          <Input
                            value={String(selectedShapeData.style?.backgroundColor || "")}
                            onChange={(e) => updateShapeStyle(selectedShape, "backgroundColor", e.target.value)}
                            placeholder="배경색"
                            className="flex-1 h-8 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* 배경 이미지 */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">배경 이미지</Label>
                        <div className="space-y-2">
                          <Input
                            type="text"
                            value={String(selectedShapeData.style?.backgroundImage || "").replace(/^url\(['"]?|['"]?\)$/g, '')}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value) {
                                updateShapeStyle(selectedShape, "backgroundImage", `url('${value}')`);
                                updateShapeStyle(selectedShape, "backgroundSize", "cover");
                                updateShapeStyle(selectedShape, "backgroundPosition", "center");
                                updateShapeStyle(selectedShape, "backgroundRepeat", "no-repeat");
                              } else {
                                updateShapeStyle(selectedShape, "backgroundImage", "");
                                updateShapeStyle(selectedShape, "backgroundSize", "");
                                updateShapeStyle(selectedShape, "backgroundPosition", "");
                                updateShapeStyle(selectedShape, "backgroundRepeat", "");
                              }
                            }}
                            placeholder="이미지 URL 입력"
                            className="h-8 text-xs font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8"
                            onClick={loadImageGallery}
                          >
                            <ImageIcon className="w-3 h-3 mr-1" />
                            이미지 갤러리
                          </Button>
                          {selectedShapeData.style?.backgroundImage && (
                            <div className="mt-2 p-2 bg-muted/50 rounded border">
                              <img
                                src={String(selectedShapeData.style.backgroundImage).replace(/^url\(['"]?|['"]?\)$/g, '')}
                                alt="현재 배경"
                                className="w-full h-16 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 테두리 */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">테두리</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={(() => {
                              const border = String(selectedShapeData.style?.border || "");
                              if (border.includes("solid")) return "solid";
                              if (border.includes("dashed")) return "dashed";
                              if (border.includes("dotted")) return "dotted";
                              if (border.includes("double")) return "double";
                              return "none";
                            })()}
                            onChange={(e) => {
                              const style = e.target.value;
                              if (style === "none") {
                                updateShapeStyle(selectedShape, "border", "none");
                              } else {
                                const currentBorder = String(selectedShapeData.style?.border || "1px solid #000000");
                                const parts = currentBorder.split(" ");
                                const width = parts[0] || "1px";
                                const color = parts[2] || "#000000";
                                updateShapeStyle(selectedShape, "border", `${width} ${style} ${color}`);
                              }
                            }}
                            className="h-8 px-2 text-xs border rounded-md bg-background"
                          >
                            <option value="none">없음</option>
                            <option value="solid">실선</option>
                            <option value="dashed">대시</option>
                            <option value="dotted">점선</option>
                            <option value="double">이중선</option>
                          </select>
                          <Input
                            type="number"
                            value={(() => {
                              const border = String(selectedShapeData.style?.border || "");
                              const match = border.match(/(\d+)/);
                              return match ? match[1] : "";
                            })()}
                            onChange={(e) => {
                              const width = e.target.value;
                              if (width) {
                                const currentBorder = String(selectedShapeData.style?.border || "1px solid #000000");
                                const parts = currentBorder.split(" ");
                                const style = parts[1] || "solid";
                                const color = parts[2] || "#000000";
                                updateShapeStyle(selectedShape, "border", `${width}px ${style} ${color}`);
                              }
                            }}
                            placeholder="두께"
                            className="h-8 text-xs"
                          />
                          <Input
                            type="color"
                            value={(() => {
                              const border = String(selectedShapeData.style?.border || "");
                              const match = border.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
                              return match ? match[0] : "#000000";
                            })()}
                            onChange={(e) => {
                              const color = e.target.value;
                              const currentBorder = String(selectedShapeData.style?.border || "1px solid #000000");
                              const parts = currentBorder.split(" ");
                              const width = parts[0] || "1px";
                              const style = parts[1] || "solid";
                              updateShapeStyle(selectedShape, "border", `${width} ${style} ${color}`);
                            }}
                            className="h-8 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* 모서리 둥글기 */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">모서리 둥글기 (px)</Label>
                        <Input
                          type="number"
                          value={String(selectedShapeData.style?.borderRadius || "").replace('px', '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateShapeStyle(selectedShape, "borderRadius", value ? `${value}px` : "");
                          }}
                          placeholder="예: 8"
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      {/* 글꼴 */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">글꼴</Label>
                        <select
                          value={String(selectedShapeData.style?.fontFamily || "")}
                          onChange={(e) => updateShapeStyle(selectedShape, "fontFamily", e.target.value)}
                          className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                        >
                          <option value="">기본 글꼴</option>
                          <optgroup label="한글 글꼴">
                            <option value="'Noto Sans KR', sans-serif">Noto Sans KR</option>
                            <option value="'Nanum Gothic', sans-serif">나눔고딕</option>
                            <option value="'Nanum Myeongjo', serif">나눔명조</option>
                            <option value="'Malgun Gothic', sans-serif">맑은 고딕</option>
                            <option value="Dotum, sans-serif">돋움</option>
                            <option value="Gulim, sans-serif">굴림</option>
                          </optgroup>
                          <optgroup label="영문 글꼴">
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="'Times New Roman', serif">Times New Roman</option>
                            <option value="'Courier New', monospace">Courier New</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="Verdana, sans-serif">Verdana</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* 글자 크기 */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">글자 크기 (px)</Label>
                        <Input
                          type="number"
                          value={String(selectedShapeData.style?.fontSize || "").replace('px', '').replace('rem', '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateShapeStyle(selectedShape, "fontSize", value ? `${value}px` : "");
                          }}
                          placeholder="예: 24"
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      {/* 글자 굵기 */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">글자 굵기</Label>
                        <select
                          value={String(selectedShapeData.style?.fontWeight || "")}
                          onChange={(e) => updateShapeStyle(selectedShape, "fontWeight", e.target.value)}
                          className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                        >
                          <option value="">기본</option>
                          <option value="normal">보통 (400)</option>
                          <option value="500">중간 (500)</option>
                          <option value="600">약간 굵게 (600)</option>
                          <option value="bold">굵게 (700)</option>
                          <option value="800">더 굵게 (800)</option>
                          <option value="900">매우 굵게 (900)</option>
                        </select>
                      </div>

                      {/* 여백 */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">안쪽 여백 (padding)</Label>
                        <Input
                          value={String(selectedShapeData.style?.padding || "")}
                          onChange={(e) => updateShapeStyle(selectedShape, "padding", e.target.value)}
                          placeholder="예: 16px 또는 8px 16px"
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      {/* 고급 설정 토글 */}
                      <details className="border rounded-lg">
                        <summary className="p-3 cursor-pointer text-xs font-semibold hover:bg-muted/50">
                          고급 설정 ({Object.keys(selectedShapeData.style || {}).length}개 속성)
                        </summary>
                        <div className="p-3 pt-0 space-y-3 border-t">
                          {/* className 편집 */}
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">className</Label>
                            <Textarea
                              value={selectedShapeData.className || ""}
                              onChange={(e) => updateShapeClassName(selectedShape, e.target.value)}
                              placeholder="Tailwind 클래스"
                              rows={2}
                              className="font-mono text-xs"
                            />
                          </div>

                          {/* 모든 style 속성 */}
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">style 속성</Label>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {Object.entries(selectedShapeData.style || {}).map(([key, value]) => (
                                <div key={key} className="flex gap-1 items-center text-xs bg-muted/30 px-2 py-1 rounded">
                                  <span className="text-muted-foreground font-mono truncate flex-1">{key}:</span>
                                  <span className="font-mono truncate flex-1">{String(value)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 flex-shrink-0"
                                    onClick={() => deleteShapeStyleProperty(selectedShape, key)}
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 새 속성 추가 */}
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">새 속성 추가</Label>
                            <div className="flex gap-1">
                              <Input
                                placeholder="속성명"
                                value={newStyleKey}
                                onChange={(e) => setNewStyleKey(e.target.value)}
                                className="h-7 text-xs font-mono"
                              />
                              <Input
                                placeholder="값"
                                value={newStyleValue}
                                onChange={(e) => setNewStyleValue(e.target.value)}
                                className="h-7 text-xs font-mono"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newStyleKey && newStyleValue) {
                                    updateShapeStyle(selectedShape, newStyleKey, newStyleValue);
                                    setNewStyleKey("");
                                    setNewStyleValue("");
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => {
                                  if (newStyleKey && newStyleValue) {
                                    updateShapeStyle(selectedShape, newStyleKey, newStyleValue);
                                    setNewStyleKey("");
                                    setNewStyleValue("");
                                  }
                                }}
                                disabled={!newStyleKey || !newStyleValue}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </details>
                    </>
                  ) : selectedElementId && editingStyles ? (
                    /* 기존 방식: element-id 기반 편집 UI */
                    <>
                      {/* 이미지 편집 */}
                      {editingStyles.imageSrc && (
                        <>
                          <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              이미지
                            </Label>

                            {/* 현재 이미지 미리보기 */}
                            <div className="border rounded-lg p-2 bg-muted/20">
                              <img
                                src={editingStyles.imageSrc}
                                alt="미리보기"
                                className="w-full h-32 object-contain rounded"
                              />
                            </div>

                            {/* 이미지 URL 직접 입력 */}
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1">이미지 URL</Label>
                              <Input
                                value={editingStyles.imageSrc}
                                onChange={(e) => updateEditingStyle('imageSrc', e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="font-mono text-xs"
                              />
                            </div>

                            {/* 이미지 선택 버튼 */}
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={loadImageGallery}
                                disabled={loadingImages}
                              >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                갤러리
                              </Button>

                              <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => imageInputRef.current?.click()}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                업로드
                              </Button>
                            </div>
                          </div>

                          <Separator />
                        </>
                      )}

                      {/* 텍스트 편집 */}
                      {!editingStyles.imageSrc && (
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2">
                            <Type className="w-4 h-4" />
                            텍스트 내용
                          </Label>
                          <Textarea
                            value={editingStyles.textContent || ''}
                            onChange={(e) => updateEditingStyle('textContent', e.target.value)}
                            rows={3}
                            placeholder="텍스트를 입력하세요"
                          />
                        </div>
                      )}

                      <Separator />

                      {/* 위치 */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Move className="w-4 h-4" />
                          위치 (px)
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Left (X)</Label>
                            <Input
                              type="number"
                              value={parseInt(editingStyles.left) || 0}
                              onChange={(e) => updateEditingStyle('left', `${e.target.value}px`)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Top (Y)</Label>
                            <Input
                              type="number"
                              value={parseInt(editingStyles.top) || 0}
                              onChange={(e) => updateEditingStyle('top', `${e.target.value}px`)}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* 크기 */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Maximize2 className="w-4 h-4" />
                          크기 (px)
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Width</Label>
                            <Input
                              type="number"
                              value={parseInt(editingStyles.width) || 0}
                              onChange={(e) => updateEditingStyle('width', `${e.target.value}px`)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Height</Label>
                            <Input
                              type="number"
                              value={parseInt(editingStyles.height) || 0}
                              onChange={(e) => updateEditingStyle('height', `${e.target.value}px`)}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* 색상 */}
                      <div className="space-y-3">
                        <Label>색상</Label>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">배경색</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={rgbToHex(editingStyles.backgroundColor)}
                                onChange={(e) => updateEditingStyle('backgroundColor', e.target.value)}
                                className="w-20"
                              />
                              <Input
                                value={editingStyles.backgroundColor}
                                onChange={(e) => updateEditingStyle('backgroundColor', e.target.value)}
                                className="flex-1 font-mono text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">글자색</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={rgbToHex(editingStyles.color)}
                                onChange={(e) => updateEditingStyle('color', e.target.value)}
                                className="w-20"
                              />
                              <Input
                                value={editingStyles.color}
                                onChange={(e) => updateEditingStyle('color', e.target.value)}
                                className="flex-1 font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* 텍스트 스타일 */}
                      <div className="space-y-3">
                        <Label>텍스트 스타일</Label>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">글자 크기</Label>
                            <Input
                              value={editingStyles.fontSize}
                              onChange={(e) => updateEditingStyle('fontSize', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">글자 굵기</Label>
                            <select
                              value={editingStyles.fontWeight}
                              onChange={(e) => updateEditingStyle('fontWeight', e.target.value)}
                              className="w-full h-9 px-3 rounded-md border border-input bg-background"
                            >
                              <option value="normal">보통</option>
                              <option value="bold">굵게</option>
                              <option value="lighter">얇게</option>
                              <option value="100">100</option>
                              <option value="200">200</option>
                              <option value="300">300</option>
                              <option value="400">400 (보통)</option>
                              <option value="500">500</option>
                              <option value="600">600</option>
                              <option value="700">700 (굵게)</option>
                              <option value="800">800</option>
                              <option value="900">900</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">가로 정렬</Label>
                            <select
                              value={editingStyles.textAlign}
                              onChange={(e) => updateEditingStyle('textAlign', e.target.value)}
                              className="w-full h-9 px-3 rounded-md border border-input bg-background"
                            >
                              <option value="left">왼쪽</option>
                              <option value="center">가운데</option>
                              <option value="right">오른쪽</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">세로 정렬</Label>
                            <select
                              value={editingStyles.alignItems}
                              onChange={(e) => {
                                if (!editingStyles) return;

                                // textAlign을 justifyContent로 변환
                                let justifyContentValue = 'flex-start';
                                if (editingStyles.textAlign === 'center') {
                                  justifyContentValue = 'center';
                                } else if (editingStyles.textAlign === 'right') {
                                  justifyContentValue = 'flex-end';
                                } else if (editingStyles.textAlign === 'left') {
                                  justifyContentValue = 'flex-start';
                                }

                                // display를 flex로 자동 설정하고 alignItems, justifyContent 동시 업데이트
                                const newStyles = {
                                  ...editingStyles,
                                  display: 'flex',
                                  alignItems: e.target.value,
                                  justifyContent: justifyContentValue
                                };
                                setEditingStyles(newStyles);

                                // 실시간으로 iframe에 반영 (모든 스타일 유지)
                                const element = getSelectedElement();
                                if (element) {
                                  element.style.display = 'flex';
                                  element.style.alignItems = e.target.value;
                                  element.style.justifyContent = justifyContentValue;
                                  // 기존 textAlign도 유지 (텍스트 노드용)
                                  if (editingStyles.textAlign) {
                                    element.style.textAlign = editingStyles.textAlign;
                                  }
                                }
                              }}
                              className="w-full h-9 px-3 rounded-md border border-input bg-background"
                            >
                              <option value="flex-start">위</option>
                              <option value="center">가운데</option>
                              <option value="flex-end">아래</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* 아무것도 선택되지 않았거나 로딩 중 */
                    <div className="text-center text-muted-foreground py-12">
                      <p className="text-sm">속성을 불러오는 중...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 하단: Footer - 저장 버튼 (컴팩트) */}
              {(selectedShape || selectedElementId) && (
                <div className="flex-shrink-0 border-t border-border px-3 py-2 bg-card">
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-mango-green hover:bg-mango-green/90 text-white h-8 text-xs"
                      onClick={selectedShape ? handleSaveElementStyles : saveStyleChanges}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      저장
                    </Button>
                    {selectedElementId && editingStyles && (
                      <Button
                        variant="destructive"
                        className="h-8 text-xs px-3"
                        onClick={deleteElement}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
              </TabsContent>

              {/* AI 편집 탭 */}
              <TabsContent value="ai" className="absolute inset-0 m-0 flex flex-col data-[state=inactive]:hidden">
                {/* AI 편집 설명 */}
                <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    💻 AI를 통해 레이아웃을 수정합니다. 스타일, 구조, 인터랙션 등을 변경할 수 있습니다.
                  </p>
                </div>

                {/* 채팅 메시지 영역 */}
                <div className="flex-1 overflow-y-auto p-4" ref={chatScrollRef}>
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                      <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-sm font-medium">AI와 대화하기</p>
                      <p className="text-xs mt-2 px-4">
                        인터랙션 기능을 추가하고 싶은 내용을 설명해주세요.
                      </p>
                      <div className="mt-4 text-xs space-y-1 text-left bg-muted/30 p-3 rounded-lg">
                        <p className="font-semibold mb-2">예시:</p>
                        <p>• "버튼을 클릭하면 색상 변경"</p>
                        <p>• "마우스 호버 시 확대 효과"</p>
                        <p>• "페이드인 애니메이션 추가"</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg p-3 ${
                              message.role === 'user'
                                ? 'bg-mango-green text-white'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            <p className="text-xs whitespace-pre-wrap">{message.content}</p>
                            <p className={`text-[10px] mt-1 ${
                              message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                            }`}>
                              {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 저장 버튼 영역 */}
                {hasUnsavedChanges && (
                  <div className="flex-shrink-0 border-t border-border px-4 py-3 bg-muted/30">
                    <Button
                      onClick={handleSaveToServer}
                      className="w-full bg-mango-green hover:bg-mango-green/90 text-white"
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      AI 수정사항을 서버에 저장
                    </Button>
                  </div>
                )}

                {/* 입력 영역 */}
                <div className="flex-shrink-0 border-t border-border p-4">
                  {/* 파일 첨부 표시 */}
                  {uploadedFile && (
                    <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-md">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="flex flex-col gap-2 flex-1">
                      <Textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendChatMessage();
                          }
                        }}
                        placeholder="인터랙션 기능을 설명해주세요..."
                        className="flex-1 resize-none text-sm h-[80px] max-h-[80px] overflow-y-auto"
                        disabled={isChatLoading}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.webm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isChatLoading}
                        className="h-[38px] w-12"
                        title="파일 첨부"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={handleSendChatMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="bg-mango-green hover:bg-mango-green/90 h-[38px] w-12"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Enter로 전송, Shift+Enter로 줄바꿈 | 파일 첨부 가능
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* 이미지 갤러리 모달 */}
      <Dialog open={isImageGalleryOpen} onOpenChange={(open) => {
        setIsImageGalleryOpen(open);
        if (!open) {
          setNewImageName('');
          if (galleryImageInputRef.current) {
            galleryImageInputRef.current.value = '';
          }
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader className="flex flex-row items-start justify-between">
            <div>
              <DialogTitle>이미지 갤러리</DialogTitle>
              <DialogDescription>
                사용할 이미지를 선택하거나 새 이미지를 업로드하세요
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* 이미지 업로드 영역 */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="imageName" className="text-sm font-medium mb-1.5 block">
                  이미지 이름
                </Label>
                <Input
                  id="imageName"
                  placeholder="이미지 이름을 입력하세요"
                  value={newImageName}
                  onChange={(e) => setNewImageName(e.target.value)}
                  disabled={uploadingImage}
                />
              </div>
              <div className="flex-shrink-0 pt-6">
                <input
                  ref={galleryImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryImageUpload}
                  className="hidden"
                  id="galleryImageUpload"
                />
                <Button
                  onClick={() => galleryImageInputRef.current?.click()}
                  disabled={uploadingImage || !newImageName.trim()}
                  className="gap-2"
                >
                  {uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      이미지 업로드
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* 이미지 목록 */}
          <ScrollArea className="h-[50vh] pr-4">
            {loadingImages ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mango-green"></div>
              </div>
            ) : availableImages.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>사용 가능한 이미지가 없습니다.</p>
                <p className="text-sm mt-2">위에서 새 이미지를 업로드해주세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {availableImages.map((image, index) => (
                  <div
                    key={image.id || index}
                    className="border rounded-lg overflow-hidden cursor-pointer hover:border-mango-green hover:shadow-lg transition-all group"
                    onClick={() => handleImageSelect(image)}
                  >
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      <img
                        src={image.image_url}
                        alt={image.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="p-2 bg-background">
                      <p className="text-sm font-medium truncate" title={image.name}>
                        {image.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 미리보기 모달 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full p-0 [&>button]:hidden">
          <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b bg-background">
              <div>
                <DialogTitle className="text-lg font-semibold">미리보기</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  현재 페이지의 실시간 미리보기
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPreviewOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* 미리보기 영역 */}
            <div className="flex-1 overflow-auto bg-gray-100 p-8">
              <div className="mx-auto bg-white shadow-2xl" style={{ width: '1280px', height: '720px' }}>
                <iframe
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  title="Preview"
                  srcDoc={(() => {
                    // 편집 툴과 동일한 방식으로 코드 처리
                    let processedCode = reactCode;

                    // import 문 제거
                    processedCode = processedCode.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');

                    // export 문 제거 및 컴포넌트 이름 추출
                    let componentName = 'GeneratedComponent';

                    // export default function ComponentName 형태
                    const exportDefaultFunctionMatch = processedCode.match(/export\s+default\s+function\s+(\w+)/);
                    if (exportDefaultFunctionMatch) {
                      componentName = exportDefaultFunctionMatch[1];
                      processedCode = processedCode.replace(/export\s+default\s+/, '');
                    }

                    // export default ComponentName 형태
                    const exportDefaultMatch = processedCode.match(/export\s+default\s+(\w+);?/);
                    if (exportDefaultMatch) {
                      componentName = exportDefaultMatch[1];
                      processedCode = processedCode.replace(/export\s+default\s+\w+;?\s*$/, '');
                    }

                    // function ComponentName 형태 (export가 없는 경우)
                    const functionMatch = processedCode.match(/function\s+(\w+)/);
                    if (functionMatch && !exportDefaultFunctionMatch) {
                      componentName = functionMatch[1];
                    }

                    // const ComponentName = 형태
                    const constMatch = processedCode.match(/const\s+(\w+)\s*=/);
                    if (constMatch && !functionMatch) {
                      componentName = constMatch[1];
                    }

                    return `
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
                            * {
                              margin: 0;
                              padding: 0;
                              box-sizing: border-box;
                            }
                            body {
                              font-family: system-ui, -apple-system, sans-serif;
                              width: 1280px;
                              height: 720px;
                              overflow: hidden;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                            }
                            #root {
                              width: 100%;
                              height: 100%;
                            }
                          </style>
                        </head>
                        <body>
                          <div id="root"></div>
                          <div id="error-display" style="display: none; padding: 20px; background: #fee; color: #c00; font-family: monospace; white-space: pre-wrap;"></div>
                          <script type="text/babel">
                            const { useState, useEffect, useMemo } = React;

                            (function() {
                              try {
                                const propsData = ${JSON.stringify(parsedData)};
                                const elementStylesObject = ${JSON.stringify(elementStyles)};

                                ${processedCode}

                                const rootElement = document.getElementById('root');
                                const root = ReactDOM.createRoot(rootElement);
                                root.render(React.createElement(${componentName}, {
                                  data: propsData,
                                  elementStyles: elementStylesObject
                                }));
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
                  })()}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// RGB를 HEX로 변환하는 유틸리티 함수
function rgbToHex(rgb: string): string {
  if (rgb.startsWith('#')) return rgb;

  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return '#000000';

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}
