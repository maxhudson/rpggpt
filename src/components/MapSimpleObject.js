import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import useImage from 'use-image';
import { cellSize } from '../k';
import sprites from '@/sprites';

const Image = dynamic(() => import('react-konva').then(mod => ({ default: mod.Image })), { ssr: false });
const Group = dynamic(() => import('react-konva').then(mod => ({ default: mod.Group })), { ssr: false });
const Text = dynamic(() => import('react-konva').then(mod => ({ default: mod.Text })), { ssr: false });
const Rect = dynamic(() => import('react-konva').then(mod => ({ default: mod.Rect })), { ssr: false });

const MapSimpleObject = React.memo(function MapSimpleObject({
  instance,
  instanceId,
  elementDef,
  x,
  y,
  opacity,
  displayText,
  characterIsBehind = false
}) {
  const imageRef = useRef(null);
  const spriteId = elementDef?.spriteId;
  const imagePath = spriteId ? `/${instance.collection}/${spriteId}.png` : null;
  const [image] = useImage(imagePath);

  // Cache the image for pixelate filter after it loads
  useEffect(() => {
    if (!image || !imageRef.current) return;

    const node = imageRef.current;

    // Wait for next frame to ensure Konva node is mounted
    const timeoutId = setTimeout(() => {
      if (node.cache) {
        node.cache();
        node.getLayer()?.batchDraw();
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [image]);

  // Animation and flipping for animals
  const isAnimal = instance.collection === 'Animals';
  const facingRight = instance.facingRight !== undefined ? instance.facingRight : false;
  const isDead = instance.isDead || false;

  // Dead animals have 0.5 opacity
  const animalOpacity = isDead ? 0.5 : 1;

  if (image) {
    var spriteData = sprites[spriteId];
    var imageSize = cellSize * Math.max(spriteData.width || 1, spriteData.height || 1) * (spriteData.imageScale || 1);
  }

  var yScale = 0.75;

  const hasProgress = instance.progress !== undefined;
  const progressPercent = hasProgress ? instance.progress : 0;
  const requiredScore = instance.activeAction?.requiredScore || 100;
  const progressRatio = hasProgress ? Math.min(1, progressPercent / requiredScore) : 0;

  return (
    <Group x={x} y={y} opacity={isAnimal ? animalOpacity : (characterIsBehind ? 1 : 1)}>
      {image ? (
        <>
          <Image
            ref={imageRef}
            image={image}
            width={imageSize}
            height={imageSize / yScale}
            x={-imageSize / 2 + spriteData.width * cellSize / 2}
            y={(spriteData.yOffset || 0) * cellSize / yScale - imageSize / yScale + spriteData.width * cellSize / 2 * (spriteData.imageScale || 1)}
            scaleX={isAnimal && facingRight ? -1 : 1}
            offsetX={isAnimal && facingRight ? imageSize : 0}
            opacity={instance.lastForaged || hasProgress ? 0.5 : 1}
          />
          {hasProgress && (
            <>
              <Rect
                x={(cellSize * 0.4) / 2}
                y={cellSize / 2 - 3}
                width={(cellSize * 0.6)}
                height={6}
                fill="rgba(0, 0, 0, 0.5)"
                cornerRadius={5}
              />
              <Rect
                x={(cellSize * 0.4) / 2}
                y={cellSize / 2 - 3}
                width={(cellSize * 0.6) * progressRatio}
                height={6}
                fill="#fff"
                cornerRadius={5}
              />
            </>
          )}
        </>
      ) : (
        <>
          <Text
            x={0}
            width={cellSize}
            y={6}
            text={displayText.toUpperCase()[0]}
            letterSpacing={1}
            fontSize={18}
            fill="black"
            align="center"
            fontFamily="EB Garamond"
          />
        </>
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  const isAnimal = prevProps.instance.collection === 'Animals';

  return (
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.opacity === nextProps.opacity &&
    prevProps.instanceId === nextProps.instanceId &&
    prevProps.instance.level === nextProps.instance.level &&
    prevProps.instance.progress === nextProps.instance.progress &&
    prevProps.displayText === nextProps.displayText &&
    prevProps.instance.lastForaged === nextProps.instance.lastForaged &&
    prevProps.characterIsBehind === nextProps.characterIsBehind &&
    (!isAnimal || (
      prevProps.instance.facingRight === nextProps.instance.facingRight &&
      prevProps.instance.animationFrame === nextProps.instance.animationFrame &&
      prevProps.instance.isPaused === nextProps.instance.isPaused &&
      prevProps.instance.isDead === nextProps.instance.isDead
    ))
  );
});

export default MapSimpleObject;
