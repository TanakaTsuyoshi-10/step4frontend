'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

type OnDetect = (code: string) => void

export function useBarcodeScanner(videoRef: React.RefObject<HTMLVideoElement>) {
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const zxingRef = useRef<BrowserMultiFormatReader | null>(null)
  const lastCodeRef = useRef<string | null>(null)
  const onDetectRef = useRef<OnDetect | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const log = (...args: any[]) => console.debug('[scanner]', ...args)

  // Video element readiness check with timeout
  const waitForVideo = async (timeout = 5000): Promise<HTMLVideoElement> => {
    const start = Date.now()
    while (true) {
      const video = videoRef.current
      if (video && video.isConnected) {
        log('[scan] video element ready:', video)
        return video
      }
      if (Date.now() - start > timeout) {
        throw new Error('Video element not ready within timeout. Ensure <video> is rendered in DOM.')
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }

  // HTTPS/security check
  const checkSecurity = () => {
    const isSecure = location.protocol === 'https:' ||
                    location.hostname === 'localhost' ||
                    location.hostname === '127.0.0.1'
    if (!isSecure) {
      throw new Error('この機能は HTTPS でのみ動作します。本番環境では HTTPS を使用してください。')
    }
  }

  // Setup video element with iOS/Safari-safe attributes
  const setupVideo = async (video: HTMLVideoElement) => {
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    video.setAttribute('muted', '')
    video.setAttribute('playsinline', '')
    video.setAttribute('autoplay', '')

    // Wait for video to be ready for stream
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) return resolve()
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded)
        resolve()
      }
      video.addEventListener('loadedmetadata', onLoaded, { once: true })
    })
  }

  // Get camera stream with proper constraints
  const getStream = async (): Promise<MediaStream> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia is not supported on this browser')
    }

    // Basic constraints optimized for barcode scanning
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        aspectRatio: { ideal: 16 / 9 },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    }

    // Fallback constraints
    const trials: MediaStreamConstraints[] = [
      constraints,
      { video: { facingMode: { exact: 'environment' } }, audio: false },
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      { video: true, audio: false },
    ]

    let lastErr: any
    for (const c of trials) {
      try {
        log('[scan] Trying getUserMedia with constraints:', c)
        const stream = await navigator.mediaDevices.getUserMedia(c)
        log('[scan] Successfully got stream')
        return stream
      } catch (e) {
        lastErr = e
        log('[scan] Failed constraint:', c, e)
      }
    }

    console.error('[scan] All getUserMedia attempts failed:', lastErr)
    throw lastErr ?? new Error('Failed to get camera stream')
  }

  // Stop all scanning activities and cleanup
  const stop = useCallback(async () => {
    log('[scan] Stopping scanner')

    // Stop animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    // Clear ZXing reader
    if (zxingRef.current) {
      zxingRef.current = null
    }

    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        log('[scan] Stopped track:', track.kind)
      })
      streamRef.current = null
    }

    // Clear video element
    const video = videoRef.current
    if (video) {
      video.pause()
      video.srcObject = null
      video.removeAttribute('src')
    }

    setIsScanning(false)
    setError(null)
    onDetectRef.current = null
  }, [videoRef])

  // Start scanning
  const start = useCallback(
    async (onDetect: OnDetect) => {
      setError(null)
      setIsScanning(true)
      onDetectRef.current = onDetect

      log('[scan] Starting scanner')

      try {
        // Security check
        checkSecurity()

        // Wait for video element to be ready
        const video = await waitForVideo()

        // Setup video attributes
        await setupVideo(video)

        // Get camera stream
        const stream = await getStream()
        streamRef.current = stream

        // Connect stream to video
        video.srcObject = stream
        await video.play()

        log('[scan] Video playing, readyState:', video.readyState)

        // Start barcode detection
        const canUseNative =
          'BarcodeDetector' in globalThis &&
          typeof (globalThis as any).BarcodeDetector === 'function'

        if (canUseNative) {
          log('[scan] Using native BarcodeDetector')
          const Detector = (globalThis as any).BarcodeDetector
          const detector = new Detector({ formats: ['ean_13', 'ean_8', 'code_128'] })

          const detectLoop = async () => {
            try {
              if (!videoRef.current || !onDetectRef.current) return

              const barcodes = await detector.detect(videoRef.current)
              if (barcodes?.length) {
                const code = barcodes[0].rawValue
                if (code && code !== lastCodeRef.current) {
                  lastCodeRef.current = code
                  log('[scan] Detected (native):', code)
                  onDetectRef.current(code)
                  return // Stop after detection
                }
              }
            } catch (e) {
              // Frame detection errors are normal, ignore
            }

            rafRef.current = requestAnimationFrame(detectLoop)
          }

          rafRef.current = requestAnimationFrame(detectLoop)
        } else {
          log('[scan] Using ZXing library')
          const zxing = new BrowserMultiFormatReader()
          zxingRef.current = zxing

          const detectLoop = async () => {
            try {
              if (!videoRef.current || !onDetectRef.current) return

              const result = await zxing.decodeOnceFromVideoElement(videoRef.current)
              const code = result?.getText?.()
              if (code && code !== lastCodeRef.current) {
                lastCodeRef.current = code
                log('[scan] Detected (ZXing):', code)
                onDetectRef.current(code)
                return // Stop after detection
              }
            } catch {
              // Not found in this frame, continue
            }

            rafRef.current = requestAnimationFrame(detectLoop)
          }

          rafRef.current = requestAnimationFrame(detectLoop)
        }

      } catch (e: any) {
        console.error('[scan] Start failed:', e)
        setError(e?.message ?? 'Camera start failed')
        setIsScanning(false)
        await stop()
        throw e
      }
    },
    [videoRef, stop]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    isScanning,
    error,
    start,
    stop,
    clearLast: () => (lastCodeRef.current = null),
  }
}