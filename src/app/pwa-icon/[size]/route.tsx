import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

// Serves the raster PNG icons manifest.json needs (192x192, 512x512, and a
// maskable 512x512 with safe-zone padding for Android's adaptive-icon
// masking). Generated on request via next/og's ImageResponse rather than
// static files, since no image-rasterization tool is available in this
// environment to produce real PNGs ahead of time.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const maskable = sizeParam.endsWith('-maskable');
  const px = parseInt(sizeParam.replace('-maskable', ''), 10) || 512;
  const glyphSize = maskable ? px * 0.35 : px * 0.55;

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
          fontSize: glyphSize,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        B
      </div>
    ),
    { width: px, height: px }
  );
}
