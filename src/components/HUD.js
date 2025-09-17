import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import ElementTypeEditor from './ElementTypeEditor';
import { Tooltip } from 'react-tooltip';
import _ from 'lodash';

export default function HUD({ isEditing, setIsEditing, game, updateGame, elementTypes, setElementTypes, session, player, drawingMode, setDrawingMode, selectedMaterialId, setSelectedMaterialId, stateRef, onDragStart, onDragMove, onDragEnd, createMapElement, selectedPolygonId, nearbyInteractiveElements, onCraft, onSell, onBuy, onBuild, onUseTool, onPlayNewInstance, userProfile }) {
  const [activeElementTypeId, setActiveElementTypeId] = useState(null);
  const [tentativeImages, setTentativeImages] = useState({}); // Store tentative images by elementType id
  const tentativeImagesRef = useRef({}); // Ref for avoiding race conditions with async API responses
  const [generatingImages, setGeneratingImages] = useState({}); // Track which element types are generating images
  const [isDragging, setIsDragging] = useState(false);
  const [dragElementTypeId, setDragElementTypeId] = useState(null);
  const [selectedPolygonColor, setSelectedPolygonColor] = useState('#808080');

  tentativeImagesRef.current = tentativeImages; // Keep ref in sync with state

  // Derive the active element type object from the ID and elementTypes
  const activeElementType = activeElementTypeId ? elementTypes[activeElementTypeId] : null;

  const handleCreateNewElementType = async (type = 'object') => {
    if (!game) return;

    const newElementTypeData = {
      title: '',
      width: type === 'stat' ? 0.5 : 1, // Width in grid units
      type: type,
      originalWidth: 100,
      originalHeight: 100,
      offsetX: 0,
      offsetY: 0,
      collisionRadius: type === 'stat' ? 0.1 : 0.25,
      shadowRadius: type === 'stat' ? 0.1 : 0.25,
    };

    // Insert into element_types table (let Supabase generate the ID)
    const { data: elementTypeData, error } = await supabase
      .from('element_types')
      .insert({
        user_id: session.user.id,
        data: newElementTypeData
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating element type:', error);
      return;
    }

    // Update local state
    setElementTypes(prev => ({
      ...prev,
      [elementTypeData.id]: { id: elementTypeData.id, data: newElementTypeData }
    }));

    // Add this element type to the game's element_type_ids
    const updatedElementTypeIds = [...(game.element_type_ids || []), elementTypeData.id];
    await updateGame({ ...game, element_type_ids: updatedElementTypeIds });

    setActiveElementTypeId(elementTypeData.id);
  };

  const handleUpdateElementType = async (updatedElementType) => {
    if (!activeElementTypeId) return;

    // Update in element_types table
    const { error } = await supabase
      .from('element_types')
      .update({data: updatedElementType.data})
      .eq('id', activeElementTypeId);

    if (error) {
      console.error('Error updating element type:', error);
      return;
    }

    // Update local state
    setElementTypes(prev => ({
      ...prev,
      [activeElementTypeId]: updatedElementType
    }));
  };

  const handleCloseEditor = () => {
    setActiveElementTypeId(null);
  };

  const handleEditElementType = (elementTypeId) => {
    setActiveElementTypeId(elementTypeId);
  };

  const handleSetTentativeImages = (elementTypeId, options) => {
    setTentativeImages(prev => ({
      ...prev,
      [elementTypeId]: options
    }));
    // Clear generating state when tentative images are ready
    setGeneratingImages(prev => {
      const newState = { ...prev };
      delete newState[elementTypeId];
      return newState;
    });
  };

  const handleAcceptTentativeImage = async (updatedElementType) => {
    const elementTypeId = activeElementTypeId;

    // Update in database
    const { error } = await supabase
      .from('element_types')
      .update({ data: updatedElementType.data })
      .eq('id', elementTypeId);

    if (error) {
      console.error('Error updating element type:', error);
      return;
    }

    // Update local state
    setElementTypes(prev => ({
      ...prev,
      [elementTypeId]: updatedElementType
    }));

    // Clear tentative images
    setTentativeImages(prev => {
      const newState = { ...prev };
      delete newState[elementTypeId];
      return newState;
    });
  };

  const handleRejectTentativeImage = (elementTypeId) => {
    setTentativeImages(prev => {
      const newState = { ...prev };
      delete newState[elementTypeId];
      return newState;
    });
  };

  const handleDeleteElementType = async (elementTypeId) => {
    if (!elementTypeId) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from('element_types')
        .delete()
        .eq('id', elementTypeId);

      if (error) {
        console.error('Error deleting element type:', error);
        alert('Failed to delete element type. Please try again.');
        return;
      }

      // Remove from local state
      setElementTypes(prev => {
        const newState = { ...prev };
        delete newState[elementTypeId];
        return newState;
      });

      // Remove from game's element_type_ids
      const updatedElementTypeIds = (game.element_type_ids || []).filter(id => id !== elementTypeId);
      await updateGame({ ...game, element_type_ids: updatedElementTypeIds });

      // Clear tentative images if they exist
      setTentativeImages(prev => {
        const newState = { ...prev };
        delete newState[elementTypeId];
        return newState;
      });

      // Close editor if this element type was being edited
      if (activeElementTypeId === elementTypeId) {
        setActiveElementTypeId(null);
      }

      // Clear selected material if it was the deleted one
      if (selectedMaterialId === elementTypeId) {
        setSelectedMaterialId(null);
      }

    } catch (error) {
      console.error('Error deleting element type:', error);
      alert('Failed to delete element type. Please try again.');
    }
  };

  // Calculate quantities of each elementType in map and inventory
  const calculateElementQuantities = () => {
    const quantities = {};

    // Count elements in map
    if (isEditing) {
      Object.values(game.map.elements).forEach(mapElement => {
        const elementTypeId = mapElement[0]; // [elementTypeId, x, y]
        quantities[elementTypeId] = (quantities[elementTypeId] || 0) + 1;
      });
    }

    // Count elements in player inventory
    if (player && player.inventory) {
      Object.entries(player.inventory).forEach(([elementTypeId, count]) => {
        quantities[elementTypeId] = (quantities[elementTypeId] || 0) + count;
      });
    }

    return quantities;
  };

  const handleElementTypeMouseDown = (e, elementTypeId) => {
    e.preventDefault(); // Prevent default drag behavior
    const startX = e.pageX;
    const startY = e.pageY;
    let hasDragged = false;
    let createdElementId = null;

    const handleMouseMove = async (moveEvent) => {
      const deltaX = moveEvent.pageX - startX;
      const deltaY = moveEvent.pageY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 10 && !hasDragged) {
        hasDragged = true;

        // Create the element first at the current mouse position
        const { elementId, updatedMap } = createMapElement(elementTypeId, 0, 0);
        createdElementId = elementId;

        // Update game state immediately so the element appears
        const currentGame = stateRef.current.game;
        updateGame({ ...currentGame, map: updatedMap }, { updateSupabase: false, updateState: true });

        // Then start dragging the newly created element using shared drag handlers
        if (onDragStart) {
          onDragStart(elementId, { x: moveEvent.pageX, y: moveEvent.pageY }, true); // true = isHUDDrag
        }

        // Immediately set the position for the first time
        if (onDragMove) {
          onDragMove(elementId, { x: moveEvent.pageX, y: moveEvent.pageY });
        }
      } else if (hasDragged && createdElementId && onDragMove) {
        // Continue dragging the created element
        onDragMove(createdElementId, { x: moveEvent.pageX, y: moveEvent.pageY });
      }
    };

    const handleMouseUp = (upEvent) => {
      if (!hasDragged) {
        // This was a click, open the editor
        handleEditElementType(elementTypeId);
      } else if (createdElementId && onDragEnd) {
        // End dragging the created element
        onDragEnd(createdElementId, { x: upEvent.pageX, y: upEvent.pageY });
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCreatePolygon = async () => {
    // Get next polygon ID
    const existingIds = Object.keys(game.background || {}).map(id => parseInt(id)).filter(id => !isNaN(id));
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    // Create rectangle polygon centered on player position
    const size = 100; // Rectangle size
    const newPolygon = {
      type: 'path',
      fill: selectedPolygonColor,
      points: [
        [player.position.x - size/2, player.position.y - size/2], // Top-left
        [player.position.x + size/2, player.position.y - size/2], // Top-right
        [player.position.x + size/2, player.position.y + size/2], // Bottom-right
        [player.position.x - size/2, player.position.y + size/2]  // Bottom-left
      ]
    };

    // Update game background
    const updatedBackground = {
      ...game.background,
      [nextId]: newPolygon
    };

    await updateGame({ ...game, background: updatedBackground });
  };

  const handleUpdatePolygonColor = async (polygonId, newColor) => {
    if (!polygonId || !game.background?.[polygonId]) return;

    const currentPolygon = game.background[polygonId];
    const updatedPolygon = {
      ...currentPolygon,
      fill: newColor
    };

    const updatedBackground = {
      ...game.background,
      [polygonId]: updatedPolygon
    };

    await updateGame({ ...game, background: updatedBackground });
  };

  var nearbyInteractiveElement = nearbyInteractiveElements && nearbyInteractiveElements[0];

  var actionButtons = [];

  if (nearbyInteractiveElement) {
    if (nearbyInteractiveElement.elementType.data.actions?.craft === 1) actionButtons.push({onAction: () => onCraft(nearbyInteractiveElement.elementType), type: 'craft'});
    if (nearbyInteractiveElement.elementType.data.actions?.sell === 1) actionButtons.push({onAction: () => onSell(nearbyInteractiveElement.elementType), type: 'sell'});
    if (nearbyInteractiveElement.elementType.data.actions?.buy === 1) actionButtons.push({onAction: () => onBuy(nearbyInteractiveElement.elementType), type: 'buy'});

    if (nearbyInteractiveElement.elementType.data.type === 'item') {
      actionButtons.push({onAction: () => {
        const updatedInventory = {
          ...player.inventory,

          [nearbyInteractiveElement.elementType.id]: (player.inventory[nearbyInteractiveElement.elementType.id] || 0) + 1
        };

        const updatedMapElements = { ...game.map.elements };
        delete updatedMapElements[nearbyInteractiveElement.element.id]; // Remove from map

        updateGame({
          ...game,
          map: {
            ...game.map,
            elements: updatedMapElements
          },
          players: {
            ...game.players,
            [session.user.id]: {
              ...player,
              inventory: updatedInventory
            }

          }
        });
      }, type: 'pick-up'});
    }
  }

  actionButtons.push({type: 'build', onAction: () => {
    onBuild()
  }})

  return (
    <>
      {/* Edit button and Play New Instance button - top right */}
      <div style={{ position: 'absolute', bottom: '20px', right: '160px', zIndex: 100, display: 'flex', gap: '1px', flexDirection: 'column' }}>
        {/* Play New Instance button - only show when editing (game definition) */}
        {isEditing && (
          <div
            onClick={onPlayNewInstance}
            style={{
              backgroundColor: '#E6E2D2',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginBottom: '1px'
            }}
          >
            <span style={{textTransform: 'uppercase', fontSize: 8, letterSpacing: '0.05em', textAlign: 'center', lineHeight: '10px'}}>play</span>
          </div>
        )}
      </div>

      {/* Inventory Display - top left */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100, display: 'flex', gap: '1px'}}>
        {_.map(isEditing ? ['object', 'plant', 'building', 'tool', 'item', 'stat'] : ['tool', 'item', 'stat'], (type) => (
          <div key={type}>
            {(() => {
              const quantities = calculateElementQuantities();
              const itemsWithQuantity = Object.entries(elementTypes)
                .map(([elementTypeId, elementType]) => ({
                  elementTypeId,
                  elementType,
                  quantity: quantities[elementTypeId] || 0
                }))
                .filter(item => (item.elementType.data.type || 'object') === type)
                .filter(item => isEditing || item.quantity > 0);

              return itemsWithQuantity.map(({ elementTypeId, elementType, quantity }) => {
                const isGenerating = generatingImages[elementTypeId];
                const hasTentativeImages = tentativeImages[elementTypeId];

                return (
                  <div
                    key={elementTypeId}
                    onMouseDown={(e) => handleElementTypeMouseDown(e, elementTypeId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '1px',
                      fontSize: '12px',
                      backgroundColor: '#E6E2D2',
                      padding: '8px',
                      position: 'relative',
                      width: 40,
                      height: 40,
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    data-tooltip-id={`inventory-tooltip-${elementTypeId}`}
                    data-tooltip-content={`${(elementType.data.title || '?').toUpperCase()}`}
                  >
                    {isGenerating ? (
                      <span style={{ fontSize: '16px', fontWeight: 'bold' }}>...</span>
                    ) : hasTentativeImages ? (
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff6600' }}>!!</span>
                    ) : (
                      <>
                        <img
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/element_types/${elementTypeId}/image.png${elementType.data.imageTimestamp ? `?t=${elementType.data.imageTimestamp}` : ''}`}
                          alt={elementType.title || 'Item'}
                          draggable={false}
                          style={{
                            width: '24px',
                            height: '24px',
                            objectFit: 'contain',
                            pointerEvents: 'none'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'inline';
                          }}
                        />
                        <span style={{opacity: 0.5, display: 'none'}}>?</span>
                      </>
                    )}
                    {quantity > 0 && (
                      <span style={{
                        fontSize: '9px',
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        padding: '0px 2px',
                        zIndex: 1,
                        fontWeight: 'bold',
                        opacity: 0.7,
                      }}>
                        {quantity}
                      </span>
                    )}
                  </div>
                );
              });
            })()}
            {isEditing && (
              <div
                  onClick={() => handleCreateNewElementType(type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '1px',
                    fontSize: '12px',
                    backgroundColor: '#E6E2D2',
                    padding: '8px',
                    position: 'relative',
                    width: 40,
                    height: 40,
                    justifyContent: 'center',
                    opacity: 0.5,
                    cursor: 'pointer',
                  }}
                >+</div>
            )}
          </div>
        ))}
      </div>

      {/* Money and Time Display - bottom left - only show when not editing */}
      {player && !isEditing && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '10px',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '0px',
          backgroundColor: '#E6E2D2',
          paddingTop: 8,
          paddingBottom: 8,
        }}>
          {/* <div style={{
            padding: '8px 12px',
            fontSize: '17px',
            fontWeight: 'bold',
            color: '#4A4A4A'
          }}>
            ${player.money || 0}
          </div> */}
          {game.time && (
            <div style={{
              padding: '0px 12px',
              fontSize: '20px',
              color: '#000',
              opacity: 0.8,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Day {game.time.day}
            </div>
          )}
          {game.time && (
            <div style={{
              padding: '0px 12px',
              fontSize: '12px',
              color: '#4A4A4A',
              opacity: 0.8,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginRight: 2
            }}>
              {String(game.time.hour % 12).padStart(1, '0')}:{String(game.time.minute).padStart(2, '0') + (game.time.hour >= 12 ? ' pm' : ' am')}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons - bottom center when near interactive elements and not editing */}
      {!isEditing && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 100,
          display: 'flex',
          gap: '1px',
          alignItems: 'center'
        }}>
          {nearbyInteractiveElement && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1px',
                fontSize: '12px',
                backgroundColor: '#E6E2D2',
                padding: '8px',
                position: 'relative',
                width: 40,
                height: 40,
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              data-tooltip-id={`nearby-item`}
              data-tooltip-content={(nearbyInteractiveElement.elementType.data.title || '?').toUpperCase()}
            >
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/element_types/${nearbyInteractiveElement.elementType.id}/image.png${nearbyInteractiveElement.elementType.data.imageTimestamp ? `?t=${nearbyInteractiveElement.elementType.data.imageTimestamp}` : ''}`}
                alt={nearbyInteractiveElement.elementType.data.title || '?'}
                draggable={false}
                style={{
                  width: '24px',
                  height: '24px',
                  objectFit: 'contain',
                  pointerEvents: 'none'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'inline';
                }}
              />
            </div>
          )}
          {_.map(actionButtons, ({type, onAction}, index) => (
            <div
              key={type}
              onMouseDown={onAction}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1px',
                fontSize: '12px',
                backgroundColor: '#E6E2D2',
                padding: '8px',
                position: 'relative',
                width: 40,
                height: 40,
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              data-tooltip-id={`action-tooltip-${type}`}
              data-tooltip-content={_.startCase(type)}
            >
              <img
                src={`/actions/${type}-icon.png`}
                alt={type}
                draggable={false}
                style={{
                  width: '24px',
                  height: '24px',
                  objectFit: 'contain',
                  pointerEvents: 'none'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'inline';
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Polygon Drawing Controls - bottom right when editing */}
      {isEditing && (
        <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
          <input
            type="color"
            value={selectedPolygonId && game?.background?.[selectedPolygonId] ?
              game.background[selectedPolygonId].fill || '#808080' :
              selectedPolygonColor}
            onChange={(e) => {
              if (selectedPolygonId && game?.background?.[selectedPolygonId]) {
                handleUpdatePolygonColor(selectedPolygonId, e.target.value);
              } else {
                setSelectedPolygonColor(e.target.value);
              }
            }}
            style={{
              width: '40px',
              height: '30px',
              border: '1px solid #ccc',
              cursor: 'pointer'
            }}
          />
          <button
            onClick={handleCreatePolygon}
            style={{
              backgroundColor: '#E6E2D2',
              border: '1px solid #ccc',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Add Polygon
          </button>
        </div>
      )}

      {activeElementType && (
        <ElementTypeEditor
          isOpen={true}
          onClose={handleCloseEditor}
          elementType={activeElementType}
          updateElementType={handleUpdateElementType}
          tentativeImages={tentativeImages[activeElementTypeId]}
          onSetTentativeImages={(options) => handleSetTentativeImages(activeElementTypeId, options)}
          onAcceptTentativeImage={(selectedOption) => handleAcceptTentativeImage(selectedOption)}
          onRejectTentativeImage={() => handleRejectTentativeImage(activeElementTypeId)}
          onDelete={handleDeleteElementType}
          onGeneratingStart={() => setGeneratingImages(prev => ({ ...prev, [activeElementTypeId]: true }))}
          elementTypes={elementTypes}
          updateGame={updateGame}
          stateRef={stateRef}
          userProfile={userProfile}
          session={session}
        />
      )}

      {/* Tooltips */}
      {Object.entries(elementTypes).map(([elementTypeId, elementType]) => (
        <Tooltip
          key={`inventory-tooltip-${elementTypeId}`}
          id={`inventory-tooltip-${elementTypeId}`}
          place="right"
          style={{
            borderRadius: '0px',
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1000
          }}
        />
      ))}
      <Tooltip
        id="nearby-item"
        style={{
          borderRadius: '0px',
          textTransform: 'uppercase',
          fontSize: '12px',
          fontWeight: 'bold',
            zIndex: 1000
        }}
      />
      {['craft', 'sell', 'buy', 'pick-up', 'build'].map(type => (
        <Tooltip
          key={`action-tooltip-${type}`}
          id={`action-tooltip-${type}`}
          place="top-right"
          style={{
            borderRadius: '0px',
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 1000
          }}
        />
      ))}
    </>
  );
}
