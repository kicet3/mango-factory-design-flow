// MaterialEditor - elementStyles 기반 스타일 편집 (iframe + Babel 버전)
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Save, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { fetchMaterialDetail, updateMaterialLayoutStyles } from "@/services/conversions"
import { supabase } from "@/integrations/supabase/client"

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
  const [currentSlideIndex] = useState(0) // Currently editing slide index

  // Edit mode toggle
  const [editMode, setEditMode] = useState(true) // true = 편집 모드, false = 보기 모드

  // Iframe reference
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Border state
  const [borderStyle, setBorderStyle] = useState("solid")
  const [borderWidth, setBorderWidth] = useState("")
  const [borderColor, setBorderColor] = useState("#000000")

  // Background image upload state
  const [bgImageMode, setBgImageMode] = useState<'url' | 'upload'>('url')
  const [pendingImageUploads, setPendingImageUploads] = useState<Map<string, File>>(new Map())

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

      // Find matching component code
      if (materialDetail.conversion && materialDetail.conversion.components) {
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

        setSelectedShape(event.data.shapeName)

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
  }, [elementStyles])

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
    toast.info("초기 상태로 복원되었습니다")
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

  const updateShapeData = (shapeName: string, dataKey: string, value: any) => {
    console.log(`Updating data for ${shapeName}.${dataKey} to:`, value)

    // Update iframe element content directly for instant preview (before state update)
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument
      if (iframeDoc) {
        const elements = iframeDoc.querySelectorAll(`[data-key="${shapeName}"]`)
        console.log(`Found ${elements.length} elements with data-key="${shapeName}" for data update`)
        elements.forEach((element: any) => {
          if (dataKey === 'text' || dataKey === 'content') {
            element.textContent = value
            console.log(`Updated text content to: ${value}`)
          }
        })
      }
    }

    // Update componentData state
    setComponentData((prev: any) => {
      if (!prev) return prev

      // Deep clone to avoid mutation
      const newData = JSON.parse(JSON.stringify(prev))

      // Find and update the shape data
      // Try different possible structures
      if (newData[shapeName]) {
        // Direct object structure: { shape_1: { text: "..." } }
        newData[shapeName] = {
          ...newData[shapeName],
          [dataKey]: value
        }
      } else if (newData.shapes && newData.shapes[shapeName]) {
        // Nested structure: { shapes: { shape_1: { text: "..." } } }
        newData.shapes[shapeName] = {
          ...newData.shapes[shapeName],
          [dataKey]: value
        }
      } else if (Array.isArray(newData)) {
        // Array structure: [{ key: "shape_1", text: "..." }]
        const index = newData.findIndex((item: any) => item.key === shapeName || item.name === shapeName)
        if (index !== -1) {
          newData[index] = {
            ...newData[index],
            [dataKey]: value
          }
        }
      }

      console.log('Updated componentData:', newData)
      return newData
    })
  }

  const getShapeData = (shapeName: string) => {
    if (!componentData) return null

    // Try different possible structures
    if (componentData[shapeName]) {
      return componentData[shapeName]
    } else if (componentData.shapes && componentData.shapes[shapeName]) {
      return componentData.shapes[shapeName]
    } else if (Array.isArray(componentData)) {
      return componentData.find((item: any) => item.key === shapeName || item.name === shapeName)
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

  const handleBackgroundImageUpload = (shapeName: string, file: File) => {
    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file)

    // Store file for later upload
    setPendingImageUploads(prev => {
      const newMap = new Map(prev)
      newMap.set(shapeName, file)
      return newMap
    })

    // Set temporary preview with object URL
    updateShapeStyle(shapeName, "backgroundImage", `url('${objectUrl}')`)
    updateShapeStyle(shapeName, "backgroundSize", "cover")
    updateShapeStyle(shapeName, "backgroundPosition", "center")
    updateShapeStyle(shapeName, "backgroundRepeat", "no-repeat")

    toast.info("이미지가 선택되었습니다. 저장 버튼을 눌러 업로드하세요.")
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

              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                초기화
              </Button>
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
                    const shapeData = getShapeData(selectedShape)
                    console.log('Shape data for', selectedShape, ':', shapeData)
                    console.log('Component data:', componentData)

                    // Always show content editor if shape is selected
                    return (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">내용 편집</Label>

                        {/* Text/Content field */}
                        {shapeData && (shapeData.text !== undefined || shapeData.content !== undefined) ? (
                          <div>
                            <Label className="text-xs text-gray-500 mb-1">텍스트</Label>
                            <Textarea
                              value={String(shapeData.text || shapeData.content || "")}
                              onChange={(e) => {
                                const key = shapeData.text !== undefined ? 'text' : 'content'
                                updateShapeData(selectedShape, key, e.target.value)
                              }}
                              placeholder="텍스트 입력"
                              className="min-h-[80px] text-xs"
                            />
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 p-3 bg-gray-50 rounded border border-gray-200">
                            이 요소에는 편집 가능한 텍스트 데이터가 없습니다.
                          </div>
                        )}

                        {/* Show all data properties for debugging */}
                        {shapeData && Object.keys(shapeData).length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                              데이터 구조 보기
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 overflow-auto max-h-32">
                              {JSON.stringify(shapeData, null, 2)}
                            </pre>
                          </details>
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
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => setBgImageMode('url')}
                        className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                          bgImageMode === 'url'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        URL 입력
                      </button>
                      <button
                        onClick={() => setBgImageMode('upload')}
                        className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                          bgImageMode === 'upload'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        파일 업로드
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

                    {/* File Upload Mode */}
                    {bgImageMode === 'upload' && (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleBackgroundImageUpload(selectedShape, file)
                            }
                          }}
                          className="w-full h-8 text-xs border rounded-md file:mr-2 file:px-3 file:py-1 file:rounded-l-md file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                        />
                        {pendingImageUploads.has(selectedShape) && (
                          <p className="text-xs text-orange-600 mt-1">
                            ⏳ 저장 대기 중 - 저장 버튼을 눌러주세요
                          </p>
                        )}
                        {selectedShapeData.style?.backgroundImage && (
                          <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">미리보기:</p>
                            <img
                              src={String(selectedShapeData.style.backgroundImage).replace(/^url\(['"]?|['"]?\)$/g, '')}
                              alt="Background preview"
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
    </Layout>
  )
}
