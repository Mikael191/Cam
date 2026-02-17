export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogEntry = {
  id: number
  timestampMs: number
  level: LogLevel
  message: string
  context?: string
}

const LOG_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export const MAX_LOG_ENTRIES = 140

export const shouldCaptureLog = (entryLevel: LogLevel, activeLevel: LogLevel): boolean =>
  LOG_ORDER[entryLevel] >= LOG_ORDER[activeLevel]

export const formatLogTime = (timestampMs: number): string => {
  const date = new Date(timestampMs)
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  const seconds = `${date.getSeconds()}`.padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}
