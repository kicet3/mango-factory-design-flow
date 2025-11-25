import { useState, useEffect, useRef } from "react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

export interface Notification {
  id: string
  title: string
  message: string
  type: 'success' | 'error' | 'info'
  materialId?: number
  timestamp: Date
  read: boolean
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const setupSSE = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://127.0.0.1:8000'
      const url = `${API_BASE_URL}/notifications/stream?token=${session.access_token}`

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Create new SSE connection
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('SSE notification received:', data)

          const notification: Notification = {
            id: `${Date.now()}-${Math.random()}`,
            title: data.title || '교안 생성 완료',
            message: data.message || '교안이 생성되었습니다',
            type: data.type || 'success',
            materialId: data.material_id,
            timestamp: new Date(),
            read: false
          }

          setNotifications((prev) => [notification, ...prev])
          setUnreadCount((prev) => prev + 1)

          // Show toast notification
          toast.success(notification.title, {
            description: notification.message,
            duration: 5000,
          })
        } catch (error) {
          console.error('Failed to parse SSE notification:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE error:', error)
        eventSource.close()
      }

      console.log('SSE connection established')
    }

    setupSSE()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        console.log('SSE connection closed')
      }
    }
  }, [])

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    )
    setUnreadCount(0)
  }

  const clearNotification = (id: string) => {
    const notification = notifications.find((n) => n.id === id)
    if (notification && !notification.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  }
}
