'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

type OnDetect = (code: string) => void
type C = MediaStreamConstraints

// Fallback constraint list - progressively more relaxed
const TRY_LIST: C[] = [
  { video: { facingMode: { ideal: 'environment' } }, audio: false },
  { video: { facingMode: 'environment' }, audio: false },
  { video: true, audio: false }, // Complete fallback
]

export function useBarcodeScanner(videoRef: React.RefObject<HTMLVideoElement>) {
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const zxingRef = useRef<BrowserMultiFormatReader | null>(null)
  const lastCodeRef = useRef<string | null>(null)
  const onDetectRef = useRef<OnDetect | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const log = (...args: any[]) => console.debug('[scanner]', ...args)

  // Wait for video element to be ready in DOM
  async function waitForVideo(timeout = 5000): Promise<HTMLVideoElement> {
    const t0 = Date.now()
    while (Date.now() - t0 < timeout) {
      const video = videoRef.current
      if (video && (video as any).isConnected) {
        log('[scan] video element ready:', video)
        return video
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    throw new Error('Video element not ready within timeout')
  }

  // Play video and wait for actual frames to arrive
  async function playAndWait(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
    video.muted = true
    video.autoplay = true
    video.playsInline = true
    video.setAttribute('muted', '')
    video.setAttribute('autoplay', '')
    video.setAttribute('playsinline', '')
    video.srcObject = stream

    // Start playback
    await video.play().catch(e => {
      console.warn('video.play() rejected', e)
    })

    // Wait for frames to actually arrive
    await new Promise<void>((resolve, reject) => {
      let done = false
      const timeout = setTimeout(() => {
        if (done) return
        if (video.videoWidth > 0 && !video.paused) {
          done = true
          resolve()
        } else {
          reject(new Error('No frames within timeout'))
        }
      }, 2000)

      const onMeta = () => {
        if (done) return
        if (video.videoWidth > 0) {
          done = true
          clearTimeout(timeout)
          resolve()
        }
      }

      const onPlaying = () => {
        if (done) return
        if (video.videoWidth > 0) {
          done = true
          clearTimeout(timeout)
          resolve()
        }
      }

      video.addEventListener('loadedmetadata', onMeta, { once: true })
      video.addEventListener('playing', onPlaying, { once: true })

      // Additional check with requestVideoFrameCallback if available
      if ((video as any).requestVideoFrameCallback) {
        (video as any).requestVideoFrameCallback(() => {
          if (done) return
          if (video.videoWidth > 0) {
            done = true
            clearTimeout(timeout)
            resolve()
          }
        })
      }
    })

    log('[scan] Video frames confirmed, videoWidth:', video.videoWidth)
  }

  // Complete cleanup of streams and video
  const stop = useCallback(() => {
    log('[scan] Stopping scanner')

    try {
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
        streamRef.current.getTracks().forEach(track => {
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
      }
    } finally {
      setIsScanning(false)
      setError(null)
      onDetectRef.current = null
    }
  }, [videoRef])

  // Start camera with robust fallback
  const start = useCallback(
    async (onDetect: OnDetect) => {
      // HTTPS / localhost security check
      const httpsOK = location.protocol === 'https:' ||
                     location.hostname === 'localhost' ||
                     location.hostname === '127.0.0.1'
      if (!httpsOK) {
        throw new Error('Barcode scanning requires HTTPS or localhost.')
      }

      setError(null)
      setIsScanning(true)
      onDetectRef.current = onDetect

      log('[scan] Starting scanner')

      try {
        // Wait for video element to be ready
        const video = await waitForVideo(5000)

        // Complete cleanup of any existing stream
        stop()

        // Reset state after cleanup
        setIsScanning(true)
        onDetectRef.current = onDetect

        // Try constraints with fallback
        let lastErr: any
        for (const constraints of TRY_LIST) {
          try {
            log('[scan] Trying getUserMedia with constraints:', constraints)
            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            streamRef.current = stream

            await playAndWait(video, stream)

            // Debug: Log actual camera settings
            const videoTrack = stream.getVideoTracks()[0]
            const settings = videoTrack.getSettings?.()
            log('[scan] Camera settings:', settings)

            // Handle user camera (front-facing) with mirror effect
            const facing = settings?.facingMode
            video.style.transform = facing === 'user' ? 'scaleX(-1)' : 'none'

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

            return // Success - exit constraint loop
          } catch (e) {
            console.warn('[scan] getUserMedia/playback failed:', constraints, e)
            stop()
            lastErr = e
          }
        }

        throw lastErr ?? new Error('Failed to start camera')

      } catch (e: any) {
        console.error('[scan] Start failed:', e)
        setError(e?.message ?? 'Camera start failed')
        setIsScanning(false)
        stop()
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