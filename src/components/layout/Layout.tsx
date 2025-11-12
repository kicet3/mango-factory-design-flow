import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { MangoSidebar } from "@/components/MangoSidebar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { User, LogOut, ChevronDown, BookOpen } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { ProfileImage } from "@/components/ProfileImage"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <MangoSidebar />
        
        <SidebarInset>
          {/* Top Navigation */}
          <header className="fixed top-0 left-0 right-0 z-[1] flex h-[5.33rem] items-center justify-between px-6 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>

            {/* Right side - User Menu or Login */}
            <div className="flex items-center gap-3">
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

          {/* Main Content */}
          <main className="flex-1 pt-[5.33rem]">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}