import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import ElementTypeEditor from './ElementTypeEditor';
import _ from 'lodash';

export default function HUD({ isEditing, setIsEditing, game, updateGame, elementTypes, setElementTypes, session, drawingMode, setDrawingMode, selectedMaterialId, setSelectedMaterialId, stateRef, onDragStart, onDragMove, onDragEnd, createMapElement }) {
  const [activeElementTypeId, setActiveElementTypeId] = useState(null);
  const [tentativeImages, setTentativeImages] = useState({}); // Store tentative images by elementType id
  const [generatingImages, setGeneratingImages] = useState({}); // Track which element types are generating images
  const [isDragging, setIsDragging] = useState(false);
  const [dragElementTypeId, setDragElementTypeId] = useState(null);

  // Derive the active element type object from the ID and elementTypes
  const activeElementType = activeElementTypeId ? elementTypes[activeElementTypeId] : null;
  console.log('---', activeElementType)
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
    Object.values(game.map.elements).forEach(mapElement => {
      const elementTypeId = mapElement[0]; // [elementTypeId, x, y]
      quantities[elementTypeId] = (quantities[elementTypeId] || 0) + 1;
    });

    // Count elements in inventory (if it exists)
    if (game && game.inventory) {
      Object.entries(game.inventory).forEach(([elementTypeId, count]) => {
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

  return (
    <>
      {/* Edit button - top right */}
      <div
        onClick={() => setIsEditing(!isEditing)}
        style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100, backgroundColor: '#E6E2D2', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}
      >
        {isEditing ? '✓' : <span style={{textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em'}}>edit</span>}
      </div>

      {/* Inventory Display - top left */}
      <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 100, display: 'flex', gap: '1px'}}>
        {_.map(['object', 'item', 'stat'], (type) => (
          <div key={type}>
            {(() => {
              const quantities = calculateElementQuantities();
              const itemsWithQuantity = Object.entries(elementTypes)
                .map(([elementTypeId, elementType]) => ({
                  elementTypeId,
                  elementType,
                  quantity: quantities[elementTypeId] || 0
                }))
                .filter(item => (item.elementType.data.type || 'object') === type);

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
                    <span style={{
                      fontSize: '9px',
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      padding: '1px 3px',
                      zIndex: 1,
                    }}>
                      {quantity}
                    </span>
                  </div>
                );
              });
            })()}
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
          </div>
        ))}
      </div>

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
        />
      )}
    </>
  );
}
