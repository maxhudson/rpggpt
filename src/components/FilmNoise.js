import { useEffect, useRef } from 'react';

export default function FilmNoise({ opacity = 0.1, intensity = 0.5, containerRef = null }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size to match viewport or container with retina scaling
    const resizeCanvas = () => {
      const pixelRatio = 1; //window.devicePixelRatio || 1;

      // Use container dimensions if containerRef is provided, otherwise use viewport
      let width, height;
      if (containerRef && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      } else {
        width = window.innerWidth;
        height = window.innerHeight;
      }

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

    // Only add resize listener if using viewport (fullscreen mode)
    if (!containerRef) {
      window.addEventListener('resize', resizeCanvas);
    }

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
      animationRef.current = setTimeout(animate, 100); // 20fps = 1000ms/20 = 50ms
    };

    animate();

    return () => {
      if (!containerRef) {
        window.removeEventListener('resize', resizeCanvas);
      }
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [opacity, intensity, containerRef]);

  // Use absolute positioning if container is provided, otherwise fixed
  const positionStyle = containerRef ? {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1000,
  } : {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 1001,
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        ...positionStyle,
        pointerEvents: 'none',
        // mixBlendMode: 'overlay',
        opacity: opacity
      }}
    />
  );
}
