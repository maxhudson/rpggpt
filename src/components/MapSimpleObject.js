import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import useImage from 'use-image';
import { cellSize } from '../k';
import sprites from '@/sprites';

const Image = dynamic(() => import('react-konva').then(mod => ({ default: mod.Image })), { ssr: false });
const Group = dynamic(() => import('react-konva').then(mod => ({ default: mod.Group })), { ssr: false });
const Text = dynamic(() => import('react-konva').then(mod => ({ default: mod.Text })), { ssr: false });
const Rect = dynamic(() => import('react-konva').then(mod => ({ default: mod.Rect })), { ssr: false });

// Konva is only available on client-side
let Konva;
if (typeof window !== 'undefined') {
  Konva = require('konva');
}

export default function MapSimpleObject({
  instance,
  instanceId,
  elementDef,
  x,
  y,
  opacity,
  displayText
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

  if (image) {
    var spriteData = sprites[spriteId];
    var imageSize = cellSize * Math.max(spriteData.width || 1, spriteData.height || 1) * (spriteData.imageScale || 1);
  }

  var yScale = 0.75;

  return (
    <Group x={x} y={y}>
      {image ? (
        <>
          <Image
            ref={imageRef}
            image={image}
            width={imageSize}
            height={imageSize * (spriteData.yScale || 1)}
            x={-imageSize / 2 + spriteData.width * cellSize / 2}
            y={(spriteData.yOffset || 0) * cellSize - imageSize + spriteData.width * cellSize * yScale / 2 * (spriteData.imageScale || 1)}
            filters={Konva ? [Konva.Filters.Pixelate] : []}
            pixelSize={8}
          />
        </>
      ) : (
        <>
          {/* Text label above */}
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
}
