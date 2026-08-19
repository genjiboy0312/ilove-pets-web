import { useState } from "react"
import type { ReactEventHandler } from "react"

export interface ThumbImageProps {
  readonly alt: string
  readonly className?: string
  readonly height?: number
  readonly src: string
  readonly width?: number
}

export function ThumbImage({ alt, className, height, src, width }: ThumbImageProps) {
  const [loadState, setLoadState] = useState<"loaded" | "failed">("loaded")

  const handleError: ReactEventHandler<HTMLImageElement> = () => {
    setLoadState("failed")
  }

  return (
    <span
      className={["thumb-frame", className].filter(Boolean).join(" ")}
      data-image-state={loadState}
    >
      <img
        alt={alt}
        className="thumb-frame__image"
        height={height}
        onError={handleError}
        src={src}
        width={width}
      />
    </span>
  )
}
