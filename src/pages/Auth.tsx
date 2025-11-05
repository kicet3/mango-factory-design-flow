import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { LogIn, UserPlus } from 'lucide-react'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'reset-password' | 'recovery'>('signin')
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('')
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('')
  const [signupEmailSent, setSignupEmailSent] = useState(false)
  const [lastSignupEmail, setLastSignupEmail] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    console.log('Auth page: Current user state:', !!user)
    if (user) {
      console.log('Auth page: User found, redirecting to home')
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  // 이메일 링크(인증/비밀번호 재설정) 처리 및 OTP 만료 감지
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const type = params.get('type')
    const errorCode = params.get('error') || params.get('error_code')
    const errorDescription = params.get('error_description') || ''

    if (errorCode) {
      const msg = `${errorCode} ${errorDescription}`.toLowerCase()
      if (msg.includes('expired') || msg.includes('invalid') || errorCode === 'otp_expired') {
        toast.error('이메일 링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요.')
      } else {
        toast.error(`인증 오류: ${errorDescription || errorCode}`)
      }
      // URL 정리 및 탭 안내
      window.history.replaceState(null, '', '/auth')
      setActiveTab('reset-password')
      return
    }

    if (type === 'recovery') {
      setActiveTab('recovery')
    }
  }, [])
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 자동 로그인 설정을 localStorage에 저장
      localStorage.setItem('mango_auto_login', rememberMe ? 'true' : 'false')
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(`로그인 실패: ${error.message}`)
      } else {
        toast.success('로그인되었습니다!')
        navigate('/')
      }
    } catch (error) {
      toast.error('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 비밀번호 확인 검증
    if (password !== confirmPassword) {
      toast.error('비밀번호와 비밀번호 확인이 일치하지 않습니다.')
      return
    }
    
    setLoading(true)

    try {
      const redirectUrl = `${window.location.origin}/`
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      })

      if (error) {
        const msg = error.message?.toLowerCase() ?? ''
        if (msg.includes('already') && (msg.includes('registered') || msg.includes('exists'))) {
          toast.error('이미 가입된 이메일입니다. 로그인을 시도해보세요.')
        } else if (msg.includes('invalid email')) {
          toast.error('올바른 이메일 형식을 입력해주세요.')
        } else if (msg.includes('password')) {
          toast.error('비밀번호는 최소 6자 이상이어야 합니다.')
        } else if (msg.includes('redirect') || msg.includes('url')) {
          toast.error('이메일 인증 설정에 문제가 있습니다. 관리자에게 문의해주세요.')
        } else {
          toast.error(`회원가입 실패: ${error.message}`)
        }
      } else {
        const identitiesLen = data?.user?.identities?.length ?? 0
        if (identitiesLen === 0) {
          // 이미 존재하는 이메일인 경우 (Supabase가 200을 반환해도 identities가 비어 있음)
          toast.error('이미 가입된 이메일입니다. 로그인을 시도해보세요.')
          // 폼은 유지 (초기화하지 않음)
        } else {
          toast.success('회원가입 성공! 이메일을 확인해주세요!')
          setSignupEmailSent(true)
          setLastSignupEmail(email)
          // 회원가입 성공 시에만 폼 초기화
          setEmail('')
          setPassword('')
          setConfirmPassword('')
          setFullName('')
        }
      }
    } catch (error) {
      toast.error('회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      })

      if (error) {
        toast.error(`비밀번호 재설정 실패: ${error.message}`)
      } else {
        toast.success('이메일을 확인하여 비밀번호를 재설정해주세요.')
        setResetEmail('')
      }
    } catch (error) {
      toast.error('비밀번호 재설정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recoveryNewPassword || recoveryNewPassword.length < 6) {
      toast.error('새 비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }
    if (recoveryNewPassword !== recoveryConfirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: recoveryNewPassword })
      if (error) {
        toast.error(`비밀번호 재설정 실패: ${error.message}`)
      } else {
        toast.success('비밀번호가 재설정되었습니다. 자동으로 로그인됩니다.')
        // 쿼리스트링 정리
        window.history.replaceState(null, '', '/auth')
        navigate('/')
      }
    } catch (err) {
      toast.error('비밀번호 재설정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendSignupEmail = async () => {
    if (!lastSignupEmail) {
      toast.error('재전송할 이메일 주소가 없습니다.')
      return
    }
    
    setLoading(true)
    try {
      const redirectUrl = `${window.location.origin}/`
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: lastSignupEmail,
        options: {
          emailRedirectTo: redirectUrl
        }
      })

      if (error) {
        toast.error(`이메일 재전송 실패: ${error.message}`)
      } else {
        toast.success('인증 이메일을 다시 전송했습니다!')
      }
    } catch (error) {
      toast.error('이메일 재전송 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-secondary to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mf-card">
        <CardHeader className="text-center">
          <div 
            className="w-12 h-12 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center mx-auto mb-4 cursor-pointer hover:scale-105 transition-transform" 
            onClick={() => navigate('/')}
          >
            <span className="text-white font-bold text-lg">🥭</span>
          </div>
          <CardTitle 
            className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors" 
            onClick={() => navigate('/')}
          >
            MangoFactory
          </CardTitle>
          <CardDescription>AI 교육 자료 생성 플랫폼</CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
              <TabsTrigger value="reset-password">비밀번호 찾기</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">이메일</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mf-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">비밀번호</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mf-input"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label htmlFor="remember-me" className="text-sm">
                    자동 로그인
                  </Label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full mf-button-primary"
                  disabled={loading}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {loading ? '로그인 중...' : '로그인'}
                </Button>
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/support')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    이메일을 잊으셨나요? 문의하기 &rarr;
                  </button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">이름</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="홍길동"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="mf-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">이메일</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mf-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">비밀번호</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mf-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">비밀번호 확인</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="비밀번호를 다시 입력하세요"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mf-input"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-sm text-destructive">비밀번호가 일치하지 않습니다</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full mf-button-primary"
                  disabled={loading}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {loading ? '가입 중...' : '회원가입'}
                </Button>
                {signupEmailSent && (
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground text-center mb-3">
                      이메일이 오지 않았나요? 스팸함도 확인해보세요.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResendSignupEmail}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? '재전송 중...' : '인증 이메일 다시 보내기'}
                    </Button>
                  </div>
                )}
              </form>
            </TabsContent>

            <TabsContent value="reset-password">
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">이메일</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="등록된 이메일을 입력하세요"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="mf-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full mf-button-primary"
                  disabled={loading}
                >
                  {loading ? '전송 중...' : '비밀번호 재설정 메일 전송'}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  입력한 이메일로 비밀번호 재설정 링크를 보내드립니다.
                </p>
              </form>
            </TabsContent>

            {/* 이메일 링크를 통해 진입한 비밀번호 재설정 완료 단계 */}
            <TabsContent value="recovery">
              <form onSubmit={handleCompleteRecovery} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-new-password">새 비밀번호</Label>
                  <Input
                    id="recovery-new-password"
                    type="password"
                    value={recoveryNewPassword}
                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                    required
                    className="mf-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recovery-confirm-password">새 비밀번호 확인</Label>
                  <Input
                    id="recovery-confirm-password"
                    type="password"
                    value={recoveryConfirmPassword}
                    onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                    required
                    className="mf-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full mf-button-primary"
                  disabled={loading}
                >
                  {loading ? '변경 중...' : '비밀번호 변경 완료'}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  링크가 만료되었다면 아래에서 다시 요청하세요.
                </p>
                <div className="text-center">
                  <button type="button" className="text-sm underline" onClick={() => setActiveTab('reset-password')}>
                    비밀번호 재설정 메일 다시 받기
                  </button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}