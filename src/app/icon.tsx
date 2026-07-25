import { ImageResponse } from 'next/og';

// Next.js file convention: this auto-generates the favicon and injects the
// right <link rel="icon"> tag. Built with next/og's ImageResponse instead of
// a static PNG because there's no image-rasterization tool (ImageMagick,
// sharp, etc.) available in this environment — ImageResponse renders PNGs
// server-side purely from JSX/CSS, no external binary required.
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          borderRadius: 7,
          color: '#fff',
          fontSize: 20,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        B
      </div>
    ),
    { ...size }
  );
}
