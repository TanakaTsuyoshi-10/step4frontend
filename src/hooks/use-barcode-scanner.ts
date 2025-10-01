'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

type OnDetect = (code: string) => void

export function useBarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const zxingRef = useRef<BrowserMultiFormatReader | null>(null)
  const lastCodeRef = useRef<string | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const log = (...args: any[]) => console.debug('[scanner]', ...args)

  const ensureVideoReady = async (video: HTMLVideoElement) => {
    video.muted = true
    ;(video as any).playsInline = true
    video.setAttribute('autoplay', '')
    // iOS 対策: iOS は loadedmetadata 後に play を呼ぶ
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) return resolve()
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded)
        resolve()
      }
      video.addEventListener('loadedmetadata', onLoaded, { once: true })
    })
  }

  const getStream = async (): Promise<MediaStream> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia is not supported on this browser')
    }

    // 権限状態の把握（使える環境のみ）
    try {
      const perm = await navigator.permissions?.query({ name: 'camera' as any })
      if (perm) log('permission:', perm.state)
    } catch {}

    // フォールバック順にトライ
    const trials: MediaStreamConstraints[] = [
      { video: { facingMode: { exact: 'environment' } }, audio: false },
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      { video: true, audio: false },
    ]

    let lastErr: any
    for (const c of trials) {
      try {
        log('getUserMedia with', c)
        const s = await navigator.mediaDevices.getUserMedia(c)
        return s
      } catch (e) {
        lastErr = e
        log('failed constraint ->', c, e)
      }
    }
    throw lastErr ?? new Error('failed to get camera stream')
  }

  const stop = useCallback(async () => {
    log('stop()')
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (zxingRef.current) {
      zxingRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      const v = videoRef.current
      v.pause()
      v.srcObject = null
      v.removeAttribute('srcObject' as any)
    }
    setIsScanning(false)
  }, [])

  const start = useCallback(
    async (onDetect: OnDetect) => {
      setError(null)
      setIsScanning(true)
      log('start()')
      try {
        const stream = await getStream()
        streamRef.current = stream

        const video = videoRef.current
        if (!video) throw new Error('video element not found')

        video.srcObject = stream
        await ensureVideoReady(video)

        // メタデータ準備後に再度 play を呼ぶ（iOS/Chrome 双方安定）
        await video.play()
        log('video.play() resolved, readyState=', video.readyState)

        // ネイティブ or ZXing で検出
        const canUseNative =
          'BarcodeDetector' in globalThis &&
          typeof (globalThis as any).BarcodeDetector === 'function'

        if (canUseNative) {
          const Detector = (globalThis as any).BarcodeDetector
          const detector = new Detector({ formats: ['ean_13', 'ean_8', 'code_128'] })
          const loop = async () => {
            try {
              if (!videoRef.current) return
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes?.length) {
                const raw = barcodes[0].rawValue
                if (raw && raw !== lastCodeRef.current) {
                  lastCodeRef.current = raw
                  log('detected(nat):', raw)
                  onDetect(raw)
                }
              }
            } catch (e) {
              // frame エラーは握りつぶす
            }
            rafRef.current = requestAnimationFrame(loop)
          }
          rafRef.current = requestAnimationFrame(loop)
        } else {
          const zxing = new BrowserMultiFormatReader()
          zxingRef.current = zxing
          const loop = async () => {
            try {
              if (!videoRef.current) return
              const result = await zxing.decodeOnceFromVideoElement(videoRef.current)
              const raw = result?.getText?.()
              if (raw && raw !== lastCodeRef.current) {
                lastCodeRef.current = raw
                log('detected(zxing):', raw)
                onDetect(raw)
              }
            } catch {
              // not found in this frame
            } finally {
              rafRef.current = requestAnimationFrame(loop)
            }
          }
          rafRef.current = requestAnimationFrame(loop)
        }
      } catch (e: any) {
        log('start() failed:', e)
        setError(e?.message ?? 'camera start failed')
        await stop()
        throw e
      }
    },
    [stop]
  )

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    videoRef,
    isScanning,
    error,
    setIsScanning,
    start,
    stop,
    clearLast: () => (lastCodeRef.current = null),
  }
}