/**
 * Customize the background visual atmosphere here.
 */
export const ATMOSPHERE_CONFIG = {
  // =========================================================================
  // 1. OPTIONAL CINEMATIC VIDEO OR IMAGE BACKGROUND
  // =========================================================================
  // Enter a video or image file path (e.g. '/bg.mp4', '/bg.jpg', '/bg.webp' or a direct web URL).
  // Automatically detects whether it is a video (.mp4, .webm) or an image (.jpg, .png, .webp, .avif).
  // Leave empty ('') or null if you only want the Dusk Glow.
  videoSrc: '/joker.jpg',

  // Dark tint overlay placed directly over the video (range: 0.20 to 0.95).
  // Higher = darker video background so cards and text remain 100% readable.
  // Default recommendation: 0.65 (65% darkness)
  videoDarkTint: 0.85,

  // Soft blur applied to the video (e.g. '0px', '4px', '6px', '8px').
  // A blur between '4px' and '8px' turns moving video into smooth atmospheric depth.
  videoBlur: '5px',

  // =========================================================================
  // 2. AMBIENT DUSK GLOW (Always active)
  // =========================================================================
  // Warm crimson velvet and dusk amber radial flares that slowly breathe in the background.
  duskGlowEnabled: true,

  // Adjust the brightness / visibility of the Dusk Glow here (range: 0.1 to 1.0).
  // 0.4 = subtle glow | 0.85 = rich velvet atmosphere | 1.0 = maximum intensity
  duskGlowIntensity: 0.7,

  // =========================================================================
  // 3. 35mm ANALOG FILM GRAIN
  // =========================================================================
  // Subtle physical cinema texture overlay that eliminates flat digital color banding.
  filmGrainEnabled: true,

  // Opacity of the 35mm grain (range: 0.05 to 0.25). Set to 0 to disable.
  filmGrainOpacity: 0.0,
}

