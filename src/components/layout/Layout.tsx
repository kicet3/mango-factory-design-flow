import { MangoSidebar } from "@/components/MangoSidebar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { User, LogOut, ChevronDown, BookOpen } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { ProfileImage } from "@/components/ProfileImage"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"

interface LayoutProps {
  children: React.ReactNode
  hideSidebar?: boolean
}

export function Layout({ children, hideSidebar = false }: LayoutProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profilePhotoPath, setProfilePhotoPath] = useState<string>('')

  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (!user) return
      
      try {
        const { data: teacherInfo, error } = await supabase
          .from('teacher_info')
          .select('personal_photo_path')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) {
          console.error('프로필 사진 조회 실패:', error)
          return
        }

        if (teacherInfo?.personal_photo_path) {
          setProfilePhotoPath(teacherInfo.personal_photo_path)
        }
      } catch (error) {
        console.error('프로필 사진을 가져오는데 실패했습니다:', error)
      }
    }

    fetchProfilePhoto()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
  }

  const handleProfileClick = () => {
    navigate('/settings?tab=account')
  }

  const handleMaterialsClick = () => {
    navigate('/settings?tab=materials')
  }

  if (hideSidebar) {
    return (
      <div className="min-h-screen w-full">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full">
      <MangoSidebar />

      {/* Top Navigation - offset for sidebar */}
      <header className="fixed top-0 left-16 right-0 z-30 flex h-[5.33rem] items-center justify-between px-6 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          {/* Empty space where trigger was */}
        </div>

        {/* Right side - Notifications & User Menu */}
        <div className="flex items-center gap-3">
          {user && <NotificationDropdown />}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-10">
                  {profilePhotoPath ? (
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                      <ProfileImage
                        currentPhotoPath={profilePhotoPath}
                        altText="프로필 사진"
                      />
                    </div>
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {user?.user_metadata?.full_name || user?.email || '사용자'}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="h-4 w-4 mr-2" />
                  프로필
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMaterialsClick}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  수업자료 설정
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/auth')}>
                <User className="h-4 w-4" />
                로그인
              </Button>
              <Button className="mf-button-primary text-sm" onClick={() => navigate('/auth')}>
                회원가입
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content - offset for sidebar and header */}
      <main className="ml-16 pt-[5.33rem]">
        {children}
      </main>
    </div>
  )
}