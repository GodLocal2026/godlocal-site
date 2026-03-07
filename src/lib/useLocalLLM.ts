'use client'

// Local AI hook using WebLLM — runs LLM in-browser via WebGPU
// Model is cached after first download (~1GB), works offline
// Supported: Chrome 124+, Safari iOS 17+, Edge

import { useRef, useState, useCallback } from 'react'

export type LocalLLMStatus =
  | { phase: 'idle' }
  | { phase: 'loading'; progress: number; text: string }
  | { phase: 'ready' }
  | { phase: 'running' }
  | { phase: 'error'; message: string }

const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'

export function useLocalLLM() {
  const engineRef = useRef<unknown>(null)
  const [status, setStatus] = useState<LocalLLMStatus>({ phase: 'idle' })
  const abortRef = useRef(false)

  const isSupported = () => {
    if (typeof window === 'undefined') return false
    // Check WebGPU availability
    return !!(navigator as unknown as { gpu?: unknown }).gpu
  }

  const load = useCallback(async () => {
    if (engineRef.current) return true // already loaded
    if (!isSupported()) {
      setStatus({ phase: 'error', message: 'WebGPU not supported in this browser' })
      return false
    }
    try {
      setStatus({ phase: 'loading', progress: 0, text: 'Initializing...' })
      // Dynamic import to avoid SSR issues
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
      const engine = await CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report: { progress: number; text: string }) => {
          setStatus({ phase: 'loading', progress: Math.round(report.progress * 100), text: report.text })
        },
      })
      engineRef.current = engine
      setStatus({ phase: 'ready' })
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatus({ phase: 'error', message: msg })
      return false
    }
  }, [])

  const chat = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (err: string) => void,
  ) => {
    if (!engineRef.current) {
      onError('Model not loaded')
      return
    }
    abortRef.current = false
    setStatus({ phase: 'running' })

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine = engineRef.current as any
      const stream = await engine.chat.completions.create({
        messages,
        temperature: 0.4,
        max_tokens: 4096,
        stream: true,
      })

      for await (const chunk of stream) {
        if (abortRef.current) break
        const token = chunk.choices?.[0]?.delta?.content || ''
        if (token) onToken(token)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    } finally {
      setStatus({ phase: 'ready' })
      onDone()
    }
  }, [])

  const abort = useCallback(() => {
    abortRef.current = true
  }, [])

  const unload = useCallback(() => {
    engineRef.current = null
    setStatus({ phase: 'idle' })
  }, [])

  return { status, isSupported, load, chat, abort, unload }
}
