import { useEffect, useState, createContext, useContext } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('Auth: Setting up auth state listener...')
    let mounted = true
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        console.log('Auth: Auth state changed:', event, !!session)
        
        // 자동 로그인 설정 확인
        const autoLogin = localStorage.getItem('mango_auto_login') === 'true'
        
        if (session && !autoLogin && event === 'INITIAL_SESSION') {
          // 자동 로그인이 비활성화되어 있고 초기 세션인 경우 세션 클리어
          console.log('Auth: Auto login disabled, clearing session')
          setTimeout(() => {
            supabase.auth.signOut({ scope: 'local' })
          }, 0)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      console.log('Auth: Initial session check:', !!session)
      
      // 자동 로그인 설정 확인
      const autoLogin = localStorage.getItem('mango_auto_login') === 'true'
      
      if (session && !autoLogin) {
        // 자동 로그인이 비활성화되어 있는 경우 세션 클리어
        console.log('Auth: Auto login disabled, clearing existing session')
        supabase.auth.signOut({ scope: 'local' })
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch((error) => {
      if (!mounted) return
      console.error('Auth: Error getting session:', error)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    console.log('Starting signOut process...')
    
    // Clear local state immediately
    setSession(null)
    setUser(null)
    setLoading(false)
    
    // Clear localStorage manually as backup
    localStorage.removeItem('sb-adetmyygcdayioqvmphg-auth-token')
    localStorage.removeItem('mango_auto_login')
    
    // Attempt Supabase signout but don't fail if it errors
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        console.log('Supabase signOut error (non-critical):', error)
      } else {
        console.log('Supabase signOut successful')
      }
    } catch (error) {
      console.log('Supabase signOut exception (non-critical):', error)
    }
    
    console.log('SignOut process completed')
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}