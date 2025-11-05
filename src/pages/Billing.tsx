import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { CreditCard, Check, Star, Crown, Building2, Calendar, ArrowRight } from 'lucide-react'

const plans = [
  {
    id: 'free',
    name: '무료',
    price: 0,
    period: '월',
    description: '기본적인 기능을 체험해보세요',
    features: [
      '월 5회 자료 생성',
      '기본 템플릿 이용',
      'PDF 다운로드',
      '커뮤니티 지원'
    ],
    icon: Star,
    color: 'text-muted-foreground',
    bgColor: 'bg-secondary'
  },
  {
    id: 'premium',
    name: '프리미엄',
    price: 29000,
    period: '월',
    description: '더 많은 생성과 고급 기능',
    features: [
      '월 50회 자료 생성',
      '모든 템플릿 이용',
      '다양한 형식 다운로드',
      '우선 고객 지원',
      '고급 편집 기능',
      '클라우드 저장소'
    ],
    icon: Crown,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    popular: true
  },
  {
    id: 'enterprise',
    name: '엔터프라이즈',
    price: 99000,
    period: '월',
    description: '학교 및 기관을 위한 플랜',
    features: [
      '무제한 자료 생성',
      '맞춤형 템플릿',
      '대량 생성 기능',
      '전담 고객 지원',
      'API 접근',
      '관리자 대시보드',
      '사용자 관리',
      '온사이트 교육'
    ],
    icon: Building2,
    color: 'text-green-600',
    bgColor: 'bg-green-600/10'
  }
]

const currentUsage = {
  plan: 'free',
  used: 3,
  limit: 5,
  renewDate: '2024-02-15'
}

export default function Billing() {
  const [loading, setLoading] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  // 로그인하지 않은 경우도 요금제 정보는 볼 수 있도록 함

  const handleUpgrade = async (planId: string) => {
    // 로그인하지 않은 경우 로그인 페이지로 이동
    if (!user) {
      toast.error('플랜 업그레이드를 위해 먼저 로그인해주세요.')
      navigate('/auth')
      return
    }

    if (planId === 'enterprise') {
      navigate('/support?tab=inquiry')
      return
    }
    
    setLoading(planId)
    
    try {
      // Here you would integrate with payment service
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success(`${plans.find(p => p.id === planId)?.name} 플랜으로 업그레이드되었습니다.`)
    } catch (error) {
      toast.error('결제 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading('')
    }
  }

  const currentPlan = plans.find(p => p.id === currentUsage.plan)
  const usagePercentage = (currentUsage.used / currentUsage.limit) * 100

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">요금제 및 결제</h1>
          <p className="text-muted-foreground mt-1">현재 플랜을 확인하고 업그레이드하세요</p>
        </div>

        {/* Current Plan Status - 로그인한 경우만 표시 */}
        {user && (
          <Card className="mf-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                현재 플랜
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">현재 플랜</p>
                  <div className="flex items-center gap-2">
                    {currentPlan && <currentPlan.icon className={`h-5 w-5 ${currentPlan.color}`} />}
                    <span className="text-lg font-semibold">{currentPlan?.name}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">이번 달 사용량</p>
                    <span className="text-sm font-medium">
                      {currentUsage.used} / {currentUsage.limit}
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">갱신일</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{currentUsage.renewDate}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = user && plan.id === currentUsage.plan
            
            return (
              <Card 
                key={plan.id} 
                className={`mf-card relative ${plan.popular ? 'mf-mango-border scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="mf-mango-badge">
                      인기
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className={`w-12 h-12 ${plan.bgColor} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                    <Icon className={`h-6 w-6 ${plan.color}`} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold">
                      {plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${
                      isCurrentPlan 
                        ? 'mf-button-primary' 
                        : plan.popular 
                          ? 'mf-mango-button' 
                          : 'mf-button-primary'
                    }`}
                    disabled={isCurrentPlan || loading === plan.id}
                    onClick={() => !isCurrentPlan && handleUpgrade(plan.id)}
                  >
                    {loading === plan.id ? (
                      '처리 중...'
                    ) : isCurrentPlan ? (
                      '현재 플랜'
                    ) : plan.id === 'enterprise' ? (
                      <>
                        문의하기
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    ) : (
                      <>
                        업그레이드
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Billing History - 로그인한 경우만 표시 */}
        {user && (
          <Card className="mf-card">
            <CardHeader>
              <CardTitle>결제 내역</CardTitle>
              <CardDescription>최근 결제 내역을 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">결제 내역이 없습니다</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}