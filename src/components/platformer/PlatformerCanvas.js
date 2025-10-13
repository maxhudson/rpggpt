/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { useRef, useEffect, useState } from 'react';
import FilmNoise from '../FilmNoise';
import _ from 'lodash';

var assets = {
  elements: {
    "Oak Tree": {size: 256, bottomOffset: -3},
    "Cabin": {size: 128}
  }
};

export default function PlatformerCanvas({ activeLocation, game, width = 300, height = 300 }) {
  const containerRef = useRef(null);
  const keysPressed = useRef({});
  const [xOffset, setXOffset] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);

  const scale = 4;

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      setForceUpdate(xOffset => xOffset + 1);
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
    const moveSpeed = scale / 4;

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

  var initialTexturePositions = useRef([]);

  if (!initialTexturePositions.current.length) {
    _.times(300, () => {
      initialTexturePositions.current.push({
        x: Math.random() * width,
        y: height * 0.8 + Math.random() * height * 0.2
      });
    });
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        backgroundColor: '#fff',
        width: width,
        height: height,
        filter: 'saturate(1)',
      }}
      className='crt'
    >
      <div style={{width, height, overflow: 'hidden', position: 'relative'}}>
        <div style={{position: 'absolute', top: 0, lefT: 0, width, height,
           background: `linear-gradient(to bottom, #97c1ed, #daf1f7ff)`
        }}/>
        {activeLocation.backgroundLayers && activeLocation.backgroundLayers.map(({color, height, bottom, addNoise, opacity}, i) => (<>
          <div style={{position: 'absolute', backgroundColor: color, opacity: opacity || 1, left: 0, bottom: bottom * scale / 2,
            width, height: height * scale / 2}} />
          {addNoise && _.map(initialTexturePositions.current, (pos, index) => (
            <div style={{position: 'absolute', left: (pos.x + xOffset) % width, top: pos.y, width: 2, height: 2, backgroundColor: 'rgba(0, 0, 0, 0.1)'}}/>
          ))}
        </>))}

        {activeLocation.elements && activeLocation.elements.map((element, index) => (
          <img
            key={index}
            src={'/elements/' + element.type + '.png'}
            style={{
              position: 'absolute',
              left: element.x + xOffset,
              bottom: (activeLocation.elementBottomOffset + (assets.elements[element.type].bottomOffset || 0)) * scale / 2,
              width: assets.elements[element.type].size * scale / 2,
              height: assets.elements[element.type].size * scale / 2,
              imageRendering: 'pixelated'
            }}
            />
        ))}

        {keysPressed.current['a'] || keysPressed.current['d'] ? (
          <img
            src="/characters/YoungMaleOveralls/walking-east.gif"
            alt="Player"
            style={{
              position: 'absolute',
              left: 250,
              bottom: (activeLocation.walkingBottomOffset - 7) * scale / 2,
              width: 37.5 * scale / 2,
              height: 37.5 * scale / 2,
              imageRendering: 'pixelated',
              ...(keysPressed.current['a'] ? {transform: 'scaleX(-100%)'} : {})
            }}
          />
        ) : (
          <img
            src="/characters/YoungMaleOveralls/north.png"
            alt="Player"
            style={{
              position: 'absolute',
              left: 250,
              bottom: (activeLocation.walkingBottomOffset - 7) * scale / 2,
              width: 37.5 * scale / 2,
              height: 37.5 * scale / 2,
              imageRendering: 'pixelated'
            }}
          />
        )}
      </div>

      <FilmNoise opacity={0.3} intensity={0.6} containerRef={containerRef} />

      <div id='platformer-controls'>
        <div
          style={{
            position: 'absolute',
            right: 80,
            top: 'calc(100% + 20px)',
            width: 40,
            height: 40,
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onMouseDown={() => keysPressed.current['a'] = true}
          onMouseUp={() => {
            keysPressed.current['a'] = false;
            setXOffset(xOffset => xOffset);
          }}
          onTouchStart={() => keysPressed.current['a'] = true}
          onTouchEnd={() => {
            keysPressed.current['a'] = false;
            setForceUpdate(xOffset => xOffset + 1);
          }}
        >
          <div style={{ width: 0, height: 0, borderBottom: '10px solid transparent', borderTop: '10px solid transparent', borderRight: '10px solid #000' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            right: 20,
            top: 'calc(100% + 20px)',
            width: 40,
            height: 40,
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onTouchStart={() => keysPressed.current['d'] = true}
          onTouchEnd={() => {
            keysPressed.current['d'] = false;
            setForceUpdate(xOffset => xOffset + 1);
          }}
        >
          <div style={{ width: 0, height: 0, borderBottom: '10px solid transparent', borderTop: '10px solid transparent', borderLeft: '10px solid #000' }} />
        </div>
      </div>
    </div>
  );
}
