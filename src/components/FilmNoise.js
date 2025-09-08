import { useEffect, useRef } from 'react';

export default function FilmNoise({ opacity = 0.1, intensity = 0.5 }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size to match viewport with retina scaling
    const resizeCanvas = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Set the actual canvas size in memory (scaled for retina)
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;

      // Scale the canvas back down using CSS
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      // Scale the drawing context so everything draws at the correct size
      ctx.scale(pixelRatio, pixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Generate noise pattern
    const generateNoise = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Generate random grayscale noise
        const noise = Math.random() * 255 * intensity;

        // Apply noise to RGB channels
        data[i] = noise;     // Red
        data[i + 1] = noise; // Green
        data[i + 2] = noise; // Blue
        data[i + 3] = Math.random() * 255 * opacity; // Alpha (transparency)
      }

      ctx.putImageData(imageData, 0, 0);
    };

    // Animation loop at 20fps (50ms intervals)
    const animate = () => {
      generateNoise();
      // animationRef.current = setTimeout(animate, 100); // 20fps = 1000ms/20 = 50ms
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [opacity, intensity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1001,
        mixBlendMode: 'overlay',
        opacity: opacity
      }}
    />
  );
}
