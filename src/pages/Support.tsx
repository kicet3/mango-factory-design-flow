import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useFileUpload } from '@/hooks/useFileUpload'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { HelpCircle, Send, MessageCircle, Mail, Phone, FileText, Upload, X } from 'lucide-react'

interface HelpRequestType {
  help_request_type_id: number
  help_request_type_name: string
}

const faqData = [
  {
    question: "MangoFactory는 어떤 서비스인가요?",
    answer: "MangoFactory는 AI를 활용하여 교육 자료를 자동으로 생성해주는 플랫폼입니다. 교사들이 손쉽게 워크시트, 퀴즈, 발표자료 등을 만들 수 있도록 도와드립니다."
  },
  {
    question: "무료로 사용할 수 있나요?",
    answer: "네, 기본적인 기능은 무료로 이용하실 수 있습니다. 월 5회까지 자료 생성이 가능하며, 프리미엄 플랜을 통해 더 많은 기능과 생성 횟수를 이용하실 수 있습니다."
  },
  {
    question: "생성된 자료의 저작권은 어떻게 되나요?",
    answer: "생성된 모든 교육 자료의 저작권은 사용자에게 귀속됩니다. 자유롭게 수정, 배포, 상업적 이용이 가능합니다."
  },
  {
    question: "교사 인증은 왜 필요한가요?",
    answer: "교사 인증을 통해 교육 목적의 사용임을 확인하고, 더 전문적인 기능과 무제한 생성 서비스를 제공하기 위함입니다."
  },
  {
    question: "어떤 파일 형식으로 다운로드할 수 있나요?",
    answer: "PDF, Word, PowerPoint 등 다양한 형식으로 다운로드가 가능합니다. 생성하는 자료 유형에 따라 최적화된 형식을 제공합니다."
  }
]

export default function Support() {
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    message: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [helpRequestTypes, setHelpRequestTypes] = useState<HelpRequestType[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { uploadFile, uploading } = useFileUpload()

  useEffect(() => {
    fetchHelpRequestTypes()
  }, [])

  const fetchHelpRequestTypes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_help_request_types')

      if (error) throw error
      setHelpRequestTypes(data || [])
    } catch (error) {
      console.error('Error fetching help request types:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let fileUrl = null
      
      // 파일이 선택되어 있다면 업로드
      if (selectedFile) {
        const uploadResult = await uploadFile(selectedFile, 'supports')
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || '파일 업로드에 실패했습니다.')
        }
        fileUrl = uploadResult.url
      }

      const { data, error } = await (supabase as any)
        .rpc('insert_help_request', {
          p_help_request_type_id: parseInt(formData.category),
          p_help_request_email: formData.email,
          p_help_request_name: formData.subject,
          p_help_request_content: formData.message,
          p_help_request_file_path: fileUrl
        })

      if (error) throw error
      
      toast.success('문의가 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.')
      
      setFormData({ category: '', subject: '', message: '', email: '' })
      setSelectedFile(null)
    } catch (error) {
      console.error('Error submitting support request:', error)
      toast.error('문의 전송 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 파일 크기 확인 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('파일 크기는 5MB를 초과할 수 없습니다.')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">고객 지원</h1>
          <p className="text-muted-foreground mt-1">궁금한 점이 있으시면 언제든지 문의해주세요</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Methods */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="mf-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  빠른 연락 방법
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">이메일</p>
                    <p className="text-sm text-muted-foreground">sweethopetown@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">전화</p>
                    <p className="text-sm text-muted-foreground">010-2621-4454</p>
                  </div>
                </div>
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    평일 09:00 - 18:00<br />
                    (토/일/공휴일 휴무)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="mf-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  도움말 문서
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a 
                      href="https://www.notion.so/23f731b0f3a9808aa168ed2362c2cfb2?pvs=21" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      사용자 가이드
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a 
                      href="https://www.notion.so/23f731b0f3a980e5be54d85222160700?pvs=21" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      업데이트 내역
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* FAQ Section */}
            <Card className="mf-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  자주 묻는 질문
                </CardTitle>
                <CardDescription>
                  먼저 FAQ를 확인해보세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqData.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Contact Form */}
            <Card className="mf-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  문의하기
                </CardTitle>
                <CardDescription>
                  FAQ에서 답을 찾지 못하셨다면 직접 문의해주세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="category">문의 유형</Label>
                       <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                         <SelectTrigger className="mf-input">
                           <SelectValue placeholder="문의 유형을 선택하세요" />
                         </SelectTrigger>
                         <SelectContent>
                           {helpRequestTypes.map((type) => (
                             <SelectItem key={type.help_request_type_id} value={type.help_request_type_id.toString()}>
                               {type.help_request_type_name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">이메일</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="답변받을 이메일 주소"
                        required
                        className="mf-input"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">제목</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="문의 제목을 간단히 입력하세요"
                      required
                      className="mf-input"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">내용</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="문의 내용을 자세히 설명해주세요"
                      required
                      rows={6}
                      className="mf-input resize-none"
                    />
                  </div>

                   <div className="space-y-2">
                     <Label>파일 첨부 (선택사항)</Label>
                     <div className="space-y-2">
                       {!selectedFile ? (
                         <div>
                           <input
                              type="file"
                              id="file-input"
                              accept="image/*,.pdf,.doc,.docx,.hwp,.hwpx,.ppt,.pptx"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                           <Button
                             type="button"
                             variant="outline"
                             onClick={() => document.getElementById('file-input')?.click()}
                             className="w-full"
                           >
                             <Upload className="h-4 w-4 mr-2" />
                             파일 선택
                           </Button>
                         </div>
                       ) : (
                         <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary">
                           <div className="flex items-center space-x-2">
                             <FileText className="h-4 w-4 text-muted-foreground" />
                             <span className="text-sm truncate max-w-[200px]">
                               {selectedFile.name}
                             </span>
                             <span className="text-xs text-muted-foreground">
                               ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                             </span>
                           </div>
                           <Button
                             type="button"
                             onClick={handleRemoveFile}
                             variant="ghost"
                             size="sm"
                           >
                             <X className="h-4 w-4" />
                           </Button>
                         </div>
                       )}
                     </div>
                   </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full mf-button-primary"
                    disabled={loading || uploading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {loading || uploading ? '전송 중...' : '문의 전송'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}