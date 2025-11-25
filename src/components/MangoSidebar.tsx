import { useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { Home, Clock, Headphones, Sparkles, Store, Sprout, ShoppingBasket, FolderOpen, BookOpen, Wand2 } from "lucide-react"
import mangoLogo from "@/assets/mango-logo.png"

// 홈 (섹션 없음)
const homeItem = { title: "홈", url: "/", icon: Home }

// 공유 공간
const sharedSpaceItems = [
  { title: "망고 마켓", url: "/gallery", icon: Store, subtitle: "수업자료" },
  { title: "망고 정원", url: "/garden", icon: Sprout, subtitle: "수업자료 시리즈" },
  { title: "망고 바구니", url: "/basket", icon: ShoppingBasket, subtitle: "활동 템플릿" },
]

// 창작공간
const creativeSpaceItems: { title: string; url: string; icon: typeof Home }[] = []

// 보관 공간
const storageSpaceItems = [
  { title: "수업 자료 관리", url: "/generate-v2/materials", icon: FolderOpen, subtitle: "" },
  { title: "수확 기록", url: "/history", icon: Clock, subtitle: "생성이력" },
]

// 생성 공간
const generationSpaceItems = [
  { title: "망고 팩토리 v1", url: "/generate", icon: Wand2, subtitle: "자료생성" },
  { title: "망고 팩토리 v2", url: "/generate-v2/generate", icon: Wand2, subtitle: "자료생성" },
  { title: "교안 생성 v2", url: "/generate-v2/upload", icon: Sparkles, subtitle: "" },
]

// 고객 지원
const supportItems = [
  { title: "이용 가이드", url: "/guide", icon: BookOpen },
  { title: "고객 지원", url: "/support", icon: Headphones },
]

export function MangoSidebar() {
  const [isHovered, setIsHovered] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname

  const isActive = (path: string) => currentPath === path
  const getNavClass = (active: boolean) =>
    active ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent/50"

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-background border-r border-border/40 transition-all duration-300 ease-in-out ${
        isHovered ? 'w-64' : 'w-16'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="h-[5.33rem] px-3 border-b border-border/40 flex items-center">
        <div
          className="flex items-center gap-3 w-full cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <img src={mangoLogo} alt="MangoFactory Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className={`font-gilroy font-bold text-xl text-foreground whitespace-nowrap transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            MangoFactory
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-2 py-4 overflow-y-auto h-[calc(100%-5.33rem)]">
        {/* 홈 (섹션 없음) */}
        <div className="mb-4">
          <nav>
            <NavLink
              to={homeItem.url}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${getNavClass(isActive(homeItem.url))}`}
              title={homeItem.title}
            >
              <homeItem.icon className="h-5 w-5 flex-shrink-0" />
              <span className={`whitespace-nowrap transition-opacity duration-300 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}>
                {homeItem.title}
              </span>
            </NavLink>
          </nav>
        </div>

        {/* 공유 공간 */}
        <div className="mb-4">
          <p className={`px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            공유 공간
          </p>
          <nav className="space-y-1">
            {sharedSpaceItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${getNavClass(isActive(item.url))}`}
                title={item.title}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className={`whitespace-nowrap transition-opacity duration-300 flex items-center gap-2 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  {item.title}
                  {item.subtitle && (
                    <span className="text-xs text-purple-400">{item.subtitle}</span>
                  )}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* 창작공간 */}
        {creativeSpaceItems.length > 0 && (
          <div className="mb-4">
            <p className={`px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              창작공간
            </p>
            <nav className="space-y-1">
              {creativeSpaceItems.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${getNavClass(isActive(item.url))}`}
                  title={item.title}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className={`whitespace-nowrap transition-opacity duration-300 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}>
                    {item.title}
                  </span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* 보관 공간 */}
        <div className="mb-4">
          <p className={`px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            보관 공간
          </p>
          <nav className="space-y-1">
            {storageSpaceItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${getNavClass(isActive(item.url))}`}
                title={item.title}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className={`whitespace-nowrap transition-opacity duration-300 flex items-center gap-2 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  {item.title}
                  {item.subtitle && (
                    <span className="text-xs text-purple-400">{item.subtitle}</span>
                  )}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* 생성 공간 */}
        <div className="mb-4">
          <p className={`px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            생성 공간
          </p>
          <nav className="space-y-1">
            {generationSpaceItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${getNavClass(isActive(item.url))}`}
                title={item.title}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className={`whitespace-nowrap transition-opacity duration-300 flex items-center gap-2 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  {item.title}
                  {item.subtitle && (
                    <span className="text-xs text-yellow-500">{item.subtitle}</span>
                  )}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* 고객 지원 */}
        <div>
          <p className={`px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            고객 지원
          </p>
          <nav className="space-y-1">
            {supportItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${getNavClass(isActive(item.url))}`}
                title={item.title}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className={`whitespace-nowrap transition-opacity duration-300 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  {item.title}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  )
}