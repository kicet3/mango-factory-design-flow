import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Sparkles, Users, FileCheck, Brain, CheckCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/use-auth"
import heroImage from "@/assets/hero-illustration.jpg"

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleGenerateClick = () => {
    if (user) {
      // 이미 로그인된 사용자는 바로 생성 페이지로 이동
      navigate('/generate')
    } else {
      // 로그인이 필요한 사용자는 로그인 페이지로 이동
      navigate('/auth')
    }
  }

  const features = [
    {
      icon: Brain,
      title: "AI 맞춤 생성",
      description: "학급 정보와 교육과정에 맞는 맞춤형 자료를 AI가 자동으로 생성합니다."
    },
    {
      icon: FileCheck,
      title: "간편한 사용",
      description: "복잡한 설정 없이 몇 번의 클릭만으로 전문적인 교육 자료를 완성하세요."
    },
    {
      icon: Users,
      title: "교사 커뮤니티",
      description: "다른 선생님들과 자료를 공유하고 피드백을 주고받을 수 있습니다."
    },
    {
      icon: Sparkles,
      title: "다양한 포맷",
      description: "워크시트, PPT, 활동지 등 다양한 형태의 교육 자료를 지원합니다."
    }
  ]

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="mf-hero-gradient relative px-6 py-20 lg:py-32">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI 교육 자료 생성 플랫폼
                </Badge>
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  <span className="text-foreground">선생님의</span>{" "}
                  <span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                    수업 준비
                  </span>{" "}
                  <span className="text-foreground">이제 AI와 함께</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-md">
                  교육과정에 맞는 맞춤형 수업자료를 AI가 자동으로 생성해드립니다. 
                  더 나은 교육을 위해 더 많은 시간을 아껴보세요.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  className="mf-button-primary group"
                  onClick={handleGenerateClick}
                >
                  수업자료 생성 시작하기
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="mf-button-white"
                  onClick={handleGenerateClick}
                >
                  무료 체험하기
                </Button>
              </div>

              <div className="flex items-center gap-6 text-base text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  무료 체험 가능
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  교사 인증 시스템
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  안전한 교육 환경
                </div>
              </div>
            </div>

            <div className="relative animate-float">
              <img 
                src={heroImage} 
                alt="MangoFactory AI 교육 플랫폼" 
                className="w-full h-auto rounded-[var(--radius-lg)] mf-soft-shadow"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16 animate-slide-up">
            <Badge variant="outline" className="mb-4">
              주요 기능
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              MangoFactory만의 특별한 기능들
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              교사의 실제 니즈를 반영한 AI 기술로 더 나은 교육 환경을 만들어갑니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={feature.title} className="mf-card mf-hover-lift" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-[var(--radius)] flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}