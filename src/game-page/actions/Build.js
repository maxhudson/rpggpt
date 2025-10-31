import React, { useState, useEffect, useRef } from 'react';

export function CircleClickGame({ onEvent, onComplete, requiredScore = 100 }) {
  const [progress, setProgress] = useState(0);
  const [circlePos, setCirclePos] = useState({ x: 50, y: 50 });
  const [isComplete, setIsComplete] = useState(false);
  const gameAreaRef = useRef(null);
  const energyCostPerClick = 1;
  const velocityRef = useRef({
    x: (Math.random() - 0.5) * 3,
    y: (Math.random() - 0.5) * 3
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCirclePos(prev => {
        let newX = prev.x + velocityRef.current.x;
        let newY = prev.y + velocityRef.current.y;

        if (newX <= 15 || newX >= 85) {
          velocityRef.current.x = -velocityRef.current.x;
          newX = newX <= 15 ? 15 : 85;
        }
        if (newY <= 15 || newY >= 85) {
          velocityRef.current.y = -velocityRef.current.y;
          newY = newY <= 15 ? 15 : 85;
        }

        return { x: newX, y: newY };
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  const handleClick = (e) => {
    if (!gameAreaRef.current || progress >= requiredScore) return;

    const rect = gameAreaRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const distancePercent = Math.sqrt(
      Math.pow(clickX - circlePos.x, 2) + Math.pow(clickY - circlePos.y, 2)
    );

    const distancePx = (distancePercent / 100) * rect.width;

    const circleRadius = 20;
    const centerThreshold = (5 / rect.width) * 100;

    let progressGain = 0;
    let hitType = 'miss';

    if (distancePercent <= centerThreshold) {
      progressGain = 3;
      hitType = 'center';
    } else if (distancePercent <= circleRadius) {
      progressGain = 1;
      hitType = 'hit';
    }

    console.log(`[Minigame] Click at (${clickX.toFixed(1)}, ${clickY.toFixed(1)}), circle at (${circlePos.x.toFixed(1)}, ${circlePos.y.toFixed(1)}), distance: ${distancePx.toFixed(1)}px, result: ${hitType}, score: +${progressGain}`);

    if (progressGain > 0) {
      const newProgress = Math.min(requiredScore, progress + progressGain);
      setProgress(newProgress);

      console.log(`[Minigame] Progress: ${newProgress}/${requiredScore}`);

      if (onEvent) {
        onEvent({
          type: 'click',
          progress: newProgress,
          progressGain,
          energyCost: energyCostPerClick
        });
      }

      if (newProgress >= requiredScore) {
        console.log(`[Minigame] Complete! Final score: ${newProgress}`);
        setIsComplete(true);
        if (onComplete) {
          onComplete({ progress: newProgress });
        }
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      pointerEvents: 'auto',
      opacity: isComplete ? 0 : 1,
      transition: 'opacity 0.5s ease-out'
    }}>
      <div
        ref={gameAreaRef}
        onClick={handleClick}
        style={{
          width: '200px',
          height: '200px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${circlePos.x}%`,
            top: `${circlePos.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            opacity: 0.5
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${circlePos.x}%`,
            top: `${circlePos.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#fff'
          }}
        />
      </div>

    </div>
  );
}

export function handleBuild(game, targetElement, existingInstanceId = null) {
  const { activeCharacter, activeLocation } = game.instance;
  const characterData = game.instance.characters?.[activeCharacter];
  const location = game.instance.locations?.[activeLocation];

  if (!characterData) {
    return { success: false, message: 'Character not found', updates: [] };
  }

  const buildingDef = game.elements?.Buildings?.[targetElement];
  if (!buildingDef) {
    return { success: false, message: 'Building not found', updates: [] };
  }

  const actionType = existingInstanceId ? 'Upgrade' : 'Build';
  const costs = buildingDef.actions?.[actionType]?.costs || {};
  const updates = [];
  const inventory = game.useLocationBasedInventory
    ? location?.inventory || {}
    : game.instance.inventory || {};

  // Check if costs are disabled (debug mode)
  const disableCosts = typeof window !== 'undefined' && localStorage.getItem('debug-disable-costs') === 'true';

  if (!disableCosts) {
    if (costs.Items) {
      for (const [itemName, cost] of Object.entries(costs.Items)) {
        const available = inventory[itemName] || 0;
        if (available < cost) {
          return { success: false, message: `Not enough ${itemName}`, updates: [] };
        }
      }
    }

    if (costs.Stats) {
      for (const [statName, cost] of Object.entries(costs.Stats)) {
        const available = characterData.stats?.[statName] || 0;
        if (available < cost) {
          return { success: false, message: `Not enough ${statName}`, updates: [] };
        }
      }
    }
  }

  if (!disableCosts) {
    if (costs.Items) {
      for (const [itemName, cost] of Object.entries(costs.Items)) {
        const inventoryPath = game.useLocationBasedInventory
          ? `instance.locations.${activeLocation}.inventory.${itemName}`
          : `instance.inventory.${itemName}`;
        const currentAmount = inventory[itemName] || 0;
        updates.push({
          type: 'set',
          path: inventoryPath,
          value: currentAmount - cost
        });
      }
    }

    if (costs.Stats) {
      for (const [statName, cost] of Object.entries(costs.Stats)) {
        const currentStat = characterData.stats?.[statName] || 0;
        updates.push({
          type: 'set',
          path: `instance.characters.${activeCharacter}.stats.${statName}`,
          value: currentStat - cost
        });
      }
    }
  }

  let instanceId = existingInstanceId;

  if (existingInstanceId) {
    updates.push({
      type: 'set',
      path: `instance.locations.${activeLocation}.elementInstances.${existingInstanceId}.progress`,
      value: 0
    });
  } else {
    instanceId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const charX = characterData.x || 0;
    const charY = characterData.y || 0;

    updates.push({
      type: 'set',
      path: `instance.locations.${activeLocation}.elementInstances.${instanceId}`,
      value: {
        x: charX,
        y: charY,
        collection: 'Buildings',
        element: targetElement,
        level: 1,
        progress: 0
      }
    });
  }

  return {
    success: true,
    updates,
    instanceId,
    storyText: existingInstanceId ? `You upgrade the ${targetElement}.` : `You build a ${targetElement}.`
  };
}
