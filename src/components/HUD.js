import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import ObjectTypeEditor from './ObjectTypeEditor';

export default function HUD({ isEditing, setIsEditing, game, updateGame, objectTypes, setObjectTypes, session, drawingMode, setDrawingMode, selectedMaterialId, setSelectedMaterialId }) {
  const [showObjectEditor, setShowObjectEditor] = useState(false);
  const [currentObjectType, setCurrentObjectType] = useState(null);
  const [tentativeImages, setTentativeImages] = useState({}); // Store tentative images by objectType id

  const handleCreateNewObjectType = async () => {
    if (!game) return;

    const objectTypeId = Date.now().toString();
    const newObjectTypeData = {
      title: '',
      scale: 0.1,
      type: 'object',
      imageData: null,
      originalWidth: 100,
      originalHeight: 100,
      offsetX: 0,
      offsetY: 0,
      collisionRadius: 0.25,
      shadowRadius: 0.25,
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

  const handleCreateNewMaterial = async () => {
    if (!game) return;

    const objectTypeId = Date.now().toString();
    const newMaterialData = {
      title: '',
      scale: 1.0,
      type: 'material',
      imageData: null,
      originalWidth: 100,
      originalHeight: 100,
      offsetX: 0,
      offsetY: 0,
      collisionRadius: 0,
      shadowRadius: 0,
    };

    // Insert into object_types table
    const { data: objectTypeData, error } = await supabase
      .from('object_types')
      .insert({
        id: objectTypeId,
        game_id: game.id,
        user_id: session.user.id,
        data: newMaterialData
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating material:', error);
      return;
    }

    // Update local state
    setObjectTypes(prev => ({
      ...prev,
      [objectTypeId]: newMaterialData
    }));

    setCurrentObjectType({ id: objectTypeId, ...newMaterialData });
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

  return (
    <>
      {/* Edit button - top right */}
      <button
        onClick={() => setIsEditing(!isEditing)}
        style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100 }}
      >
        {isEditing ? '✓' : '✏️'}
      </button>

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

          {/* Materials Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: '0', color: 'white', marginRight: '10px' }}>Materials</h4>
              <button
                onClick={handleToggleDrawingMode}
                style={{
                  fontSize: '12px',
                  backgroundColor: drawingMode ? 'green' : 'gray',
                  color: 'white',
                  border: 'none',
                  padding: '2px 6px',
                  borderRadius: '3px'
                }}
              >
                🖌️ {drawingMode ? 'ON' : 'OFF'}
              </button>
            </div>
            {objectTypes && Object.entries(objectTypes)
              .filter(([_, objectType]) => objectType.type === 'material')
              .map(([objectTypeId, objectType]) => (
                <div
                  key={objectTypeId}
                  style={{
                    marginBottom: '5px',
                    backgroundColor: selectedMaterialId === objectTypeId ? 'lightblue' : 'white',
                    padding: '5px',
                    borderRadius: '3px'
                  }}
                >
                  <span
                    onClick={() => drawingMode ? handleSelectMaterialForDrawing(objectTypeId) : handleAddObjectToMap(objectTypeId)}
                    style={{ cursor: 'pointer', marginRight: '10px' }}
                  >
                    {objectType.title || 'Untitled Material'}
                  </span>
                  <button
                    onClick={() => handleEditObjectType(objectTypeId)}
                    style={{ fontSize: '12px' }}
                  >
                    ✏️
                  </button>
                </div>
              ))}
            <button onClick={handleCreateNewMaterial} style={{ marginTop: '5px' }}>
              + Material
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
        />
      )}
    </>
  );
}
