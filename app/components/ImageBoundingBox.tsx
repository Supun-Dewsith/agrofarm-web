import React, { useEffect, useRef } from 'react';
import type { BoundingBox } from '../types/disease';

export type DiagnosticViewMode = 'boxes' | 'heatmap' | 'original';

interface Props {
  imageUrl: string;
  boxes: BoundingBox[];
  mode?: DiagnosticViewMode;
}

export const ImageBoundingBox: React.FC<Props> = ({ imageUrl, boxes, mode = 'boxes' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      // Set canvas intrinsic dimensions exactly matching the image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // If user selected original photo, stop here
      if (mode === 'original') {
        return;
      }

      // If user selected Grad-CAM activation heatmap
      if (mode === 'heatmap') {
        if (!boxes || boxes.length === 0) {
          // Healthy leaf vitality overlay: soft natural bioluminescent emerald
          const grad = ctx.createRadialGradient(
            img.naturalWidth / 2,
            img.naturalHeight / 2,
            Math.min(img.naturalWidth, img.naturalHeight) * 0.1,
            img.naturalWidth / 2,
            img.naturalHeight / 2,
            Math.max(img.naturalWidth, img.naturalHeight) * 0.65
          );
          grad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
          grad.addColorStop(0.5, 'rgba(5, 150, 105, 0.2)');
          grad.addColorStop(1, 'rgba(5, 150, 105, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
          return;
        }

        // Draw Grad-CAM Activation Heatmap Overlay for each lesion
        boxes.forEach((spot) => {
          const [ymin, xmin, ymax, xmax] = spot.box_2d;

          const realYmin = (ymin / 1000) * img.naturalHeight;
          const realXmin = (xmin / 1000) * img.naturalWidth;
          const realYmax = (ymax / 1000) * img.naturalHeight;
          const realXmax = (xmax / 1000) * img.naturalWidth;

          const width = realXmax - realXmin;
          const height = realYmax - realYmin;

          const cx = realXmin + width / 2;
          const cy = realYmin + height / 2;
          const radius = Math.max(width, height, 35) * 1.15;

          // Multi-layer thermal activation gradient (Red epicenter -> Orange -> Yellow -> Blue halo)
          const heatGrad = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
          heatGrad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');    // Intense core activation (Red)
          heatGrad.addColorStop(0.25, 'rgba(249, 115, 22, 0.7)');  // High activation (Orange)
          heatGrad.addColorStop(0.55, 'rgba(234, 179, 8, 0.45)');  // Moderate activation (Yellow)
          heatGrad.addColorStop(0.8, 'rgba(59, 130, 246, 0.25)');  // Low boundary activation (Blue)
          heatGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');       // Transparent outer decay

          ctx.fillStyle = heatGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();

          // Subtle dashed contour line indicating gradient threshold
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = Math.max(1.5, img.naturalWidth * 0.002);
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Center crosshair marker
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(2, img.naturalWidth * 0.003);
          const ch = Math.max(6, img.naturalWidth * 0.012);
          ctx.beginPath();
          ctx.moveTo(cx - ch, cy);
          ctx.lineTo(cx + ch, cy);
          ctx.moveTo(cx, cy - ch);
          ctx.lineTo(cx, cy + ch);
          ctx.stroke();
        });

        return;
      }

      // Default mode: 'boxes' (Bounding Boxes with Confidence Badges)
      boxes.forEach((spot) => {
        const [ymin, xmin, ymax, xmax] = spot.box_2d;

        // Convert normalized coordinates (0-1000 scale) to image pixel space
        const realYmin = (ymin / 1000) * img.naturalHeight;
        const realXmin = (xmin / 1000) * img.naturalWidth;
        const realYmax = (ymax / 1000) * img.naturalHeight;
        const realXmax = (xmax / 1000) * img.naturalWidth;

        const width = realXmax - realXmin;
        const height = realYmax - realYmin;

        // Bounding box border
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = Math.max(3, img.naturalWidth * 0.006);
        ctx.strokeRect(realXmin, realYmin, width, height);

        // Semi-transparent highlight fill
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(realXmin, realYmin, width, height);

        // Label typography
        const confVal = spot.confidence <= 1.0 ? spot.confidence * 100 : spot.confidence;
        const label = `${Math.round(confVal)}%`;
        const fontSize = Math.max(14, Math.round(img.naturalWidth * 0.035));
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;

        const textMetrics = ctx.measureText(label);
        const paddingX = 8;
        const badgeHeight = fontSize + 8;
        const badgeWidth = textMetrics.width + paddingX * 2;

        // Position label inside the box if near the top edge to prevent clipping
        const badgeY = realYmin >= badgeHeight ? realYmin - badgeHeight : realYmin;

        // Badge background
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(realXmin, badgeY, badgeWidth, badgeHeight);

        // Badge text
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, realXmin + paddingX, badgeY + badgeHeight / 2);
      });
    };
  }, [imageUrl, boxes, mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        maxWidth: '100%',
        maxHeight: '100%',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        margin: 'auto'
      }}
    />
  );
};