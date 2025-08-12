import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Stage = dynamic(() => import('react-konva').then(mod => ({ default: mod.Stage })), { ssr: false });
const Layer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Layer })), { ssr: false });

import MapObject from './MapObject';

export default function ObjectTypeEditor({ isOpen, onClose, objectType, updateObjectType, tentativeImages, onSetTentativeImages, onAcceptTentativeImage, onRejectTentativeImage }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [jsonData, setJsonData] = useState('');

  const handleGenerate = async () => {
    const description = objectType.description || '';
    if (!description.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-sprite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description, type: objectType.type }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate sprite');
      }

      const data = await response.json();

      // Set as tentative images (3 options) instead of auto-applying
      onSetTentativeImages(data.options);
    } catch (error) {
      console.error('Error generating sprite:', error);
      alert('Failed to generate sprite. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setIsGenerating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000 }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '500px' }}>
        <h2>Create New {(objectType.type || 'object') === 'material' ? 'Material' : 'Object'}</h2>
        <button onClick={handleClose} style={{ position: 'absolute', top: '10px', right: '10px' }}>×</button>

        <div>
          <label>Describe the {(objectType.type || 'object') === 'material' ? 'material' : 'sprite'}:</label>
          <textarea
            defaultValue={objectType.description || ''}
            onBlur={(e) => updateObjectType({ ...objectType, description: e.target.value })}
            placeholder={(objectType.type || 'object') === 'material' ?
              "e.g., grass texture, stone floor, wooden planks" :
              "e.g., a wooden treasure chest"}
            style={{ width: '100%', height: '80px' }}
          />
        </div>
        <div>
          <label>{(objectType.type || 'object') === 'material' ? 'Material' : 'Object'} Name:</label>
          <input
            type="text"
            defaultValue={objectType.title}
            onBlur={(e) => updateObjectType({ ...objectType, title: e.target.value })}
            placeholder="Enter a name"
            style={{ width: '100%' }}
          />
        </div>

        <button onClick={handleGenerate} disabled={!(objectType.description || '').trim() || isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Sprite'}
        </button>

        {(objectType.type || 'object') !== 'material' && (
          <div>
            <label>Scale:</label>
            <input
              type="text"
              defaultValue={objectType.scale.toString()}
              onBlur={(e) => updateObjectType({ ...objectType, scale: parseFloat(e.target.value) || 0.25 })}
              placeholder="0.25"
              style={{ width: '100%' }}
            />
          </div>
        )}

        <div>
          <label>Offset X:</label>
          <input
            type="text"
            defaultValue={objectType.offsetX.toString()}
            onBlur={(e) => updateObjectType({ ...objectType, offsetX: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label>Offset Y:</label>
          <input
            type="text"
            defaultValue={objectType.offsetY.toString()}
            onBlur={(e) => updateObjectType({ ...objectType, offsetY: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            style={{ width: '100%' }}
          />
        </div>

        {(objectType.type || 'object') !== 'material' && (
          <div>
            <label>Shadow Radius:</label>
            <input
              type="text"
              defaultValue={objectType.shadowRadius.toString()}
              onBlur={(e) => updateObjectType({ ...objectType, shadowRadius: parseFloat(e.target.value) || 0.5 })}
              placeholder="0.5"
              style={{ width: '100%' }}
            />
          </div>
        )}

        {(objectType.type || 'object') !== 'material' && (
          <div>
            <label>Collision Radius:</label>
            <input
              type="text"
              defaultValue={objectType.collisionRadius.toString()}
              onBlur={(e) => updateObjectType({ ...objectType, collisionRadius: parseFloat(e.target.value) || 0.25 })}
              placeholder="0.25"
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* Code Editor Toggle */}
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => {
              if (!showCodeEditor) {
                setJsonData(JSON.stringify(objectType, null, 2));
              }
              setShowCodeEditor(!showCodeEditor);
            }}
            style={{ backgroundColor: '#007bff', color: 'white', padding: '5px 10px' }}
          >
            {showCodeEditor ? 'Hide Code Editor' : 'Show Code Editor'}
          </button>
        </div>

        {/* JSON Code Editor */}
        {showCodeEditor && (
          <div style={{ marginTop: '10px' }}>
            <label>Edit Object Data (JSON):</label>
            <textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              style={{
                width: '100%',
                height: '200px',
                fontFamily: 'monospace',
                fontSize: '12px',
                border: '1px solid #ccc',
                padding: '10px'
              }}
              placeholder="Edit the object data as JSON..."
            />
            <div style={{ marginTop: '5px' }}>
              <button
                onClick={() => {
                  try {
                    const parsedData = JSON.parse(jsonData);
                    updateObjectType(parsedData);
                    alert('Object data updated successfully!');
                  } catch (error) {
                    alert('Invalid JSON: ' + error.message);
                  }
                }}
                style={{ backgroundColor: 'green', color: 'white', marginRight: '10px' }}
              >
                Apply JSON Changes
              </button>
              <button
                onClick={() => setJsonData(JSON.stringify(objectType, null, 2))}
                style={{ backgroundColor: 'orange', color: 'white' }}
              >
                Reset to Current
              </button>
            </div>
          </div>
        )}

        {(objectType.imageData || tentativeImages) && (
          <div>
            <h3>Preview:</h3>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Current Image */}
              {objectType.imageData && (
                <div>
                  <h4>Current:</h4>
                  <Stage
                    width={(objectType.type || 'object') === 'material' ? 36 : objectType.originalWidth * objectType.scale * 1.2}
                    height={(objectType.type || 'object') === 'material' ? 45 : objectType.originalHeight * objectType.scale * 1.5}
                  >
                    <Layer>
                      <MapObject
                        uuid="preview-current"
                        mapObject={{ x: 0, y: 0, objectTypeId: 'preview-current' }}
                        objectType={objectType}
                        playerPosition={{ x: 0, y: 0 }}
                        stageSize={{
                          width: (objectType.type || 'object') === 'material' ? 36 : objectType.originalWidth * objectType.scale * 1.2,
                          height: (objectType.type || 'object') === 'material' ? 45 : objectType.originalHeight * objectType.scale * 1.5
                        }}
                      />
                    </Layer>
                  </Stage>
                </div>
              )}

              {/* Tentative Images (3 options) */}
              {tentativeImages && tentativeImages.map((option, index) => (
                <div key={option.id}>
                  <h4>Option {index + 1}:</h4>
                  <Stage
                    width={(objectType.type || 'object') === 'material' ? 36 : option.originalWidth * objectType.scale * 1.2}
                    height={(objectType.type || 'object') === 'material' ? 45 : option.originalHeight * objectType.scale * 1.5}
                  >
                    <Layer>
                      <MapObject
                        uuid={`preview-option-${option.id}`}
                        mapObject={{ x: 0, y: 0, objectTypeId: `preview-option-${option.id}` }}
                        objectType={{
                          ...objectType,
                          imageData: option.imageData,
                          originalWidth: option.originalWidth,
                          originalHeight: option.originalHeight
                        }}
                        playerPosition={{ x: 0, y: 0 }}
                        stageSize={{
                          width: (objectType.type || 'object') === 'material' ? 36 : option.originalWidth * objectType.scale * 1.2,
                          height: (objectType.type || 'object') === 'material' ? 45 : option.originalHeight * objectType.scale * 1.5
                        }}
                      />
                    </Layer>
                  </Stage>
                  <div style={{ marginTop: '10px' }}>
                    <button
                      onClick={() => onAcceptTentativeImage(option)}
                      style={{ marginRight: '10px', backgroundColor: 'green', color: 'white' }}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Reject all button */}
            {tentativeImages && (
              <div style={{ marginTop: '10px' }}>
                <button onClick={onRejectTentativeImage} style={{ backgroundColor: 'red', color: 'white' }}>
                  Reject All
                </button>
              </div>
            )}
          </div>
        )}

        <button onClick={handleClose}>Cancel</button>
        <button onClick={onClose} disabled={!objectType.title.trim()}>Save Object</button>
      </div>
    </div>
  );
}
