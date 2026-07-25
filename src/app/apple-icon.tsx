import { ImageResponse } from 'next/og';

// Next.js file convention: auto-injects <link rel="apple-touch-icon">.
// iOS uses this specifically for the home-screen icon when the app is
// added via Safari's "Add to Home Screen" — separate from manifest.json's
// icons array, which Android/Chrome read instead.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          color: '#fff',
          fontSize: 96,
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
