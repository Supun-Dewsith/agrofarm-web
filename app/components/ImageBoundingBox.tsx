import React, { useEffect, useRef } from 'react';
import type { BoundingBox } from '../types/disease';

interface Props {
  imageUrl: string;
  boxes: BoundingBox[];
}

export const ImageBoundingBox: React.FC<Props> = ({ imageUrl, boxes }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      // Set canvas intrinsic dimensions exactly matching the image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes
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
        const label = `${(spot.confidence * 100).toFixed(0)}%`;
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
  }, [imageUrl, boxes]);

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