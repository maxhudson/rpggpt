import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import ObjectTypeEditor from './ObjectTypeEditor';
import _ from 'lodash';

export default function HUD({ isEditing, setIsEditing, game, updateGame, objectTypes, setObjectTypes, session, drawingMode, setDrawingMode, selectedMaterialId, setSelectedMaterialId }) {
  const [showObjectEditor, setShowObjectEditor] = useState(false);
  const [currentObjectType, setCurrentObjectType] = useState(null);
  const [tentativeImages, setTentativeImages] = useState({}); // Store tentative images by objectType id

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
                  }}
                >
                  {objectType.imageData ? (
                    <img
                      src={objectType.imageData}
                      alt={objectType.title || 'Item'}
                      style={{
                        width: '24px',
                        height: '24px',
                        objectFit: 'contain'
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
                }}
              >+</div>
          </div>
        ))}
      </div>

      {/* Object types and materials - bottom left (only when editing) */}
      {isEditing && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 100 }}>
          {/* Objects Section */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'white' }}>Objects</h4>
            {objectTypes && Object.entries(objectTypes)
              .filter(([_, objectType]) => (objectType.type || 'object') === 'object')
              .map(([objectTypeId, objectType]) => (
                <div key={objectTypeId} style={{ marginBottom: '5px', backgroundColor: 'white', padding: '5px', borderRadius: '3px' }}>
                  <span
                    onClick={() => handleAddObjectToMap(objectTypeId)}
                    style={{ cursor: 'pointer', marginRight: '10px' }}
                  >
                    {objectType.title || 'Untitled Object'}
                  </span>
                  <button
                    onClick={() => handleEditObjectType(objectTypeId)}
                    style={{ fontSize: '12px' }}
                  >
                    ✏️
                  </button>
                </div>
              ))}
            <button onClick={handleCreateNewObjectType} style={{ marginTop: '5px' }}>
              + Object
            </button>
          </div>

          {/* Stats Section */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'white' }}>Stats</h4>
            {objectTypes && Object.entries(objectTypes)
              .filter(([_, objectType]) => objectType.type === 'stat')
              .map(([objectTypeId, objectType]) => (
                <div key={objectTypeId} style={{ marginBottom: '5px', backgroundColor: 'white', padding: '5px', borderRadius: '3px' }}>
                  <span
                    onClick={() => handleAddObjectToMap(objectTypeId)}
                    style={{ cursor: 'pointer', marginRight: '10px' }}
                  >
                    {objectType.title || 'Untitled Stat'}
                  </span>
                  <button
                    onClick={() => handleEditObjectType(objectTypeId)}
                    style={{ fontSize: '12px' }}
                  >
                    ✏️
                  </button>
                </div>
              ))}
            <button onClick={() => handleCreateNewObjectType('stat')} style={{ marginTop: '5px' }}>
              + Stat
            </button>
          </div>

          {/* Items Section */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: 'white' }}>Items</h4>
            {objectTypes && Object.entries(objectTypes)
              .filter(([_, objectType]) => objectType.type === 'item')
              .map(([objectTypeId, objectType]) => (
                <div key={objectTypeId} style={{ marginBottom: '5px', backgroundColor: 'white', padding: '5px', borderRadius: '3px' }}>
                  <span
                    onClick={() => handleAddObjectToMap(objectTypeId)}
                    style={{ cursor: 'pointer', marginRight: '10px' }}
                  >
                    {objectType.title || 'Untitled Item'}
                  </span>
                  <button
                    onClick={() => handleEditObjectType(objectTypeId)}
                    style={{ fontSize: '12px' }}
                  >
                    ✏️
                  </button>
                </div>
              ))}
            <button onClick={() => handleCreateNewObjectType('item')} style={{ marginTop: '5px' }}>
              + Item
            </button>
          </div>
        </div>
      )}

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
