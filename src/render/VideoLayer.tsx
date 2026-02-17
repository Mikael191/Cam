import { useEffect, useRef, type RefObject } from 'react'

type VideoLayerProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  mirror: boolean
  showMiniPreview: boolean
}

const VideoLayer = ({ videoRef, stream, mirror, showMiniPreview }: VideoLayerProps) => {
  const miniRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const mini = miniRef.current
    if (!mini) {
      return
    }
    mini.srcObject = stream
    if (stream) {
      void mini.play().catch(() => {
        // Mini preview pode falhar sem afetar o fluxo principal.
      })
    }
  }, [stream])

  return (
    <>
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${mirror ? '-scale-x-100' : ''}`}
        autoPlay
        muted
        playsInline
        aria-label="Preview da camera"
      />

      {!stream ? (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(27,53,88,0.5),rgba(6,9,16,0.9)_45%,rgba(3,5,9,0.98)_100%)]" />
      ) : null}

      {showMiniPreview ? (
        <div className="pointer-events-none absolute bottom-4 right-4 z-30 overflow-hidden rounded-xl border border-white/25 bg-black/50 shadow-premium backdrop-blur">
          <video
            ref={miniRef}
            className={`h-28 w-44 object-cover ${mirror ? '-scale-x-100' : ''}`}
            muted
            playsInline
          />
        </div>
      ) : null}
    </>
  )
}

export default VideoLayer
