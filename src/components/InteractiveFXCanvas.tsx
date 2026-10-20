import React, { useEffect, useRef } from 'react';
import { fxSystem } from '../utils/interactiveFX';

interface InteractiveFXCanvasProps {
  colorScheme?: 'gold' | 'neon-pink' | 'cyan' | 'purple';
}

export const InteractiveFXCanvas: React.FC<InteractiveFXCanvasProps> = ({
  colorScheme = 'neon-pink'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    fxSystem.init(canvas);

    const handleResize = () => {
      fxSystem.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      fxSystem.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
};
