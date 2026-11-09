import React, { useState } from 'react'
import { ATMOSPHERE_CONFIG } from '../constants/atmosphere'

export default function AtmosphereBackground() {
  const {
    videoSrc,
    videoDarkTint = 0.65,
    videoBlur = '4px',
    duskGlowEnabled = true,
    duskGlowIntensity = 0.85,
    filmGrainEnabled = true,
    filmGrainOpacity = 0.12,
  } = ATMOSPHERE_CONFIG

  // Defensive media loading state: if a bad video/image URL or path is passed,
  // onError traps it and falls back to pure Dusk Glow without breaking the UI.
  const [mediaError, setMediaError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const isMediaActive = Boolean(videoSrc && !mediaError)

  // Auto-detect whether the path points to a still image (.jpg, .jpeg, .png, .webp, .avif, .gif, .svg)
  const isImage = Boolean(
    videoSrc && /\.(jpg|jpeg|png|webp|avif|gif|svg)(\?.*)?$/i.test(videoSrc)
  )

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 w-full h-screen h-[100lvh] pointer-events-none overflow-hidden -z-10 bg-[#08090C]"
    >
      {/* ------------------------------------------------------------- */}
      {/* LAYER 1: Optional Cinematic Media (Video or Still Image)      */}
      {/* ------------------------------------------------------------- */}
      {isMediaActive && (
        isImage ? (
          <img
            alt=""
            onLoad={() => setIsLoaded(true)}
            onError={() => setMediaError(true)}
            style={{ filter: `blur(${videoBlur})` }}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            src={videoSrc}
          />
        ) : (
          <video
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setIsLoaded(true)}
            onError={() => setMediaError(true)}
            style={{ filter: `blur(${videoBlur})` }}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            src={videoSrc}
          />
        )
      )}

      {/* ------------------------------------------------------------- */}
      {/* LAYER 2: Dark Vignette Tint (Active if media is displayed)    */}
      {/* ------------------------------------------------------------- */}
      {isMediaActive && (
        <div
          className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: `radial-gradient(circle at 50% 30%, rgba(8,9,12,${
              videoDarkTint * 0.85
            }) 0%, rgba(8,9,12,${videoDarkTint}) 70%, #08090C 100%)`,
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* LAYER 3: Ambient Dusk Glow Mesh (Always active)             */}
      {/* ------------------------------------------------------------- */}
      {duskGlowEnabled && (
        <div
          className="absolute inset-0 mix-blend-screen transition-opacity duration-500 overflow-hidden pointer-events-none"
          style={{ opacity: duskGlowIntensity, transform: 'translate3d(0,0,0)' }}
        >
          {/* Top-Left Crimson Velvet Flare*/}
          <div
            className="absolute -top-32 -left-20 w-[550px] h-[550px] rounded-full blur-[30px] animate-dusk"
            style={{
              background:
                'radial-gradient(circle, rgba(244, 63, 94, 0.40) 0%, rgba(225, 29, 72, 0.18) 35%, rgba(225, 29, 72, 0.05) 60%, transparent 80%)',
              transform: 'translate3d(0,0,0)',
            }}
          />

          {/* Right Dusk Amber Flare */}
          <div
            className="absolute top-1/4 -right-24 w-[500px] h-[500px] rounded-full blur-[30px] animate-dusk"
            style={{
              background:
                'radial-gradient(circle, rgba(245, 158, 11, 0.30) 0%, rgba(217, 119, 6, 0.12) 35%, rgba(217, 119, 6, 0.03) 60%, transparent 80%)',
              animationDelay: '-3.5s',
              transform: 'translate3d(0,0,0)',
            }}
          />

          {/* Bottom Rose Velvet Pool */}
          <div
            className="absolute -bottom-36 left-1/3 w-[600px] h-[450px] rounded-full blur-[30px] animate-dusk"
            style={{
              background:
                'radial-gradient(circle, rgba(244, 63, 94, 0.22) 0%, rgba(244, 63, 94, 0.08) 35%, transparent 75%)',
              animationDelay: '-1.8s',
              transform: 'translate3d(0,0,0)',
            }}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LAYER 4: Film Grain Texture (Only mounts when opacity > 0)    */}
      {/* ------------------------------------------------------------- */}
      {filmGrainEnabled && filmGrainOpacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: filmGrainOpacity,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}
    </div>
  )
}

