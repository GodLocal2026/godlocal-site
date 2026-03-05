'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  talking: boolean
}

// Free Cubism-4 model hosted on CDN
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json'
const CUBISM4   = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js'

function loadScript(src: string) {
  return new Promise<void>((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res()
    const s = document.createElement('script')
    s.src = src
    s.onload  = () => res()
    s.onerror = () => rej(new Error(`Failed: ${src}`))
    document.head.appendChild(s)
  })
}

export default function OasisAvatar({ talking }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef       = useRef<any>(null)
  const modelRef     = useRef<any>(null)
  const [visible, setVisible] = useState(true)
  const [ready,   setReady]   = useState(false)
  const [error,   setError]   = useState(false)
  const talkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const init = useCallback(async () => {
    try {
      // 1. Load Cubism 4 Core SDK
      await loadScript(CUBISM4)

      // 2. Import PIXI + pixi-live2d-display dynamically (avoids SSR)
      const PIXI = await import('pixi.js') as any
      const { Live2DModel } = await import('pixi-live2d-display') as any

      Live2DModel.registerTicker(PIXI.Ticker)

      if (!containerRef.current) return

      const W = 180, H = 260

      const app = new PIXI.Application({
        backgroundAlpha: 0,
        width: W,
        height: H,
        antialias: true,
        autoDensity: true,
        resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      })

      appRef.current = app
      containerRef.current.appendChild(app.view as HTMLCanvasElement)

      // 3. Load model
      const model = await Live2DModel.from(MODEL_URL, { autoInteract: false })
      modelRef.current = model
      app.stage.addChild(model)

      // Scale to fit
      const scale = Math.min(W / model.internalModel.width, H / model.internalModel.height) * 0.9
      model.scale.set(scale)
      model.x = (W - model.width) / 2
      model.y = H - model.height + 10

      setReady(true)
    } catch (e) {
      console.warn('Live2D avatar failed to load:', e)
      setError(true)
    }
  }, [])

  useEffect(() => {
    init()
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true, baseTexture: true })
        appRef.current = null
      }
    }
  }, [init])

  // Trigger talk/idle motion based on AI streaming state
  useEffect(() => {
    if (!modelRef.current || !ready) return
    if (talkTimer.current) clearTimeout(talkTimer.current)

    if (talking) {
      try {
        modelRef.current.motion('Tap', 0, 2) // priority 2 = force
      } catch {
        try { modelRef.current.expression('smile') } catch {}
      }
    } else {
      // Return to idle after short delay
      talkTimer.current = setTimeout(() => {
        try { modelRef.current?.motion('Idle', 0, 1) } catch {}
      }, 500)
    }
  }, [talking, ready])

  if (error) return null

  return (
    <div
      className={`
        fixed bottom-20 right-3 z-30
        hidden md:block
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95 pointer-events-none'}
      `}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-2xl bg-[#00FF9D]/8 blur-2xl pointer-events-none" />

      {/* Canvas container */}
      <div className="relative">
        <div
          ref={containerRef}
          className="w-[180px] h-[260px] rounded-2xl overflow-hidden"
          style={{ background: 'transparent' }}
        />

        {/* Name tag */}
        {ready && (
          <div className="absolute bottom-1 left-0 right-0 flex justify-center">
            <span className="text-[9px] font-mono text-[#00FF9D]/50 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
              OASIS
              {talking && (
                <span className="ml-1 inline-flex gap-0.5 align-middle">
                  {[0, 0.1, 0.2].map((d, i) => (
                    <span key={i} className="w-0.5 h-1.5 rounded-full bg-[#00FF9D]/70 animate-bounce inline-block"
                      style={{ animationDelay: `${d}s` }} />
                  ))}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Loading spinner */}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-[#00FF9D]/30 border-t-[#00FF9D] animate-spin" />
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setVisible(v => !v)}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/70 border border-white/15 text-white/50 hover:text-white text-xs flex items-center justify-center transition-all hover:border-[#00FF9D]/40"
        title={visible ? 'Скрыть аватар' : 'Показать аватар'}
      >
        {visible ? '×' : '⚡'}
      </button>
    </div>
  )
}
