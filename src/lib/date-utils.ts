/**
 * UTC 시간을 한국 시간(KST)으로 변환하고 포맷팅합니다
 */
export function formatToKST(utcDateString: string): string {
  if (!utcDateString) return ''

  const date = new Date(utcDateString)

  // 한국 시간으로 변환 (UTC+9)
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))

  const year = kstDate.getUTCFullYear()
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getUTCDate()).padStart(2, '0')
  const hours = String(kstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * UTC 시간을 한국 시간으로 변환하고 상대 시간으로 포맷팅합니다 (예: "3분 전", "2시간 전")
 */
export function formatToKSTRelative(utcDateString: string): string {
  if (!utcDateString) return ''

  const date = new Date(utcDateString)
  const now = new Date()

  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`

  // 7일 이상이면 절대 시간 표시
  return formatToKST(utcDateString)
}

/**
 * 날짜만 표시 (YYYY-MM-DD)
 */
export function formatToKSTDate(utcDateString: string): string {
  if (!utcDateString) return ''

  const date = new Date(utcDateString)
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))

  const year = kstDate.getUTCFullYear()
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
