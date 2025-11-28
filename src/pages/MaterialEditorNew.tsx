// MaterialEditor - elementStyles 기반 스타일 편집 (iframe + Babel 버전)
import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Save, RotateCcw, Upload, Image as ImageIcon, ChevronLeft, ChevronRight, Layers } from "lucide-react"
import { toast } from "sonner"
import { fetchMaterialDetail, updateMaterialLayoutStyles, fetchLayoutImages, uploadLayoutImage, type LayoutImageItem } from "@/services/conversions"
import { supabase } from "@/integrations/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export default function MaterialEditorNew() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Component code and data
  const [componentCode, setComponentCode] = useState('')
  const [componentData, setComponentData] = useState<any>(null)
  const [elementStyles, setElementStyles] = useState<any>({})
  const [selectedShape, setSelectedShape] = useState<string | null>(null)
  const [generatedSlides, setGeneratedSlides] = useState<any[]>([]) // Store full generated_slides data
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0) // Currently editing slide index
  const [slidePanelOpen, setSlidePanelOpen] = useState(true) // Slide panel toggle state
  const [conversionComponents, setConversionComponents] = useState<any[]>([]) // Store conversion components for slide switching

  // Edit mode toggle
  const [editMode, setEditMode] = useState(true) // true = 편집 모드, false = 보기 모드

  // Iframe reference
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Border state
  const [borderStyle, setBorderStyle] = useState("solid")
  const [borderWidth, setBorderWidth] = useState("")
  const [borderColor, setBorderColor] = useState("#000000")

  // Background image upload state
  const [bgImageMode, setBgImageMode] = useState<'url' | 'library'>('url')
  const [pendingImageUploads, setPendingImageUploads] = useState<Map<string, File>>(new Map())

  // Image library state
  const [imageLibraryOpen, setImageLibraryOpen] = useState(false)
  const [layoutImages, setLayoutImages] = useState<LayoutImageItem[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [currentShapeForImage, setCurrentShapeForImage] = useState<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imageNameInput, setImageNameInput] = useState('')

  // Text editing state - 원본과 편집 중인 텍스트 분리
  const [editingTextData, setEditingTextData] = useState<{
    dataKey: string | null
    originalValue: any
    editingValue: any
    hasChanges: boolean
  }>({ dataKey: null, originalValue: null, editingValue: null, hasChanges: false })

  useEffect(() => {
    loadMaterialData()
  }, [id])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      // Revoke all object URLs to prevent memory leaks
      Object.values(elementStyles).forEach((shapeData: any) => {
        const bgImage = shapeData?.style?.backgroundImage
        if (bgImage && bgImage.startsWith('url("blob:')) {
          const url = bgImage.replace(/^url\(['"]?|['"]?\)$/g, '')
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [])

  // Send editMode to iframe when it changes
  useEffect(() => {
    console.log('🔄 EditMode changed to:', editMode)

    let confirmed = false
    const timeouts: NodeJS.Timeout[] = []

    const sendEditMode = () => {
      if (confirmed) return // Stop if already confirmed

      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({
            type: 'setEditMode',
            editMode: editMode
          }, '*')
          console.log('📤 EditMode message sent:', editMode)

          // If switching to edit mode, refresh click handlers after a delay
          if (editMode) {
            setTimeout(() => {
              if (iframeRef.current && iframeRef.current.contentWindow) {
                const iframeWindow = iframeRef.current.contentWindow as any
                if (typeof iframeWindow.refreshClickHandlers === 'function') {
                  console.log('🔄 Refreshing click handlers')
                  iframeWindow.refreshClickHandlers()
                }
              }
            }, 200)
          }
        } catch (error) {
          console.error('❌ Failed to send editMode:', error)
        }
      }
    }

    // Listen for confirmation from iframe
    const handleConfirmation = (event: MessageEvent) => {
      if (event.data.type === 'editModeConfirmed' && event.data.editMode === editMode) {
        console.log('✅ EditMode confirmed by iframe')
        confirmed = true
        // Clear all pending timeouts
        timeouts.forEach(timeout => clearTimeout(timeout))
      }
    }
    window.addEventListener('message', handleConfirmation)

    // Send immediately and retry with exponential backoff
    sendEditMode()
    timeouts.push(setTimeout(sendEditMode, 100))
    timeouts.push(setTimeout(sendEditMode, 300))
    timeouts.push(setTimeout(sendEditMode, 600))
    timeouts.push(setTimeout(sendEditMode, 1000))

    // Clear selection when switching to view mode
    if (!editMode) {
      setSelectedShape(null)
    }

    // Cleanup
    return () => {
      window.removeEventListener('message', handleConfirmation)
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [editMode])

  const loadMaterialData = async () => {
    if (!id) return

    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const materialDetail = await fetchMaterialDetail(parseInt(id), accessToken)

      console.log("Material Detail:", materialDetail)

      // Get component code from conversion.components
      let layoutComponentName = ''
      if (materialDetail.generated_slides && materialDetail.generated_slides.length > 0) {
        layoutComponentName = materialDetail.generated_slides[0].layout_component
      }

      console.log("Layout Component Name:", layoutComponentName)

      // Find matching component code and store all components for slide switching
      if (materialDetail.conversion && materialDetail.conversion.components) {
        // Store all components for later use when switching slides
        setConversionComponents(materialDetail.conversion.components)
        console.log("Stored conversion components:", materialDetail.conversion.components.length)

        const matchingComponent = materialDetail.conversion.components.find(
          (c: any) => c.component_name === layoutComponentName
        )

        if (matchingComponent) {
          setComponentCode(matchingComponent.code)
          console.log("Found matching component:", matchingComponent.component_name)
        }
      }

      // Get slide data
      let slideData: any = null
      let slideElementStyles: any = null

      if (materialDetail.generated_slides && materialDetail.generated_slides.length > 0) {
        // Store full generated_slides for later saving
        setGeneratedSlides(materialDetail.generated_slides)
        console.log("Stored generated_slides:", materialDetail.generated_slides)

        const firstSlide: any = materialDetail.generated_slides[0]

        // Use generated_slides.data directly
        slideData = firstSlide.data || null

        // Get styles from firstSlide.styles
        console.log("First Slide Styles:", firstSlide.styles)
        slideElementStyles = firstSlide.styles || null
      }

      console.log("Slide Data (generated_slides.data):", slideData)
      console.log("Element Styles:", slideElementStyles)

      // Set component data - slideData is already an array, use first element
      if (slideData && Array.isArray(slideData) && slideData.length > 0) {
        setComponentData(slideData[0])
      } else {
        setComponentData(slideData)
      }

      if (slideElementStyles) {
        const modifiedStyles = { ...slideElementStyles }

        // Replace 'fixed' with 'absolute' for container rendering
        Object.keys(modifiedStyles).forEach(key => {
          if (modifiedStyles[key]?.className) {
            modifiedStyles[key].className = modifiedStyles[key].className
              .replace(/\bfixed\b/g, 'absolute')
          }
        })

        console.log("Modified Element Styles:", modifiedStyles)
        setElementStyles(modifiedStyles)
      } else {
        console.warn("No elementStyles found in slide data")
        setElementStyles({})
      }

    } catch (error) {
      console.error("Failed to load material:", error)
      toast.error("자료를 불러오는데 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  // Render component in iframe only when code or data changes (NOT elementStyles)
  // Style changes are applied directly to the DOM via updateShapeStyle
  useEffect(() => {
    console.log("=== useEffect triggered ===")
    console.log("componentCode exists:", !!componentCode)
    console.log("componentData exists:", !!componentData)

    if (!componentCode || !componentData) {
      console.log("Skipping render - waiting for data")
      return
    }

    console.log("All ready, rendering...")
    // Add small delay to ensure iframe DOM is ready
    setTimeout(() => {
      renderComponentInIframe()
    }, 100)
  }, [componentCode, componentData])

  const renderComponentInIframe = () => {
    if (!iframeRef.current) return

    try {
      console.log("=== renderComponentInIframe called ===")
      console.log("componentCode length:", componentCode.length)
      console.log("componentData:", componentData)
      console.log("elementStyles keys:", Object.keys(elementStyles))

      const iframeDoc = iframeRef.current.contentDocument
      if (!iframeDoc) return

      // Extract component name - support both function and arrow function
      let componentName = 'Component'

      // Try function declaration: function ComponentName
      let match = componentCode.match(/function\s+(\w+)\s*\(/)
      if (match) {
        componentName = match[1]
      } else {
        // Try arrow function: const ComponentName =
        match = componentCode.match(/const\s+(\w+)\s*=/)
        if (match) {
          componentName = match[1]
        }
      }

      console.log("Component name extracted:", componentName)

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <script crossorigin="anonymous" src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin="anonymous" src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script crossorigin="anonymous" src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script>
            console.log('Scripts loading...');
          </script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
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
            // Edit mode state - 초기값을 부모로부터 받음
            let currentEditMode = ${editMode};
            console.log('🎬 iframe initialized with editMode:', currentEditMode);

            // Function to update edit mode UI
            function updateEditModeUI(isEditMode) {
              console.log('🎨 Updating UI for editMode:', isEditMode);

              // Update body class
              if (isEditMode) {
                document.body.classList.add('edit-mode');
                document.body.classList.remove('view-mode');
                console.log('  ✓ Applied edit-mode class');
              } else {
                document.body.classList.add('view-mode');
                document.body.classList.remove('edit-mode');
                console.log('  ✓ Applied view-mode class');

                // Remove selection in view mode
                const selectedElements = document.querySelectorAll('.selected');
                console.log(\`  ✓ Removing selection from \${selectedElements.length} elements\`);
                selectedElements.forEach((el) => {
                  el.classList.remove('selected');
                });
              }
            }

            // Set initial UI
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

                // Send confirmation back to parent
                window.parent.postMessage({
                  type: 'editModeConfirmed',
                  editMode: newEditMode
                }, '*');
              }
            });

            // Send logs to parent window
            const originalLog = console.log;
            const originalError = console.error;
            console.log = function(...args) {
              originalLog.apply(console, args);
              window.parent.postMessage({ type: 'iframe-log', level: 'log', args: args.map(String) }, '*');
            };
            console.error = function(...args) {
              originalError.apply(console, args);
              window.parent.postMessage({ type: 'iframe-log', level: 'error', args: args.map(String) }, '*');
            };

            console.log('=== iframe script executing ===');

            // Wait for all scripts to load
            function checkLibraries() {
              console.log('Checking libraries...');
              console.log('React:', typeof window.React);
              console.log('ReactDOM:', typeof window.ReactDOM);
              console.log('Babel:', typeof window.Babel);

              if (typeof window.React === 'undefined') {
                console.error('React not loaded!');
              }
              if (typeof window.ReactDOM === 'undefined') {
                console.error('ReactDOM not loaded!');
              }
              if (typeof window.Babel === 'undefined') {
                console.error('Babel not loaded!');
              }

              return typeof window.React !== 'undefined' &&
                     typeof window.ReactDOM !== 'undefined' &&
                     typeof window.Babel !== 'undefined';
            }

            // Check immediately
            if (!checkLibraries()) {
              console.log('Waiting for libraries to load...');
              // Check again after a delay
              setTimeout(checkLibraries, 1000);
            }

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
              console.log('Babel script starting...');

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

                  ${componentCode}

                  console.log('Component code executed');
                  console.log('Component name:', '${componentName}');
                  console.log('Component exists:', typeof ${componentName});

                  const propsData = {
                    data: ${JSON.stringify(componentData)},
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

                  root.render(React.createElement(${componentName}, propsData));
                  console.log('Render complete!');

                  // Add click handlers after render with retry mechanism
                  const addClickHandlers = () => {
                    console.log('=== Adding click handlers ===');

                    // Set initial edit mode class
                    if (currentEditMode) {
                      document.body.classList.add('edit-mode');
                    } else {
                      document.body.classList.add('view-mode');
                    }

                    const elementStylesObject = ${JSON.stringify(elementStyles)};
                    console.log('📦 Received elementStyles:', elementStylesObject);
                    console.log('📊 Total shapes:', Object.keys(elementStylesObject).length);

                    let totalHandlers = 0;

                    // ===== Strategy 1: data-key 기반 =====
                    const allElementsWithDataKey = document.querySelectorAll('[data-key]');
                    console.log(\`🔍 Found \${allElementsWithDataKey.length} elements with data-key attribute\`);

                    allElementsWithDataKey.forEach((element, index) => {
                      const dataKey = element.getAttribute('data-key');

                      if (dataKey && elementStylesObject[dataKey]) {
                        // Only add if not already marked as editable
                        if (!element.classList.contains('editable-shape')) {
                          element.classList.add('editable-shape');
                          element.setAttribute('data-shape-name', dataKey);
                          console.log(\`  ✓ Element #\${index}: data-key="\${dataKey}"\`);
                          totalHandlers++;
                        } else {
                          // Count existing handlers too
                          totalHandlers++;
                        }
                      }
                    });

                    // ===== Strategy 2: className 기반 (data-key가 없을 때) =====
                    if (totalHandlers === 0) {
                      console.log('⚠️ No data-key found, trying className-based selection...');

                      Object.keys(elementStylesObject).forEach((shapeName) => {
                        const shapeConfig = elementStylesObject[shapeName];
                        if (!shapeConfig.className) return;

                        // className에서 첫 번째 클래스 추출
                        const firstClass = shapeConfig.className.trim().split(/\s+/)[0];
                        if (!firstClass) return;

                        const elements = document.querySelectorAll(\`.\${firstClass}\`);
                        console.log(\`🔍 Found \${elements.length} elements with class "\${firstClass}" for shape "\${shapeName}"\`);

                        elements.forEach((element, index) => {
                          // Only add if not already marked as editable
                          if (!element.classList.contains('editable-shape')) {
                            element.classList.add('editable-shape');
                            element.setAttribute('data-shape-name', shapeName);
                            element.setAttribute('data-key', shapeName);
                            console.log(\`  ✓ Element #\${index}: className="\${firstClass}" → shapeName="\${shapeName}"\`);
                            totalHandlers++;
                          } else {
                            // Count existing handlers too
                            totalHandlers++;
                          }
                        });
                      });
                    }

                    // ===== 통합 클릭 핸들러 등록 =====
                    const editableElements = document.querySelectorAll('.editable-shape');
                    console.log(\`📌 Total editable elements: \${editableElements.length}\`);

                    editableElements.forEach((element) => {
                      // Skip if handler already attached
                      if (element.hasAttribute('data-handler-attached')) {
                        return;
                      }

                      // Mark as handler attached
                      element.setAttribute('data-handler-attached', 'true');

                      element.addEventListener('click', (e) => {
                        // Check body class instead of currentEditMode variable to avoid closure issues
                        if (!document.body.classList.contains('edit-mode')) {
                          console.log('⏸️ View mode: click ignored');
                          return;
                        }

                        e.preventDefault();
                        e.stopPropagation();

                        const shapeName = element.getAttribute('data-shape-name');
                        console.log('🖱️ Element clicked!');
                        console.log('  shapeName:', shapeName);
                        console.log('  Shape data:', elementStylesObject[shapeName]);

                        // 기존 선택 제거
                        document.querySelectorAll('.selected').forEach(el => {
                          el.classList.remove('selected');
                        });

                        // 현재 요소 선택
                        element.classList.add('selected');

                        // 부모 윈도우에 선택 알림
                        window.parent.postMessage({
                          type: 'shapeSelected',
                          shapeName: shapeName
                        }, '*');
                      });
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

                  // Expose addClickHandlers globally so it can be called from parent
                  window.refreshClickHandlers = addClickHandlers;

                } catch (error) {
                  console.error('Component render error:', error);
                  const errorDiv = document.getElementById('error-display');
                  if (errorDiv) {
                    errorDiv.style.display = 'block';
                    errorDiv.textContent = 'Render Error: ' + error.toString() + '\\n\\n' + (error.stack || '');
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

      // Write to iframe document
      iframeDoc.open()
      iframeDoc.write(htmlContent)
      iframeDoc.close()

      console.log("iframe content written successfully")

    } catch (error) {
      console.error("Failed to render component:", error)
      toast.error("컴포넌트 렌더링 실패")
    }
  }

  // Listen to messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Message received from iframe:', event.data)

      if (event.data.type === 'shapeSelected') {
        console.log('=== Shape Selection ===')
        console.log('Shape name:', event.data.shapeName)
        console.log('Current elementStyles:', elementStyles)
        console.log('Shape data:', elementStyles[event.data.shapeName])

        const shapeName = event.data.shapeName
        setSelectedShape(shapeName)

        // 원본 텍스트 데이터 저장
        if (iframeRef.current && componentData) {
          const iframeDoc = iframeRef.current.contentDocument
          if (iframeDoc) {
            const element = iframeDoc.querySelector(`[data-shape-name="${shapeName}"]`)
            const textContent = element?.textContent?.trim() || null

            if (textContent) {
              // componentData에서 매칭되는 key 찾기
              let matchedKey: string | null = null
              for (const [key, value] of Object.entries(componentData)) {
                if (typeof value === 'string' && value.trim() === textContent) {
                  matchedKey = key
                  break
                }
                if (typeof value === 'object' && value !== null) {
                  const obj = value as Record<string, any>
                  if (obj.text?.trim() === textContent || obj.content?.trim() === textContent) {
                    matchedKey = key
                    break
                  }
                }
              }

              if (matchedKey) {
                const originalValue = componentData[matchedKey]
                setEditingTextData({
                  dataKey: matchedKey,
                  originalValue: originalValue,
                  editingValue: typeof originalValue === 'string' ? originalValue : (originalValue?.text || originalValue?.content || ''),
                  hasChanges: false
                })
                console.log('📝 Original text data saved:', { key: matchedKey, value: originalValue })
              } else {
                setEditingTextData({ dataKey: null, originalValue: null, editingValue: null, hasChanges: false })
              }
            } else {
              setEditingTextData({ dataKey: null, originalValue: null, editingValue: null, hasChanges: false })
            }
          }
        }

        console.log('✅ Selected shape updated!')
      } else if (event.data.type === 'iframe-log') {
        const prefix = `[iframe ${event.data.level}]`
        if (event.data.level === 'error') {
          console.error(prefix, ...event.data.args)
        } else {
          console.log(prefix, ...event.data.args)
        }
      }
    }

    console.log('Message listener attached')
    window.addEventListener('message', handleMessage)
    return () => {
      console.log('Message listener removed')
      window.removeEventListener('message', handleMessage)
    }
  }, [elementStyles, componentData])

  const handleSave = async () => {
    if (!id) return

    try {
      setSaving(true)

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      // Step 1: Upload pending images to backend
      const updatedStyles = { ...elementStyles }

      if (pendingImageUploads.size > 0) {
        toast.info(`${pendingImageUploads.size}개의 이미지를 업로드하는 중...`)

        for (const [shapeName, file] of pendingImageUploads.entries()) {
          try {
            // Create FormData for file upload
            const formData = new FormData()
            formData.append('file', file)
            formData.append('shape_name', shapeName)

            // Upload to backend
            const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://127.0.0.1:8000'
            const uploadResponse = await fetch(`${API_BASE_URL}/materials/${id}/upload-image`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`
              },
              body: formData
            })

            if (!uploadResponse.ok) {
              throw new Error('Image upload failed')
            }

            const uploadResult = await uploadResponse.json()
            const s3Url = uploadResult.url

            console.log(`Uploaded ${shapeName}:`, s3Url)

            // Replace object URL with S3 URL in styles
            if (updatedStyles[shapeName]?.style?.backgroundImage) {
              updatedStyles[shapeName].style.backgroundImage = `url('${s3Url}')`
            }
          } catch (error) {
            console.error(`Failed to upload image for ${shapeName}:`, error)
            toast.error(`${shapeName} 이미지 업로드 실패`)
          }
        }

        // Clear pending uploads
        setPendingImageUploads(new Map())
      }

      // Step 2: Update the current slide's styles and data in generatedSlides
      const updatedGeneratedSlides = generatedSlides.map((slide, index) => {
        if (index === currentSlideIndex) {
          // Convert 'absolute' back to 'fixed' for storage (reverse the rendering change)
          const storedStyles = { ...updatedStyles }
          Object.keys(storedStyles).forEach(key => {
            if (storedStyles[key]?.className) {
              storedStyles[key].className = storedStyles[key].className
                .replace(/\babsolute\b/g, 'fixed')
            }
          })

          // Update data - wrap in array if it was originally an array
          const updatedData = Array.isArray(slide.data) ? [componentData] : componentData

          return {
            ...slide,
            styles: storedStyles,
            data: updatedData
          }
        }
        return slide
      })

      console.log("Saving updated generated_slides:", updatedGeneratedSlides)

      // Step 3: Send to layout-styles endpoint
      await updateMaterialLayoutStyles(
        parseInt(id),
        {
          generated_slides: updatedGeneratedSlides
        },
        accessToken
      )

      // Update local state
      setElementStyles(updatedStyles)
      setComponentData(componentData)
      setGeneratedSlides(updatedGeneratedSlides)

      toast.success("저장되었습니다!")
    } catch (error) {
      console.error("Failed to save:", error)
      toast.error("저장에 실패했습니다")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    loadMaterialData()
    setSelectedShape(null)
    setPendingImageUploads(new Map())
    setEditingTextData({ dataKey: null, originalValue: null, editingValue: null, hasChanges: false })
    toast.info("초기 상태로 복원되었습니다")
  }

  // 슬라이드 전환 함수
  const handleSlideChange = (index: number) => {
    if (index < 0 || index >= generatedSlides.length) return
    if (index === currentSlideIndex) return

    // 현재 편집 중인 데이터가 있으면 저장
    setSelectedShape(null)
    setEditingTextData({ dataKey: null, originalValue: null, editingValue: null, hasChanges: false })

    // 새 슬라이드 데이터 로드
    const slide = generatedSlides[index]

    // Get component code from conversion.components
    const layoutComponentName = slide.layout_component
    console.log("Switching to slide:", index, "layout_component:", layoutComponentName)

    // Find and set matching component code
    if (conversionComponents.length > 0 && layoutComponentName) {
      const matchingComponent = conversionComponents.find(
        (c: any) => c.component_name === layoutComponentName
      )

      if (matchingComponent) {
        setComponentCode(matchingComponent.code)
        console.log("Found matching component for slide:", matchingComponent.component_name)
      } else {
        console.warn("No matching component found for:", layoutComponentName)
      }
    }

    // Get slide data
    let slideData = slide.data || null
    let slideElementStyles = slide.styles || null

    // Set component data - slideData is already an array, use first element
    if (slideData && Array.isArray(slideData) && slideData.length > 0) {
      setComponentData(slideData[0])
    } else {
      setComponentData(slideData)
    }

    if (slideElementStyles) {
      const modifiedStyles = { ...slideElementStyles }

      // Replace 'fixed' with 'absolute' for container rendering
      Object.keys(modifiedStyles).forEach(key => {
        if (modifiedStyles[key]?.className) {
          modifiedStyles[key].className = modifiedStyles[key].className
            .replace(/\bfixed\b/g, 'absolute')
        }
      })

      setElementStyles(modifiedStyles)
    } else {
      setElementStyles({})
    }

    setCurrentSlideIndex(index)
    toast.info(`슬라이드 ${index + 1}로 전환되었습니다`)
  }

  const handleBack = () => {
    navigate("/generate-v2/materials")
  }

  const updateShapeStyle = (shapeName: string, styleKey: string, value: any) => {
    console.log(`Updating ${shapeName}.${styleKey} to:`, value)

    // Update state
    setElementStyles((prev: any) => ({
      ...prev,
      [shapeName]: {
        ...prev[shapeName],
        style: {
          ...(prev[shapeName]?.style || {}),
          [styleKey]: value
        }
      }
    }))

    // Update iframe element directly for instant preview
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument
      if (iframeDoc) {
        // Use data-key attribute to find elements
        const elements = iframeDoc.querySelectorAll(`[data-key="${shapeName}"]`)
        console.log(`Found ${elements.length} elements with data-key="${shapeName}"`)
        elements.forEach((element: any) => {
          element.style[styleKey] = value
          console.log(`Applied ${styleKey}=${value} to element`)
        })
      }
    }
  }

  const updateShapeData = (componentDataKey: string, fieldKey: string, value: any) => {
    console.log(`Updating data for ${componentDataKey}.${fieldKey} to:`, value)

    // Update componentData state
    setComponentData((prev: any) => {
      if (!prev) return prev

      // Deep clone to avoid mutation
      const newData = JSON.parse(JSON.stringify(prev))

      // Update based on the data type
      if (typeof newData[componentDataKey] === 'string') {
        // If it's a simple string value, replace it directly
        newData[componentDataKey] = value
      } else if (typeof newData[componentDataKey] === 'object' && newData[componentDataKey] !== null) {
        // If it's an object, update the specific field
        newData[componentDataKey] = {
          ...newData[componentDataKey],
          [fieldKey]: value
        }
      }

      console.log('Updated componentData:', newData)
      return newData
    })

    // Update iframe element content directly for instant preview
    // Find element by matching text content
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument
      if (iframeDoc) {
        // Find elements that contain the old text value
        const oldValue = componentData?.[componentDataKey]
        const searchText = typeof oldValue === 'string' ? oldValue : (oldValue?.text || oldValue?.content)

        if (searchText && (fieldKey === 'text' || fieldKey === 'content')) {
          const allElements = iframeDoc.querySelectorAll('.editable-shape')
          allElements.forEach((element: any) => {
            if (element.textContent?.trim() === searchText.trim()) {
              element.textContent = value
              console.log(`Updated iframe element text to: ${value}`)
            }
          })
        }
      }
    }
  }

  // Get the current text content of a shape from iframe
  const getShapeTextContent = (shapeName: string): string | null => {
    if (!iframeRef.current) return null
    const iframeDoc = iframeRef.current.contentDocument
    if (!iframeDoc) return null

    const element = iframeDoc.querySelector(`[data-shape-name="${shapeName}"]`)
    return element?.textContent?.trim() || null
  }

  // Find matching key in componentData by text content
  const findDataKeyByText = (textContent: string): string | null => {
    if (!componentData || !textContent) return null

    // Search through componentData keys
    for (const [key, value] of Object.entries(componentData)) {
      if (typeof value === 'string' && value.trim() === textContent) {
        return key
      }
      // Handle nested object with text field
      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, any>
        if (obj.text?.trim() === textContent || obj.content?.trim() === textContent) {
          return key
        }
      }
    }
    return null
  }

  // Get shape data by matching text content
  const getShapeData = (shapeName: string): { key: string; value: any } | null => {
    if (!componentData) return null

    // Get current text content from the shape element
    const textContent = getShapeTextContent(shapeName)

    if (textContent) {
      // Find matching key by text content
      const matchedKey = findDataKeyByText(textContent)
      if (matchedKey) {
        const value = componentData[matchedKey]
        return {
          key: matchedKey,
          value: typeof value === 'string' ? { text: value } : value
        }
      }
    }

    // Fallback: try direct key matching
    if (componentData[shapeName]) {
      const value = componentData[shapeName]
      return {
        key: shapeName,
        value: typeof value === 'string' ? { text: value } : value
      }
    }

    return null
  }

  const deleteShapeStyleProperty = (shapeName: string, styleKey: string) => {
    console.log(`Deleting ${shapeName}.${styleKey}`)

    setElementStyles((prev: any) => {
      const newStyles = { ...prev }
      if (newStyles[shapeName]?.style) {
        const updatedStyle = { ...newStyles[shapeName].style }
        delete updatedStyle[styleKey]
        newStyles[shapeName] = {
          ...newStyles[shapeName],
          style: updatedStyle
        }
      }
      return newStyles
    })

    // Remove from iframe element
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument
      if (iframeDoc) {
        // Use data-key attribute to find elements
        const elements = iframeDoc.querySelectorAll(`[data-key="${shapeName}"]`)
        elements.forEach((element: any) => {
          element.style[styleKey] = ''
        })
      }
    }
  }

  // Load images from library
  const loadImageLibrary = useCallback(async () => {
    setLoadingImages(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const response = await fetchLayoutImages({ page: 1, page_size: 100 }, accessToken)
      setLayoutImages(response.images)
    } catch (error) {
      console.error('Failed to load images:', error)
      toast.error('이미지 목록을 불러오는데 실패했습니다')
    } finally {
      setLoadingImages(false)
    }
  }, [])

  // Load images when dialog opens
  useEffect(() => {
    if (imageLibraryOpen) {
      loadImageLibrary()
    }
  }, [imageLibraryOpen, loadImageLibrary])

  // Open image library for a shape
  const openImageLibraryForShape = (shapeName: string) => {
    setCurrentShapeForImage(shapeName)
    setImageLibraryOpen(true)
    // Images will be loaded by useEffect when dialog opens
  }

  // Handle image selection from library
  const handleImageSelect = (image: LayoutImageItem) => {
    if (currentShapeForImage) {
      updateShapeStyle(currentShapeForImage, "backgroundImage", `url('${image.image_url}')`)
      updateShapeStyle(currentShapeForImage, "backgroundSize", "cover")
      updateShapeStyle(currentShapeForImage, "backgroundPosition", "center")
      updateShapeStyle(currentShapeForImage, "backgroundRepeat", "no-repeat")
      toast.success(`"${image.image_name}" 이미지가 적용되었습니다`)
      setImageLibraryOpen(false)
      setCurrentShapeForImage(null)
    }
  }

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedImageFile(file)
    // Set default name as filename without extension
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    setImageNameInput(nameWithoutExt)
  }

  // Handle new image upload to library
  const handleLibraryImageUpload = async () => {
    if (!selectedImageFile) {
      toast.error('파일을 선택해주세요')
      return
    }

    if (!imageNameInput.trim()) {
      toast.error('이미지 이름을 입력해주세요')
      return
    }

    setUploadingImage(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      await uploadLayoutImage(selectedImageFile, imageNameInput.trim(), accessToken)

      toast.success('이미지가 업로드되었습니다')

      // Reset form
      setSelectedImageFile(null)
      setImageNameInput('')

      // Reload image library
      await loadImageLibrary()
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('이미지 업로드에 실패했습니다')
    } finally {
      setUploadingImage(false)
    }
  }

  // Cancel upload
  const handleCancelUpload = () => {
    setSelectedImageFile(null)
    setImageNameInput('')
  }

  const selectedShapeData = selectedShape ? elementStyles[selectedShape] : null

  if (loading) {
    return (
      <Layout hideSidebar>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">자료를 불러오는 중...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideSidebar>
      <div className="flex h-screen w-full bg-gray-50">
        {/* Left Sidebar: Slide Panel */}
        <div className={`relative flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${slidePanelOpen ? 'w-[200px]' : 'w-0'}`}>
          {/* Panel Content */}
          {slidePanelOpen && (
            <>
              {/* Panel Header */}
              <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-sm">슬라이드</span>
                  <span className="text-xs text-gray-500">({generatedSlides.length})</span>
                </div>
              </div>

              {/* Slide List */}
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {generatedSlides.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      슬라이드 없음
                    </div>
                  ) : (
                    generatedSlides.map((slide, index) => (
                      <button
                        key={index}
                        onClick={() => handleSlideChange(index)}
                        className={`w-full p-2 rounded-lg border transition-all text-left ${
                          currentSlideIndex === index
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {/* Slide Thumbnail */}
                        <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                          <span className="text-2xl font-bold text-gray-300">{index + 1}</span>
                        </div>
                        {/* Slide Info */}
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-gray-700 truncate">
                            슬라이드 {index + 1}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {slide.layout_component || '레이아웃'}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Toggle Button */}
          <button
            onClick={() => setSlidePanelOpen(!slidePanelOpen)}
            className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10 w-8 h-16 bg-white border border-gray-200 rounded-r-lg shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
            title={slidePanelOpen ? '패널 닫기' : '패널 열기'}
          >
            {slidePanelOpen ? (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Center Panel: Preview */}
        <div className="flex-1 flex flex-col">
          {/* Top Header Bar */}
          <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              돌아가기
            </Button>

            <div className="flex items-center gap-3">
              {/* Edit Mode Toggle */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  {editMode ? '편집 모드' : '보기 모드'}
                </span>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    초기화
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>초기화 확인</AlertDialogTitle>
                    <AlertDialogDescription>
                      모든 변경사항이 취소되고 초기 상태로 복원됩니다.
                      <br />
                      정말 초기화하시겠습니까?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>
                      초기화
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
            <div className="bg-white shadow-2xl rounded-lg overflow-hidden">
              <iframe
                ref={iframeRef}
                style={{
                  width: '1280px',
                  height: '720px',
                  border: 'none'
                }}
                title="Component Preview"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar: Style Editor */}
        <div className="w-[500px] bg-white border-l border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">스타일 편집</h2>

            {/* View Mode Warning */}
            {!editMode && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <div className="font-semibold mb-1">⚠️ 보기 모드</div>
                <div>현재 보기 모드입니다. 스타일을 편집하려면 상단의 토글을 눌러 <strong>편집 모드</strong>로 전환하세요.</div>
              </div>
            )}
          </div>

          {/* Selected Shape Editor */}
          <div className="flex-1 overflow-y-auto">
            {selectedShape && selectedShapeData ? (
              <ScrollArea className="h-full">
                <div className={`p-6 space-y-3 ${!editMode ? 'opacity-50 pointer-events-none' : ''}`}>
                  {/* Position */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">위치</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500">X (left)</Label>
                        <Input
                          type="number"
                          value={String(selectedShapeData.style?.left || "").replace('px', '')}
                          onChange={(e) => {
                            const value = e.target.value
                            updateShapeStyle(selectedShape, "left", value ? `${value}px` : "")
                          }}
                          placeholder="0"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Y (top)</Label>
                        <Input
                          type="number"
                          value={String(selectedShapeData.style?.top || "").replace('px', '')}
                          onChange={(e) => {
                            const value = e.target.value
                            updateShapeStyle(selectedShape, "top", value ? `${value}px` : "")
                          }}
                          placeholder="0"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Data Content */}
                  {(() => {
                    const { dataKey, originalValue, editingValue, hasChanges } = editingTextData
                    const currentText = getShapeTextContent(selectedShape)

                    console.log('🔍 Editing text data:', editingTextData)
                    console.log('📦 Component data:', componentData)
                    console.log('📝 Current text:', currentText)

                    // 텍스트 적용 함수 (iframe + componentData 업데이트)
                    const applyTextChange = () => {
                      if (!dataKey || !hasChanges) return

                      // componentData 업데이트
                      setComponentData((prev: any) => {
                        if (!prev) return prev
                        const newData = { ...prev }

                        if (typeof originalValue === 'string') {
                          newData[dataKey] = editingValue
                        } else if (typeof originalValue === 'object' && originalValue !== null) {
                          const fieldKey = originalValue.text !== undefined ? 'text' : 'content'
                          newData[dataKey] = {
                            ...originalValue,
                            [fieldKey]: editingValue
                          }
                        }

                        return newData
                      })

                      // iframe 업데이트
                      if (iframeRef.current) {
                        const iframeDoc = iframeRef.current.contentDocument
                        if (iframeDoc) {
                          const elements = iframeDoc.querySelectorAll(`[data-shape-name="${selectedShape}"]`)
                          elements.forEach((el: any) => {
                            el.textContent = editingValue
                          })
                        }
                      }

                      // 상태 업데이트 - 변경사항 적용됨
                      setEditingTextData(prev => ({
                        ...prev,
                        originalValue: typeof originalValue === 'string' ? editingValue : { ...originalValue, [originalValue.text !== undefined ? 'text' : 'content']: editingValue },
                        hasChanges: false
                      }))

                      toast.success('텍스트가 적용되었습니다')
                    }

                    // 취소 함수
                    const cancelTextChange = () => {
                      if (!dataKey) return

                      const originalText = typeof originalValue === 'string' ? originalValue : (originalValue?.text || originalValue?.content || '')

                      // 원본으로 되돌리기
                      setEditingTextData(prev => ({
                        ...prev,
                        editingValue: originalText,
                        hasChanges: false
                      }))

                      // iframe도 원본으로 되돌리기
                      if (iframeRef.current) {
                        const iframeDoc = iframeRef.current.contentDocument
                        if (iframeDoc) {
                          const elements = iframeDoc.querySelectorAll(`[data-shape-name="${selectedShape}"]`)
                          elements.forEach((el: any) => {
                            el.textContent = originalText
                          })
                        }
                      }
                    }

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">내용 편집</Label>
                          {dataKey && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">
                              {dataKey}
                            </span>
                          )}
                        </div>

                        {/* Text/Content field */}
                        {dataKey ? (
                          <>
                            <div>
                              <Label className="text-xs text-gray-500 mb-1">텍스트</Label>
                              <Textarea
                                value={editingValue || ''}
                                onChange={(e) => {
                                  const newValue = e.target.value
                                  const originalText = typeof originalValue === 'string' ? originalValue : (originalValue?.text || originalValue?.content || '')

                                  setEditingTextData(prev => ({
                                    ...prev,
                                    editingValue: newValue,
                                    hasChanges: newValue !== originalText
                                  }))

                                  // 실시간 미리보기 (iframe 업데이트)
                                  if (iframeRef.current) {
                                    const iframeDoc = iframeRef.current.contentDocument
                                    if (iframeDoc) {
                                      const elements = iframeDoc.querySelectorAll(`[data-shape-name="${selectedShape}"]`)
                                      elements.forEach((el: any) => {
                                        el.textContent = newValue
                                      })
                                    }
                                  }
                                }}
                                placeholder="텍스트 입력"
                                className="min-h-[80px] text-xs"
                              />
                            </div>

                            {/* 변경사항 표시 및 적용/취소 버튼 */}
                            {hasChanges && (
                              <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                <span className="text-xs text-yellow-700 flex-1">
                                  ⚠️ 변경사항이 있습니다
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelTextChange}
                                  className="h-7 text-xs"
                                >
                                  취소
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={applyTextChange}
                                  className="h-7 text-xs"
                                >
                                  적용
                                </Button>
                              </div>
                            )}

                            {/* 원본 텍스트 표시 */}
                            <details className="text-xs">
                              <summary className="cursor-pointer text-gray-500 hover:text-gray-700 py-1">
                                📊 원본 데이터 보기
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 overflow-auto max-h-32 text-[10px]">
                                {JSON.stringify({ key: dataKey, value: originalValue }, null, 2)}
                              </pre>
                            </details>
                          </>
                        ) : (
                          <div className="text-xs text-gray-400 p-3 bg-gray-50 rounded border border-gray-200">
                            <div className="mb-2">ℹ️ 텍스트 매칭 정보</div>
                            <div className="text-[10px] space-y-1">
                              <div>현재 텍스트: <span className="font-mono bg-gray-100 px-1">{currentText || '(없음)'}</span></div>
                              <div>매칭된 키: <span className="font-mono bg-gray-100 px-1">{'매칭 없음'}</span></div>
                            </div>
                            {componentData && (
                              <details className="mt-2">
                                <summary className="cursor-pointer hover:text-gray-600">사용 가능한 키 보기</summary>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {Object.keys(componentData).map(key => (
                                    <span key={key} className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{key}</span>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Color */}
                  <div className="space-y-2">
                    <Label className="text-xs">글씨 색상</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={String(selectedShapeData.style?.color || "#000000")}
                        onChange={(e) => updateShapeStyle(selectedShape, "color", e.target.value)}
                        className="w-16 h-8 cursor-pointer"
                      />
                      <Input
                        value={String(selectedShapeData.style?.color || "")}
                        onChange={(e) => updateShapeStyle(selectedShape, "color", e.target.value)}
                        placeholder="글씨 색상"
                        className="flex-1 h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Background Color */}
                  <div className="space-y-2">
                    <Label className="text-xs">배경색</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={String(selectedShapeData.style?.backgroundColor || "#ffffff")}
                        onChange={(e) => updateShapeStyle(selectedShape, "backgroundColor", e.target.value)}
                        className="w-16 h-8 cursor-pointer"
                      />
                      <Input
                        value={String(selectedShapeData.style?.backgroundColor || "")}
                        onChange={(e) => updateShapeStyle(selectedShape, "backgroundColor", e.target.value)}
                        placeholder="배경색"
                        className="flex-1 h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Background Image */}
                  <div className="space-y-2">
                    <Label className="text-xs">배경 이미지</Label>

                    {/* Mode Toggle */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => setBgImageMode('url')}
                        className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                          bgImageMode === 'url'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        URL 입력
                      </button>
                      <button
                        onClick={() => setBgImageMode('library')}
                        className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                          bgImageMode === 'library'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        라이브러리
                      </button>
                    </div>

                    {/* URL Input Mode */}
                    {bgImageMode === 'url' && (
                      <Input
                        type="text"
                        value={String(selectedShapeData.style?.backgroundImage || "").replace(/^url\(['"]?|['"]?\)$/g, '')}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value) {
                            // Set background image with cover properties
                            updateShapeStyle(selectedShape, "backgroundImage", `url('${value}')`)
                            updateShapeStyle(selectedShape, "backgroundSize", "cover")
                            updateShapeStyle(selectedShape, "backgroundPosition", "center")
                            updateShapeStyle(selectedShape, "backgroundRepeat", "no-repeat")
                          } else {
                            // Clear background image and related properties
                            updateShapeStyle(selectedShape, "backgroundImage", "")
                            updateShapeStyle(selectedShape, "backgroundSize", "")
                            updateShapeStyle(selectedShape, "backgroundPosition", "")
                            updateShapeStyle(selectedShape, "backgroundRepeat", "")
                          }
                        }}
                        placeholder="이미지 URL 입력"
                        className="h-8 text-xs font-mono"
                      />
                    )}

                    {/* Image Library Mode */}
                    {bgImageMode === 'library' && (
                      <div>
                        <Button
                          onClick={() => openImageLibraryForShape(selectedShape)}
                          className="w-full h-9 gap-2"
                          variant="outline"
                        >
                          <ImageIcon className="w-4 h-4" />
                          이미지 라이브러리 열기
                        </Button>
                        {selectedShapeData.style?.backgroundImage && (
                          <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">현재 이미지:</p>
                            <img
                              src={String(selectedShapeData.style.backgroundImage).replace(/^url\(['"]?|['"]?\)$/g, '')}
                              alt="Current background"
                              className="w-full h-20 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Border */}
                  <div className="space-y-2">
                    <Label className="text-xs">테두리</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={borderStyle}
                        onChange={(e) => {
                          setBorderStyle(e.target.value)
                          if (borderWidth && e.target.value !== 'none') {
                            updateShapeStyle(selectedShape, "border", `${borderWidth}px ${e.target.value} ${borderColor}`)
                          } else if (e.target.value === 'none') {
                            updateShapeStyle(selectedShape, "border", "none")
                          }
                        }}
                        className="h-8 px-2 text-xs border rounded-md"
                      >
                        <option value="none">없음</option>
                        <option value="solid">실선</option>
                        <option value="dashed">대시</option>
                        <option value="dotted">점선</option>
                        <option value="double">이중선</option>
                      </select>
                      <Input
                        type="number"
                        value={borderWidth}
                        onChange={(e) => {
                          setBorderWidth(e.target.value)
                          if (e.target.value && borderStyle !== 'none') {
                            updateShapeStyle(selectedShape, "border", `${e.target.value}px ${borderStyle} ${borderColor}`)
                          }
                        }}
                        placeholder="두께"
                        className="h-8 text-xs"
                      />
                      <Input
                        type="color"
                        value={borderColor}
                        onChange={(e) => {
                          setBorderColor(e.target.value)
                          if (borderWidth && borderStyle !== 'none') {
                            updateShapeStyle(selectedShape, "border", `${borderWidth}px ${borderStyle} ${e.target.value}`)
                          }
                        }}
                        className="h-8 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Border Radius */}
                  <div className="space-y-2">
                    <Label className="text-xs">모서리 둥글기 (px)</Label>
                    <Input
                      type="number"
                      value={String(selectedShapeData.style?.borderRadius || "").replace('px', '')}
                      onChange={(e) => {
                        const value = e.target.value
                        updateShapeStyle(selectedShape, "borderRadius", value ? `${value}px` : "")
                      }}
                      placeholder="예: 8"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {/* Font Family */}
                  <div className="space-y-2">
                    <Label className="text-xs">글꼴</Label>
                    <select
                      value={String(selectedShapeData.style?.fontFamily || "")}
                      onChange={(e) => updateShapeStyle(selectedShape, "fontFamily", e.target.value)}
                      className="w-full h-8 px-2 text-xs border rounded-md"
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
                        <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
                        <option value="Impact, sans-serif">Impact</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Font Size */}
                  <div className="space-y-2">
                    <Label className="text-xs">글자 크기 (px)</Label>
                    <Input
                      type="number"
                      value={String(selectedShapeData.style?.fontSize || "").replace('px', '')}
                      onChange={(e) => {
                        const value = e.target.value
                        updateShapeStyle(selectedShape, "fontSize", value ? `${value}px` : "")
                      }}
                      placeholder="예: 24"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                </div>
              </ScrollArea>
          ) : (
            <div className="p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👆</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  요소를 선택하세요
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  왼쪽 미리보기에서 편집할 요소를 클릭하세요
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-600 space-y-2">
                  <div className="font-semibold mb-2">💡 사용 방법:</div>
                  <div>1. 미리보기 화면의 텍스트나 요소에 마우스를 올리면 파란색 테두리가 표시됩니다</div>
                  <div>2. 편집하고 싶은 요소를 클릭하세요</div>
                  <div>3. 선택된 요소는 진한 파란색 테두리로 표시됩니다</div>
                  <div>4. 오른쪽 편집 패널에서 스타일을 변경할 수 있습니다</div>
                  <div>5. 변경사항은 즉시 미리보기에 반영됩니다</div>
                </div>
                {!componentCode && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    ⚠️ 컴포넌트 코드가 로드되지 않았습니다. 페이지를 새로고침해주세요.
                  </div>
                )}
              </div>
            </div>
          )}
          </div>

          {/* Footer with Save Button */}
          {selectedShape && selectedShapeData && (
            <div className="border-t border-gray-200 p-4 bg-white">
              {pendingImageUploads.size > 0 && (
                <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                  📤 {pendingImageUploads.size}개의 이미지 업로드 대기 중
                </div>
              )}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full gap-2 h-12 text-base"
              >
                <Save className="w-4 h-4" />
                {saving ? "저장 중..." : "저장하기"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Image Library Dialog */}
      <Dialog open={imageLibraryOpen} onOpenChange={(open) => {
        setImageLibraryOpen(open)
        if (!open) {
          // Reset upload form when dialog closes
          setSelectedImageFile(null)
          setImageNameInput('')
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>이미지 라이브러리</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="list" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">이미지 목록</TabsTrigger>
              <TabsTrigger value="upload">업로드</TabsTrigger>
            </TabsList>

            {/* Image List Tab */}
            <TabsContent value="list" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {loadingImages ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">이미지 로딩 중...</p>
                    </div>
                  </div>
                ) : layoutImages.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                      <p className="text-sm text-muted-foreground">등록된 이미지가 없습니다</p>
                      <p className="text-xs text-muted-foreground">"업로드" 탭에서 이미지를 추가하세요</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 p-2">
                    {layoutImages.map((image) => (
                      <div
                        key={image.id}
                        className="group relative border rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-all hover:shadow-lg"
                        onClick={() => handleImageSelect(image)}
                      >
                        <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                          <img
                            src={image.image_url}
                            alt={image.image_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              // Prevent infinite loop by setting a flag
                              const target = e.currentTarget
                              if (!target.dataset.errorHandled) {
                                target.dataset.errorHandled = 'true'
                                // Use a transparent 1x1 pixel as placeholder
                                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E'
                              }
                            }}
                          />
                        </div>
                        <div className="p-2 bg-white">
                          <p className="text-xs font-medium text-gray-700 truncate" title={image.image_name}>
                            {image.image_name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(image.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 text-white px-3 py-1 rounded text-sm">
                            선택
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload" className="flex-1 overflow-hidden mt-4">
              <div className="h-[500px] flex items-center justify-center">
                {!selectedImageFile ? (
                  <div className="w-full max-w-md">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
                      <div className="flex flex-col items-center gap-4">
                        <Upload className="w-12 h-12 text-gray-400" />
                        <div className="text-center">
                          <p className="text-base font-medium text-gray-700 mb-1">이미지 업로드</p>
                          <p className="text-sm text-gray-500">클릭하여 파일을 선택하세요</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          id="library-upload"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleFileSelect(file)
                              e.target.value = '' // Reset input
                            }
                          }}
                        />
                        <Button
                          onClick={() => document.getElementById('library-upload')?.click()}
                          className="gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          파일 선택
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-md">
                    <div className="border border-gray-300 rounded-lg p-6 bg-white space-y-4">
                      <div className="text-center">
                        <div className="w-48 h-48 bg-gray-100 rounded-lg overflow-hidden mx-auto mb-4">
                          <img
                            src={URL.createObjectURL(selectedImageFile)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          <div>파일명: {selectedImageFile.name}</div>
                          <div>크기: {(selectedImageFile.size / 1024).toFixed(2)} KB</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">이미지 이름 *</Label>
                        <Input
                          value={imageNameInput}
                          onChange={(e) => setImageNameInput(e.target.value)}
                          placeholder="이미지 이름을 입력하세요"
                          autoFocus
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleCancelUpload}
                          disabled={uploadingImage}
                          className="flex-1"
                        >
                          취소
                        </Button>
                        <Button
                          onClick={handleLibraryImageUpload}
                          disabled={uploadingImage || !imageNameInput.trim()}
                          className="flex-1 gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          {uploadingImage ? '업로드 중...' : '업로드'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
