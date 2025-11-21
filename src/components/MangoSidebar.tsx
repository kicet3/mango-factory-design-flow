import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { Home, Clock, HelpCircle, User, Settings, Sparkles, LayoutGrid } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import mangoLogo from "@/assets/mango-logo.png"

const menuItems = [
  { title: "홈", url: "/", icon: Home },
  { title: "자료 생성", url: "/generate", icon: Sparkles },
  { title: "교안 생성 v2", url: "/generate-v2/upload", icon: Sparkles },
  { title: "자료 생성 v2", url: "/generate-v2/generate", icon: Sparkles },
  { title : "수업 자료 관리", url:"/generate-v2/materials", icon : Settings},
  { title: "갤러리존", url: "/gallery", icon: LayoutGrid },
  { title: "생성 이력", url: "/history", icon: Clock },
  { title: "기본 설정", url: "/settings", icon: Settings },
]

const supportItems = [
  { title: "고객 지원", url: "/support", icon: HelpCircle },
]

export function MangoSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname

  const isActive = (path: string) => currentPath === path
  const getNavClass = (active: boolean) =>
    active ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" : "hover:bg-accent/50"

  return (
    <Sidebar className="border-r border-border/40">
      <SidebarHeader className="h-[5.33rem] px-6 border-b border-border/40 flex items-center justify-center">
        <div
          className="flex items-center gap-3 w-full cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/')}
        >
          <div className="w-[3.33rem] h-[3.33rem] flex items-center justify-center flex-shrink-0">
            <img src={mangoLogo} alt="MangoFactory Logo" className="w-full h-full object-contain" />
          </div>
          {state === "expanded" && (
            <div className="flex items-center">
              <h1 className="font-gilroy font-bold text-xl text-foreground">MangoFactory</h1>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel>메인 메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className={getNavClass(isActive(item.url))}>
                    <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all">
                      <item.icon className="h-4 w-4" />
                      {state === "expanded" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-8">
          <SidebarGroupLabel>지원</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className={getNavClass(isActive(item.url))}>
                    <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all">
                      <item.icon className="h-4 w-4" />
                      {state === "expanded" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}