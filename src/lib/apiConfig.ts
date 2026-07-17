const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:7860'

export const API_HTTP_BASE = base
export const API_WS_BASE   = base.replace(/^http/, 'ws')
