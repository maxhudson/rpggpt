import { useRef, useEffect, useState } from 'react';
import FilmNoise from '../FilmNoise';

export default function PlatformerCanvas({ width = 300, height = 300 }) {
  const containerRef = useRef(null);
  const keysPressed = useRef({});
  const [xOffset, setXOffset] = useState(0);

  const scale = 4;

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update position based on keys
  useEffect(() => {
    const moveSpeed = 1;

    const updatePosition = () => {
      let deltaX = 0;

      if (keysPressed.current['a']) deltaX += moveSpeed;
      if (keysPressed.current['d']) deltaX -= moveSpeed;

      if (deltaX !== 0) {
        setXOffset(prev => prev + deltaX);
      }
    };

    const intervalId = setInterval(updatePosition, 16); // ~60fps

    return () => clearInterval(intervalId);
  }, []);

  const treeWidth = 100 * scale;
  const treeHeight = 100 * scale;
  const treeX = width / 2 - treeWidth / 2 + xOffset;
  const treeY = height - treeHeight - 50;

  var [clouds, setClouds] = useState([]);
  var [cloudOffset, setCloudOffset] = useState(0);

  useEffect(() => {
    var interval = setInterval(() => {
      setCloudOffset(prev => prev + 1);

      setClouds(prev => {
        const newClouds = [...prev];
        if (newClouds.length < 5) {
          newClouds.push({
            x: Math.random() * width,
            y: Math.random() * height / 2,
            speed: Math.random() * 0.5 + 0.1
          });
        }
        return newClouds;
      });

    }, 30);

    return () => clearInterval(interval);
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#fff',
        width: width,
        height: height
      }}
      className='crt'
    >
      {[
        {color: '#97c1edff', h: height * 0.8, top: 0 },
        {color: '#8b9567', h: height * 0.2, top: height * 0.8 },
        {color: "#a5a577ff", h: height * 0.05, top: height * 0.85 },
      ].map(({color, h, top}) => (
        <div style={{position: 'absolute', backgroundColor: color, left: 0, top: top,
          width, height: h}} />
      ))}
      {/* Oak Tree */}
      <img
        src="/elements/Oak Tree.png"
        alt="Oak Tree"
        style={{
          position: 'absolute',
          left: 0,
          transform: `translateX(${treeX}px)`,
          top: treeY,
          width: treeWidth,
          height: treeHeight,
          imageRendering: 'pixelated'
        }}
      />

      <img
        src="/elements/Yurt.png"
        alt="Yurt"
        style={{
          position: 'absolute',
          left: 350,
          transform: `translateX(${treeX}px)`,
          top: treeY + 200,
          width: treeWidth / 2,
          height: treeHeight / 2,
          imageRendering: 'pixelated'
        }}
      />


      {keysPressed.current['a'] || keysPressed.current['d'] ? (
        <img
          src="/elements/playerWalking.gif"
          alt="Player"
          style={{
            position: 'absolute',
            left: 250,
            top: 375,
            width: 37.5 * scale / 2,
            height: 37.5 * scale / 2,
            imageRendering: 'pixelated',
            ...(keysPressed.current['a'] ? {transform: 'scaleX(-100%)'} : {})
          }}
        />
      ) : (
        <img
          src="/elements/player.png"
          alt="Player"
          style={{
            position: 'absolute',
            left: 250,
            top: 375,
            width: 37.5 * scale / 2,
            height: 37.5 * scale / 2,
            imageRendering: 'pixelated'
          }}
        />
      )}

      {/* {clouds.map((cloud, index) => (
        <img
          src="/elements/Cloud.png"
          alt="Cloud"
          style={{
            position: 'absolute',
            left: 0 + cloudOffset,
            transform: `translateX(${treeX}px)`,
            top: 100,
            width: treeWidth,
            height: treeHeight,
            imageRendering: 'pixelated'
          }}
        />
      ))} */}


      {/* Film Noise Overlay */}
      <FilmNoise opacity={0.3} intensity={0.6} containerRef={containerRef} />
    </div>
  );
}
