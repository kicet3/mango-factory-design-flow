import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toZonedTime } from "date-fns-tz"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * UTC 시간을 한국 시간(KST)으로 변환하여 포맷팅합니다.
 * @param dateString - ISO 8601 형식의 UTC 날짜 문자열
 * @param formatString - date-fns format 문자열 (기본값: 'yyyy. MM. dd')
 * @returns 한국 시간으로 포맷팅된 문자열
 */
export function formatKoreanTime(dateString: string, formatString: string = 'yyyy. MM. dd'): string {
  const date = new Date(dateString)
  const kstDate = toZonedTime(date, 'Asia/Seoul')
  return format(kstDate, formatString)
}

/**
 * UTC 시간을 한국 시간(KST)으로 변환하여 시간까지 포함하여 포맷팅합니다.
 * @param dateString - ISO 8601 형식의 UTC 날짜 문자열
 * @returns 한국 시간으로 포맷팅된 문자열 (예: '2024. 01. 15 14:30')
 */
export function formatKoreanDateTime(dateString: string): string {
  return formatKoreanTime(dateString, 'yyyy. MM. dd HH:mm')
}
