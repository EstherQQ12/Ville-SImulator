import { useEffect, useRef } from 'react';
import { WINDOW_GLOW_COLORS } from '../data/defaultBlueprints';
import { ICON_SIZE } from '../types/game';

interface PixelIconPreviewProps {
  iconGrid: string[];
  size?: number;
  nightMode?: boolean;
  className?: string;
}

export function PixelIconPreview({
  iconGrid,
  size = 32,
  nightMode = false,
  className = '',
}: PixelIconPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    if (nightMode) {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
    }

    for (let y = 0; y < ICON_SIZE; y++) {
      for (let x = 0; x < ICON_SIZE; x++) {
        const color = iconGrid[y * ICON_SIZE + x];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    if (nightMode) {
      // Dim non-glow pixels slightly and brighten lit windows
      ctx.fillStyle = 'rgba(8, 15, 36, 0.55)';
      ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);

      for (let y = 0; y < ICON_SIZE; y++) {
        for (let x = 0; x < ICON_SIZE; x++) {
          const color = iconGrid[y * ICON_SIZE + x];
          if (color && WINDOW_GLOW_COLORS.has(color.toUpperCase())) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    }
  }, [iconGrid, nightMode]);

  return (
    <canvas
      ref={canvasRef}
      width={ICON_SIZE}
      height={ICON_SIZE}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
      }}
      className={className}
    />
  );
}
