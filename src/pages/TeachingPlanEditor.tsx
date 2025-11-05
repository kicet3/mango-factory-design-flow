import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

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
    textAlign: string;
  };
}

interface Page {
  id: number;
  name: string;
  reactCode: string;
  jsonData: string;
}

interface HistoryState {
  reactCode: string;
  jsonData: string;
  timestamp: number;
}

export default function TeachingPlanEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const planData = location.state?.planData;

  // 페이지 관리
  const [pages, setPages] = useState<Page[]>([
    {
      id: 1,
      name: '슬라이드 1',
      reactCode: '',
      jsonData: `{
  "shape_1": "제목을 입력하세요",
  "shape_5": "설명을 입력하세요"
}`
    }
  ]);
  const [currentPageId, setCurrentPageId] = useState<number>(1);

  // 현재 편집 중인 코드와 데이터
  const [reactCode, setReactCode] = useState('');
  const [jsonData, setJsonData] = useState(`{
  "shape_1": "제목을 입력하세요",
  "shape_5": "설명을 입력하세요"
}`);

  // 교안 메타 정보
  const [materialName, setMaterialName] = useState('교안 이름');
  const [materialDescription, setMaterialDescription] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // 되돌리기/다시실행 히스토리
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  // planData 로드
  useEffect(() => {
    if (planData) {
      console.log('Loading plan data:', planData);

      // 메타 정보 설정
      if (planData.metadata) {
        setMaterialName(planData.metadata.material_name || '교안 이름');
        setMaterialDescription(planData.metadata.material_description || '');
      }

      // components 배열을 pages로 변환
      if (planData.components && Array.isArray(planData.components)) {
        const loadedPages: Page[] = planData.components.map((component: any, index: number) => ({
          id: index + 1,
          name: `슬라이드 ${index + 1}`,
          reactCode: component.code || '',
          jsonData: JSON.stringify(component.jsonData || {}, null, 2)
        }));

        setPages(loadedPages);

        // 첫 번째 페이지 로드
        if (loadedPages.length > 0) {
          setCurrentPageId(loadedPages[0].id);
          setReactCode(loadedPages[0].reactCode);
          setJsonData(loadedPages[0].jsonData);
        }
      }
    }
  }, [planData]);

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
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);

  // 왼쪽 패널 토글 상태
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

  // 페이지 로딩 중인지 추적 (무한 루프 방지)
  const isLoadingPageRef = useRef(false);

  // 페이지 변경 시 reactCode와 jsonData 업데이트
  useEffect(() => {
    const page = pages.find(p => p.id === currentPageId);
    if (page) {
      console.log('🔄 페이지 변경:', currentPageId);
      console.log('📝 로드된 코드 길이:', page.reactCode.length);
      console.log('📊 로드된 JSON:', page.jsonData);

      isLoadingPageRef.current = true;
      setReactCode(page.reactCode);
      setJsonData(page.jsonData);
      setSelectedElementId(null);
      setEditingStyles(null);

      setTimeout(() => {
        isLoadingPageRef.current = false;
        console.log('✅ 페이지 로드 완료');
      }, 0);
    }
  }, [currentPageId]);

  // reactCode나 jsonData 변경 시 현재 페이지 업데이트
  useEffect(() => {
    if (!isLoadingPageRef.current) {
      console.log('💾 페이지 저장:', currentPageId);
      console.log('📝 저장된 코드 길이:', reactCode.length);
      console.log('📊 저장된 JSON:', jsonData);

      setPages(prev => prev.map(page =>
        page.id === currentPageId
          ? { ...page, reactCode, jsonData }
          : page
      ));
    }
  }, [reactCode, jsonData, currentPageId]);

  // 페이지 추가
  const addPage = () => {
    const newId = Math.max(...pages.map(p => p.id)) + 1;
    const newPage: Page = {
      id: newId,
      name: `슬라이드 ${newId}`,
      reactCode: '',
      jsonData: `{
  "shape_1": "제목을 입력하세요",
  "shape_5": "설명을 입력하세요"
}`
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPageId(newId);
    toast.success('새 슬라이드가 추가되었습니다');
  };

  // 페이지 삭제
  const deletePage = (pageId: number) => {
    if (pages.length === 1) {
      toast.error('마지막 슬라이드는 삭제할 수 없습니다');
      return;
    }
    setPages(prev => prev.filter(p => p.id !== pageId));
    if (currentPageId === pageId) {
      const remainingPages = pages.filter(p => p.id !== pageId);
      setCurrentPageId(remainingPages[0].id);
    }
    toast.success('슬라이드가 삭제되었습니다');
  };

  // reactCode나 jsonData 변경 시 히스토리 저장
  useEffect(() => {
    if (!isLoadingPageRef.current && reactCode && !isUndoRedoAction.current) {
      const timeoutId = setTimeout(() => {
        const newState: HistoryState = {
          reactCode,
          jsonData,
          timestamp: Date.now()
        };

        setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(newState);

          if (newHistory.length > 50) {
            newHistory.shift();
            setHistoryIndex(49);
            return newHistory;
          } else {
            setHistoryIndex(newHistory.length - 1);
            return newHistory;
          }
        });
      }, 500);
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // JSON 데이터 파싱
  const parsedData = React.useMemo(() => {
    try {
      return JSON.parse(jsonData);
    } catch {
      return {};
    }
  }, [jsonData]);

  // React 코드를 실제로 렌더링
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

    console.log('Component name detected:', componentName);
    console.log('Processed code length:', processedCode.length);

    // HTML 생성 (이하 WixStyleEditor와 동일)
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
            body { font-family: system-ui, -apple-system, sans-serif; overflow: auto; }
            .editable-element {
              cursor: move;
              transition: outline 0.2s;
            }
            .editable-element:hover {
              outline: 2px solid rgba(139, 195, 74, 0.5) !important;
              outline-offset: 2px;
            }
            .editable-element.selected {
              outline: 3px solid #8BC34A !important;
              outline-offset: 2px;
              z-index: 1000;
              position: relative;
            }
            .resize-handle {
              position: absolute;
              width: 10px;
              height: 10px;
              background: #8BC34A;
              border: 2px solid white;
              z-index: 1001;
            }
            .resize-handle.nw { top: -5px; left: -5px; cursor: nw-resize; }
            .resize-handle.ne { top: -5px; right: -5px; cursor: ne-resize; }
            .resize-handle.sw { bottom: -5px; left: -5px; cursor: sw-resize; }
            .resize-handle.se { bottom: -5px; right: -5px; cursor: se-resize; }
            .resize-handle.n { top: -5px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
            .resize-handle.s { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
            .resize-handle.w { top: 50%; left: -5px; transform: translateY(-50%); cursor: w-resize; }
            .resize-handle.e { top: 50%; right: -5px; transform: translateY(-50%); cursor: e-resize; }
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
              console.error('Global error:', msg, error);
              return false;
            };
          </script>

          <script type="text/babel">
            const { useState, useEffect } = React;

            (function() {
              try {
                console.log('Starting render...');
                const data = ${JSON.stringify(parsedData)};
                console.log('Data loaded:', data);

                ${processedCode}

                console.log('Component loaded:', typeof ${componentName});

                const rootElement = document.getElementById('root');
                console.log('Root element:', rootElement);

                const root = ReactDOM.createRoot(rootElement);
                root.render(React.createElement(${componentName}, { data: data }));

                console.log('Render initiated');

                // 편집 가능한 요소에 ID 추가 및 드래그 기능
                setTimeout(() => {
                  console.log('Adding element IDs and drag functionality...');
                  const allDivs = document.querySelectorAll('div');
                  let elementIndex = 0;

                  allDivs.forEach((div) => {
                    if (div.id !== 'root' && div.id !== 'error-display') {
                      div.setAttribute('data-element-id', 'element-' + elementIndex);
                      div.classList.add('editable-element');
                      elementIndex++;

                      // 클릭 이벤트
                      div.addEventListener('click', (e) => {
                        e.stopPropagation();

                        document.querySelectorAll('.selected').forEach(el => {
                          el.classList.remove('selected');
                          el.querySelectorAll('.resize-handle').forEach(h => h.remove());
                        });

                        div.classList.add('selected');

                        const handles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
                        handles.forEach(pos => {
                          const handle = document.createElement('div');
                          handle.className = \`resize-handle \${pos}\`;
                          handle.setAttribute('data-position', pos);
                          div.appendChild(handle);
                        });

                        window.parent.postMessage({
                          type: 'ELEMENT_SELECTED',
                          elementId: div.getAttribute('data-element-id')
                        }, '*');
                      });

                      // 드래그 및 리사이즈 기능
                      let isDragging = false;
                      let isResizing = false;
                      let resizeDirection = '';
                      let startX = 0;
                      let startY = 0;
                      let initialLeft = 0;
                      let initialTop = 0;
                      let initialWidth = 0;
                      let initialHeight = 0;

                      div.addEventListener('mousedown', (e) => {
                        const target = e.target;

                        if (target.classList.contains('resize-handle')) {
                          isResizing = true;
                          resizeDirection = target.getAttribute('data-position');

                          startX = e.clientX;
                          startY = e.clientY;

                          const style = window.getComputedStyle(div);
                          initialLeft = parseInt(style.left) || 0;
                          initialTop = parseInt(style.top) || 0;
                          initialWidth = parseInt(style.width) || 0;
                          initialHeight = parseInt(style.height) || 0;

                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }

                        if (!div.classList.contains('selected')) return;

                        isDragging = true;
                        startX = e.clientX;
                        startY = e.clientY;

                        const style = window.getComputedStyle(div);
                        initialLeft = parseInt(style.left) || 0;
                        initialTop = parseInt(style.top) || 0;

                        if (style.position === 'static' || style.position === 'relative') {
                          div.style.position = 'absolute';
                        }

                        e.preventDefault();
                        e.stopPropagation();
                      });

                      document.addEventListener('mousemove', (e) => {
                        const deltaX = e.clientX - startX;
                        const deltaY = e.clientY - startY;

                        if (isResizing) {
                          if (resizeDirection.includes('e')) {
                            div.style.width = (initialWidth + deltaX) + 'px';
                          }
                          if (resizeDirection.includes('w')) {
                            div.style.width = (initialWidth - deltaX) + 'px';
                            div.style.left = (initialLeft + deltaX) + 'px';
                          }
                          if (resizeDirection.includes('s')) {
                            div.style.height = (initialHeight + deltaY) + 'px';
                          }
                          if (resizeDirection.includes('n')) {
                            div.style.height = (initialHeight - deltaY) + 'px';
                            div.style.top = (initialTop + deltaY) + 'px';
                          }
                        } else if (isDragging) {
                          const newLeft = initialLeft + deltaX;
                          const newTop = initialTop + deltaY;

                          div.style.left = newLeft + 'px';
                          div.style.top = newTop + 'px';
                        }
                      });

                      document.addEventListener('mouseup', (e) => {
                        if (isDragging || isResizing) {
                          const style = window.getComputedStyle(div);

                          window.parent.postMessage({
                            type: isResizing ? 'ELEMENT_RESIZED' : 'ELEMENT_MOVED',
                            elementId: div.getAttribute('data-element-id'),
                            left: style.left,
                            top: style.top,
                            width: style.width,
                            height: style.height
                          }, '*');
                        }

                        isDragging = false;
                        isResizing = false;
                        resizeDirection = '';
                      });
                    }
                  });

                  console.log('Total editable elements:', elementIndex);
                }, 500);
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
  }, [reactCode, parsedData]);

  // iframe에서 메시지 수신
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_SELECTED') {
        const elementId = event.data.elementId;
        setSelectedElementId(elementId);

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

            const loadedStyles = {
              position: computedStyle.position,
              left: computedStyle.left,
              top: computedStyle.top,
              width: computedStyle.width,
              height: computedStyle.height,
              backgroundColor: computedStyle.backgroundColor,
              color: computedStyle.color,
              fontSize: computedStyle.fontSize,
              textAlign: computedStyle.textAlign,
              display: computedStyle.display || 'block',
              alignItems: computedStyle.alignItems || 'flex-start',
              justifyContent: computedStyle.justifyContent || 'flex-start',
              textContent: (element as HTMLElement).textContent || '',
              imageSrc: imageSrc
            };

            setEditingStyles(loadedStyles);
            console.log('Auto-loaded element styles');
          }
        }, 50);
      } else if (event.data.type === 'ELEMENT_MOVED') {
        const { elementId, left, top } = event.data;
        console.log('Element moved:', elementId, 'to', left, top);

        if (editingStyles && selectedElementId === elementId) {
          setEditingStyles({
            ...editingStyles,
            left: left,
            top: top
          });
        }

        updateReactCodePosition(elementId, left, top);
      } else if (event.data.type === 'ELEMENT_RESIZED') {
        const { elementId, left, top, width, height } = event.data;
        console.log('Element resized:', elementId, width, height);

        if (editingStyles && selectedElementId === elementId) {
          setEditingStyles({
            ...editingStyles,
            left: left,
            top: top,
            width: width,
            height: height
          });
        }

        updateReactCodeSizeAndPosition(elementId, left, top, width, height);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [editingStyles, selectedElementId]);

  // 선택된 요소 가져오기
  const getSelectedElement = (): HTMLElement | null => {
    if (!selectedElementId || !iframeRef.current) return null;

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return null;

    return iframeDoc.querySelector(`[data-element-id="${selectedElementId}"]`);
  };

  // 위치 업데이트
  const updateReactCodePosition = (elementId: string, left: string, top: string) => {
    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

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

            const stylePairs = styleContent.split(',').map(s => s.trim());
            stylePairs.forEach(pair => {
              const match = pair.match(/(\w+):\s*['"]([^'"]+)['"]/);
              if (match) {
                styleObj[match[1]] = match[2];
              }
            });

            styleObj.left = left;
            styleObj.top = top;

            const newStyleContent = Object.entries(styleObj)
              .map(([k, v]) => `${k}: '${v}'`)
              .join(', ');

            lines[i] = line.replace(/style=\{\{[^}]*\}\}/, `style={{ ${newStyleContent} }}`);
          }

          break;
        }
        divCount++;
      }
    }

    const updatedCode = lines.join('\n');
    setReactCode(updatedCode);
  };

  // 크기 및 위치 업데이트
  const updateReactCodeSizeAndPosition = (elementId: string, left: string, top: string, width: string, height: string) => {
    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

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

            const stylePairs = styleContent.split(',').map(s => s.trim());
            stylePairs.forEach(pair => {
              const match = pair.match(/(\w+):\s*['"]([^'"]+)['"]/);
              if (match) {
                styleObj[match[1]] = match[2];
              }
            });

            styleObj.left = left;
            styleObj.top = top;
            styleObj.width = width;
            styleObj.height = height;

            const newStyleContent = Object.entries(styleObj)
              .map(([k, v]) => `${k}: '${v}'`)
              .join(', ');

            lines[i] = line.replace(/style=\{\{[^}]*\}\}/, `style={{ ${newStyleContent} }}`);
          }

          break;
        }
        divCount++;
      }
    }

    const updatedCode = lines.join('\n');
    setReactCode(updatedCode);
  };

  // 편집 중인 스타일 값 변경
  const updateEditingStyle = (property: keyof typeof editingStyles, value: string) => {
    if (!editingStyles) return;

    setEditingStyles({
      ...editingStyles,
      [property]: value
    });

    const element = getSelectedElement();
    if (element) {
      if (property === 'textContent') {
        element.textContent = value;
      } else if (property === 'imageSrc') {
        if (element.tagName.toLowerCase() === 'img') {
          (element as HTMLImageElement).src = value;
        }
      } else if (property === 'left' || property === 'top' || property === 'width' || property === 'height') {
        element.style[property] = value;
      } else if (property === 'backgroundColor' || property === 'color' || property === 'fontSize' || property === 'textAlign' || property === 'display' || property === 'alignItems' || property === 'justifyContent') {
        element.style[property as any] = value;
      }
    }
  };

  // S3/백엔드에서 이미지 목록 가져오기
  const loadImageGallery = async () => {
    try {
      setLoadingImages(true);

      // TODO: 실제 API 엔드포인트로 교체
      // const response = await fetch('/api/images');
      // const data = await response.json();
      // setAvailableImages(data.images);

      // 임시 더미 데이터
      const dummyImages = [
        'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400',
        'https://images.unsplash.com/photo-1557683316-973673baf926?w=400',
        'https://images.unsplash.com/photo-1581287053822-fd7bf4f4bfec?w=400',
        'https://images.unsplash.com/photo-1516802273409-68526ee1bdd6?w=400',
        'https://images.unsplash.com/photo-1573865526739-10c1de0b3e90?w=400',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'
      ];

      setAvailableImages(dummyImages);
      setIsImageGalleryOpen(true);
    } catch (error) {
      console.error('Error loading images:', error);
      toast.error('이미지 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingImages(false);
    }
  };

  // 갤러리에서 이미지 선택
  const handleImageSelect = (imageUrl: string) => {
    if (editingStyles) {
      updateEditingStyle('imageSrc', imageUrl);
      setIsImageGalleryOpen(false);
      toast.success('이미지가 선택되었습니다.');
    }
  };

  // 이미지 파일 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedElementId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    try {
      // TODO: 실제로는 S3에 업로드하고 URL 받아오기
      // 임시: 파일을 base64로 변환
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Image = event.target?.result as string;

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

  // 저장
  const saveStyleChanges = () => {
    if (!editingStyles || !selectedElementId) {
      toast.error('저장할 변경사항이 없습니다');
      return;
    }

    const element = getSelectedElement();
    if (!element) {
      toast.error('요소를 찾을 수 없습니다');
      return;
    }

    try {
      updateReactCodeBatch(selectedElementId, editingStyles);

      setTimeout(() => {
        toast.success('변경사항이 저장되었습니다');
      }, 100);

      setEditingStyles(null);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('저장 중 오류가 발생했습니다');
    }
  };

  // 배치 업데이트
  const updateReactCodeBatch = (elementId: string, styles: typeof editingStyles) => {
    if (!elementId || !styles) return;

    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

    const lines = reactCode.split('\n');
    let divCount = 0;
    let updated = false;
    let dataBindingKey: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const isDiv = line.includes('<div') && !line.trim().startsWith('//') && !line.trim().startsWith('/*');
      const isImg = line.includes('<img') && !line.trim().startsWith('//') && !line.trim().startsWith('/*');

      if (isDiv || isImg) {
        if (divCount === elementIndex) {
          // 이미지 태그인 경우 src 속성 업데이트
          if (isImg && styles.imageSrc) {
            if (line.includes('src=')) {
              lines[i] = line.replace(/src=['"]([^'"]*)['"]/g, `src="${styles.imageSrc}"`);
            } else {
              lines[i] = line.replace(/<img/, `<img src="${styles.imageSrc}"`);
            }
            updated = true;
          }

          const styleMatch = line.match(/style=\{\{([^}]*)\}\}/);

          if (styleMatch) {
            let styleContent = styleMatch[1].trim();
            const styleObj: any = {};

            const stylePairs = styleContent.split(',').map(s => s.trim());
            stylePairs.forEach(pair => {
              const match = pair.match(/(\w+):\s*['"]([^'"]+)['"]/);
              if (match) {
                styleObj[match[1]] = match[2];
              }
            });

            styleObj.left = styles.left;
            styleObj.top = styles.top;
            styleObj.width = styles.width;
            styleObj.height = styles.height;
            styleObj.backgroundColor = styles.backgroundColor;
            styleObj.color = styles.color;
            styleObj.fontSize = styles.fontSize;
            styleObj.textAlign = styles.textAlign;
            styleObj.display = styles.display;
            styleObj.alignItems = styles.alignItems;
            styleObj.justifyContent = styles.justifyContent;

            const newStyleContent = Object.entries(styleObj)
              .map(([k, v]) => `${k}: '${v}'`)
              .join(', ');

            lines[i] = line.replace(/style=\{\{[^}]*\}\}/, `style={{ ${newStyleContent} }}`);
            updated = true;
          }

          // 텍스트 내용 처리 (div만 해당)
          if (isDiv) {
            const trimmedText = styles.textContent?.trim();
            if (trimmedText && trimmedText.length > 0) {
              if (lines[i].includes('</div>')) {
                const textMatch = lines[i].match(/>(.*?)<\/div>/);
                if (textMatch) {
                  const currentText = textMatch[1].trim();
                  const dataMatch = currentText.match(/\{data\.(\w+)\}/);
                  if (dataMatch) {
                    dataBindingKey = dataMatch[1];
                  } else {
                    lines[i] = lines[i].replace(/>[^<]*<\/div>/, `>${trimmedText}</div>`);
                  }
                }
              }
            }
          }

          break;
        }
        divCount++;
      }
    }

    const updatedCode = lines.join('\n');

    if (updated) {
      setReactCode(updatedCode);
    }

    // JSON 데이터 업데이트
    if (dataBindingKey && styles.textContent) {
      try {
        const currentData = JSON.parse(jsonData);
        currentData[dataBindingKey] = styles.textContent;
        const updatedJson = JSON.stringify(currentData, null, 2);
        setJsonData(updatedJson);
      } catch (error) {
        console.error('Failed to update JSON data:', error);
      }
    }
  };

  // 요소 삭제
  const deleteElement = () => {
    const element = getSelectedElement();
    if (!element || !selectedElementId) return;

    if (confirm('이 요소를 삭제하시겠습니까?')) {
      element.remove();
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('<div') && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        if (divCount === elementIndex) {
          startLine = i;

          if (i > 0 && lines[i - 1].trim().startsWith('{/*')) {
            startLine = i - 1;
          }

          if (line.includes('</div>') || line.includes('/>')) {
            endLine = i;
            break;
          }

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
      lines.splice(startLine, endLine - startLine + 1);
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
              onClick={() => navigate(-1)}
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
          </div>

          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            저장
          </Button>
        </div>

        {/* 교안 이름과 설명 */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            {isEditingTitle ? (
              <Input
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingTitle(false);
                }}
                autoFocus
                className="text-lg font-bold h-8 mb-1"
                placeholder="교안 이름"
              />
            ) : (
              <h1
                className="text-lg font-bold cursor-pointer hover:text-primary transition-colors mb-1"
                onClick={() => setIsEditingTitle(true)}
              >
                {materialName || '교안 이름을 입력하세요'}
              </h1>
            )}
            <Input
              value={materialDescription}
              onChange={(e) => setMaterialDescription(e.target.value)}
              placeholder="교안 설명을 입력하세요"
              className="text-sm h-7"
            />
          </div>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 왼쪽 - 코드 & 데이터 */}
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="slides">
                  <Layers className="w-4 h-4 mr-2" />
                  슬라이드
                </TabsTrigger>
                <TabsTrigger value="code">
                  <Code className="w-4 h-4 mr-2" />
                  코드
                </TabsTrigger>
                <TabsTrigger value="data">
                  <Database className="w-4 h-4 mr-2" />
                  데이터
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="slides" className="flex-1 m-0 p-4 overflow-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <Label>슬라이드 목록</Label>
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
                          ? 'bg-primary/10 border-primary'
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
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>코드: {page.reactCode ? `${page.reactCode.length}자` : '없음'}</span>
                        <span>•</span>
                        <span>데이터: {page.jsonData ? `${page.jsonData.length}자` : '없음'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="code" className="flex-1 flex flex-col m-0 p-4">
              <div className="flex-1 flex flex-col space-y-3">
                <Label>React 코드</Label>
                <Textarea
                  value={reactCode}
                  onChange={(e) => setReactCode(e.target.value)}
                  placeholder="React 컴포넌트 코드를 입력하세요..."
                  className="flex-1 font-mono text-xs resize-none"
                />
              </div>
            </TabsContent>

            <TabsContent value="data" className="flex-1 flex flex-col m-0 p-4">
              <div className="flex-1 flex flex-col space-y-3">
                <Label>JSON 데이터</Label>
                <Textarea
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  className="flex-1 font-mono text-xs resize-none"
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
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-r-md rounded-l-none border-l-0 h-20 px-2"
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

        {/* 중앙 - 렌더링된 슬라이드 */}
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
                <p className="text-lg font-semibold">왼쪽에 React 코드를 입력하세요</p>
                <p className="text-sm mt-2">1280×720 (16:9) 크기로 렌더링됩니다</p>
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
        <div className="border-l border-border bg-card flex flex-col relative" style={{ width: '277px' }}>
          <div className="p-4 border-b border-border">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Move className="w-5 h-5" />
              속성 편집
            </h3>
          </div>
          <ScrollArea className="flex-1" style={{ paddingBottom: '140px' }}>
            <div className="p-4 space-y-6">
              {!selectedElementId ? (
                <div className="text-center text-muted-foreground py-16">
                  <Move className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">요소를 선택하세요</p>
                  <p className="text-xs mt-1">화면에서 요소를 클릭하면 편집할 수 있습니다</p>
                </div>
              ) : (
                <>
                  {!editingStyles ? (
                    <div className="text-center text-muted-foreground py-12">
                      <p className="text-sm">속성을 불러오는 중...</p>
                    </div>
                  ) : (
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
                      {editingStyles.textContent && (
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2">
                            <Type className="w-4 h-4" />
                            텍스트 내용
                          </Label>
                          <Textarea
                            value={editingStyles.textContent}
                            onChange={(e) => updateEditingStyle('textContent', e.target.value)}
                            rows={3}
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
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* 하단 고정 버튼 영역 */}
          {selectedElementId && editingStyles && (
            <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4 space-y-3">
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={saveStyleChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                변경사항 저장
              </Button>

              <Button
                variant="destructive"
                className="w-full"
                onClick={deleteElement}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                요소 삭제
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 이미지 갤러리 모달 */}
      <Dialog open={isImageGalleryOpen} onOpenChange={setIsImageGalleryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>이미지 선택</DialogTitle>
            <DialogDescription>
              사용할 이미지를 선택하세요
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            {loadingImages ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : availableImages.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>사용 가능한 이미지가 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {availableImages.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-2 cursor-pointer hover:border-primary hover:shadow-lg transition-all"
                    onClick={() => handleImageSelect(imageUrl)}
                  >
                    <img
                      src={imageUrl}
                      alt={`이미지 ${index + 1}`}
                      className="w-full h-40 object-cover rounded"
                    />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// RGB를 HEX로 변환
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
