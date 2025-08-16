import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import ObjectTypeEditor from './ObjectTypeEditor';
import _ from 'lodash';

export default function HUD({ isEditing, setIsEditing, game, updateGame, objectTypes, setObjectTypes, session, drawingMode, setDrawingMode, selectedMaterialId, setSelectedMaterialId, stateRef, onDragStart, onDragMove, onDragEnd }) {
  const [showObjectEditor, setShowObjectEditor] = useState(false);
  const [currentObjectType, setCurrentObjectType] = useState(null);
  const [tentativeImages, setTentativeImages] = useState({}); // Store tentative images by objectType id
  const [isDragging, setIsDragging] = useState(false);
  const [dragObjectTypeId, setDragObjectTypeId] = useState(null);

  const handleCreateNewObjectType = async (type = 'object') => {
    if (!game) return;

    const objectTypeId = Date.now().toString();
    const newObjectTypeData = {
      title: '',
      scale: type === 'stat' ? 0.1 : 0.1,
      type: type,
      imageData: null,
      originalWidth: 100,
      originalHeight: 100,
      offsetX: 0,
      offsetY: 0,
      collisionRadius: type === 'stat' ? 0.1 : 0.25,
      shadowRadius: type === 'stat' ? 0.1 : 0.25,
    };

    // Insert into object_types table
    const { data: objectTypeData, error } = await supabase
      .from('object_types')
      .insert({
        id: objectTypeId,
        game_id: game.id,
        user_id: session.user.id,
        data: newObjectTypeData
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating object type:', error);
      return;
    }

    // Update local state
    setObjectTypes(prev => ({
      ...prev,
      [objectTypeId]: newObjectTypeData
    }));

    setCurrentObjectType({ id: objectTypeId, ...newObjectTypeData });
    setShowObjectEditor(true);
  };

  const handleUpdateObjectType = async (updatedObjectType) => {
    if (!currentObjectType) return;

    // Update in object_types table
    const { error } = await supabase
      .from('object_types')
      .update({ data: updatedObjectType })
      .eq('id', currentObjectType.id);

    if (error) {
      console.error('Error updating object type:', error);
      return;
    }

    // Update local state
    setObjectTypes(prev => ({
      ...prev,
      [currentObjectType.id]: updatedObjectType
    }));

    setCurrentObjectType({ ...currentObjectType, ...updatedObjectType });
  };

  const handleCloseEditor = () => {
    setShowObjectEditor(false);
    setCurrentObjectType(null);
  };

  const handleAddObjectToMap = async (objectTypeId) => {
    if (!game || !game.data) return;

    const mapObjectId = Date.now().toString();
    const newMapObject = {
      x: 0,
      y: 0,
      objectTypeId: objectTypeId
    };

    const gameData = game.data;
    const updatedGameData = {
      ...gameData,
      mapObjects: {
        ...gameData.mapObjects,
        [mapObjectId]: newMapObject
      }
    };

    await updateGame({ data: updatedGameData });
  };

  const handleEditObjectType = (objectTypeId) => {
    const objectType = objectTypes[objectTypeId];
    setCurrentObjectType({ id: objectTypeId, ...objectType });
    setShowObjectEditor(true);
  };

  const handleSetTentativeImages = (objectTypeId, options) => {
    setTentativeImages(prev => ({
      ...prev,
      [objectTypeId]: options
    }));
  };

  const handleAcceptTentativeImage = async (objectTypeId, selectedOption) => {
    const tentativeOptions = tentativeImages[objectTypeId];
    if (!tentativeOptions || !selectedOption) return;

    const updatedObjectType = {
      ...objectTypes[objectTypeId],
      imageData: selectedOption.imageData,
      originalWidth: selectedOption.originalWidth,
      originalHeight: selectedOption.originalHeight
    };

    // Update in database
    const { error } = await supabase
      .from('object_types')
      .update({ data: updatedObjectType })
      .eq('id', objectTypeId);

    if (error) {
      console.error('Error updating object type:', error);
      return;
    }

    // Update local state
    setObjectTypes(prev => ({
      ...prev,
      [objectTypeId]: updatedObjectType
    }));

    // Clear tentative images
    setTentativeImages(prev => {
      const newState = { ...prev };
      delete newState[objectTypeId];
      return newState;
    });

    // Update current object type if it's the one being edited
    if (currentObjectType && currentObjectType.id === objectTypeId) {
      setCurrentObjectType({ id: objectTypeId, ...updatedObjectType });
    }
  };

  const handleRejectTentativeImage = (objectTypeId) => {
    setTentativeImages(prev => {
      const newState = { ...prev };
      delete newState[objectTypeId];
      return newState;
    });
  };

  const handleSelectMaterialForDrawing = (objectTypeId) => {
    setSelectedMaterialId(objectTypeId);
    setDrawingMode(true);
  };

  const handleToggleDrawingMode = () => {
    setDrawingMode(!drawingMode);
    if (!drawingMode) {
      setSelectedMaterialId(null);
    }
  };

  const handleDeleteObjectType = async (objectTypeId) => {
    if (!objectTypeId) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from('object_types')
        .delete()
        .eq('id', objectTypeId);

      if (error) {
        console.error('Error deleting object type:', error);
        alert('Failed to delete object type. Please try again.');
        return;
      }

      // Remove from local state
      setObjectTypes(prev => {
        const newState = { ...prev };
        delete newState[objectTypeId];
        return newState;
      });

      // Clear tentative images if they exist
      setTentativeImages(prev => {
        const newState = { ...prev };
        delete newState[objectTypeId];
        return newState;
      });

      // Close editor if this object type was being edited
      if (currentObjectType && currentObjectType.id === objectTypeId) {
        setShowObjectEditor(false);
        setCurrentObjectType(null);
      }

      // Clear selected material if it was the deleted one
      if (selectedMaterialId === objectTypeId) {
        setSelectedMaterialId(null);
      }

    } catch (error) {
      console.error('Error deleting object type:', error);
      alert('Failed to delete object type. Please try again.');
    }
  };

  // Calculate quantities of each objectType in mapObjects and inventory
  const calculateObjectQuantities = () => {
    const quantities = {};

    // Count objects in mapObjects
    if (game && game.data && game.data.mapObjects) {
      Object.values(game.data.mapObjects).forEach(mapObject => {
        const objectTypeId = mapObject.objectTypeId;
        quantities[objectTypeId] = (quantities[objectTypeId] || 0) + 1;
      });
    }

    // Count objects in inventory (if it exists)
    if (game && game.data && game.data.inventory) {
      Object.entries(game.data.inventory).forEach(([objectTypeId, count]) => {
        quantities[objectTypeId] = (quantities[objectTypeId] || 0) + count;
      });
    }

    return quantities;
  };

  const handleObjectTypeMouseDown = (e, objectTypeId) => {
    e.preventDefault(); // Prevent default drag behavior
    const startX = e.pageX;
    const startY = e.pageY;
    let hasDragged = false;
    let createdObjectId = null;

    const handleMouseMove = async (moveEvent) => {
      const deltaX = moveEvent.pageX - startX;
      const deltaY = moveEvent.pageY - startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > 10 && !hasDragged) {
        hasDragged = true;

        // Create the object first at the current mouse position
        const mapObjectId = Date.now().toString();
        createdObjectId = mapObjectId;

        // Create object at mouse position (will be converted to world coordinates by drag handlers)
        const newMapObject = {
          x: 0, // Will be set by drag handlers
          y: 0, // Will be set by drag handlers
          objectTypeId: objectTypeId
        };

        const gameData = game.data;
        const updatedGameData = {
          ...gameData,
          mapObjects: {
            ...gameData.mapObjects,
            [mapObjectId]: newMapObject
          }
        };

        // Update game state immediately so the object appears
        updateGame({ ...game, data: updatedGameData }, { updateSupabase: false, updateState: true });

        // Then start dragging the newly created object using shared drag handlers
        if (onDragStart) {
          onDragStart(mapObjectId, { x: moveEvent.pageX, y: moveEvent.pageY }, true); // true = isHUDDrag
        }

        // Immediately set the position for the first time
        if (onDragMove) {
          onDragMove(mapObjectId, { x: moveEvent.pageX, y: moveEvent.pageY });
        }
      } else if (hasDragged && createdObjectId && onDragMove) {
        // Continue dragging the created object
        onDragMove(createdObjectId, { x: moveEvent.pageX, y: moveEvent.pageY });
      }
    };

    const handleMouseUp = (upEvent) => {
      if (!hasDragged) {
        // This was a click, open the editor
        handleEditObjectType(objectTypeId);
      } else if (createdObjectId && onDragEnd) {
        // End dragging the created object
        onDragEnd(createdObjectId, { x: upEvent.pageX, y: upEvent.pageY });
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCreateButtonClick = (type) => {
    handleCreateNewObjectType(type);
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
          <div>
            {(() => {
              const quantities = calculateObjectQuantities();
              const itemsWithQuantity = Object.entries(objectTypes)
                .map(([objectTypeId, objectType]) => ({
                  objectTypeId,
                  objectType,
                  quantity: quantities[objectTypeId] || 0
                }))
                .filter(item => (item.objectType.type || 'object') === type)// && item.quantity > 0)
                // .filter(item => item.quantity > 0);

              return itemsWithQuantity.map(({ objectTypeId, objectType, quantity }) => objectType.type === 'material' ? null : (
                <div
                  key={objectTypeId}
                  onMouseDown={(e) => handleObjectTypeMouseDown(e, objectTypeId)}
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
                  {objectType.imageData ? (
                    <img
                      src={objectType.imageData}
                      alt={objectType.title || 'Item'}
                      draggable={false}
                      style={{
                        width: '24px',
                        height: '24px',
                        objectFit: 'contain',
                        pointerEvents: 'none'
                      }}
                    />
                  ) : <span style={{opacity: 0.5}}>?</span>}
                  {/* <span style={{ flex: 1 }}>
                    {objectType.title || 'Untitled Item'}
                  </span> */}
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
              ));
            })()}
            <div
                onClick={() => handleCreateButtonClick(type)}
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


      {currentObjectType && (
        <ObjectTypeEditor
          isOpen={showObjectEditor}
          onClose={handleCloseEditor}
          objectType={currentObjectType}
          updateObjectType={handleUpdateObjectType}
          tentativeImages={tentativeImages[currentObjectType.id]}
          onSetTentativeImages={(options) => handleSetTentativeImages(currentObjectType.id, options)}
          onAcceptTentativeImage={(selectedOption) => handleAcceptTentativeImage(currentObjectType.id, selectedOption)}
          onRejectTentativeImage={() => handleRejectTentativeImage(currentObjectType.id)}
          onDelete={handleDeleteObjectType}
        />
      )}
    </>
  );
}
