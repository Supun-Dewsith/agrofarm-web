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
      // Set canvas size matching image intrinsic dimensions
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes
      boxes.forEach((spot) => {
        const [ymin, xmin, ymax, xmax] = spot.box_2d;

        // Convert normalized coordinates (0-1000 range) to real pixel space
        const realYmin = (ymin / 1000) * img.naturalHeight;
        const realXmin = (xmin / 1000) * img.naturalWidth;
        const realYmax = (ymax / 1000) * img.naturalHeight;
        const realXmax = (xmax / 1000) * img.naturalWidth;

        const width = realXmax - realXmin;
        const height = realYmax - realYmin;

        // Box styling
        ctx.strokeStyle = '#ef4444'; // Red outline
        ctx.lineWidth = Math.max(3, img.naturalWidth * 0.005);
        ctx.strokeRect(realXmin, realYmin, width, height);

        // Semi-transparent highlight fill
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(realXmin, realYmin, width, height);

        // Label background & text
        const label = `${(spot.confidence * 100).toFixed(0)}%`;
        const fontSize = Math.max(14, Math.round(img.naturalWidth * 0.025));
        ctx.font = `bold ${fontSize}px sans-serif`;

        const textMetrics = ctx.measureText(label);
        const padding = 6;

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(
          realXmin,
          Math.max(0, realYmin - fontSize - padding),
          textMetrics.width + padding * 2,
          fontSize + padding
        );

        ctx.fillStyle = '#ffffff';
        ctx.fillText(
          label,
          realXmin + padding,
          Math.max(fontSize, realYmin - padding / 2)
        );
      });
    };
  }, [imageUrl, boxes]);

  return (
    <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-2xl shadow-lg border border-slate-200">
      <canvas ref={canvasRef} className="w-full h-auto block" />
    </div>
  );
};