import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Stage = dynamic(() => import('react-konva').then(mod => ({ default: mod.Stage })), { ssr: false });
const Layer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Layer })), { ssr: false });

import MapObject from './MapObject';
import K from '../k';

export default function ElementTypeEditor({ isOpen, onClose, elementType, updateElementType, tentativeImages, onSetTentativeImages, onAcceptTentativeImage, onRejectTentativeImage, onDelete, onGeneratingStart }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleGenerate = async () => {
    const description = elementType.data?.description || '';
    if (!description.trim()) return;

    setIsGenerating(true);
    // Notify parent component that generation has started
    if (onGeneratingStart) {
      onGeneratingStart();
    }

    try {
      const response = await fetch('/api/generate-sprite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description, type: elementType.data.type }),
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

  const handleAcceptImage = async (selectedOption) => {
    setIsUploading(true);
    try {
      // Upload image to Supabase storage
      const uploadResponse = await fetch('/api/upload-element-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: selectedOption.imageData,
          elementTypeId: elementType.id
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      // Update element type without imageUrl (determined dynamically)
      const updatedElementType = {
        ...elementType,
        data: {
          ...elementType.data,
          originalWidth: selectedOption.originalWidth,
          originalHeight: selectedOption.originalHeight
        }
      };
      console.log(updatedElementType)
      onAcceptTentativeImage(updatedElementType);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
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
        <h2>Create New {elementType.data.type === 'stat' ? 'Stat' : elementType.data.type === 'item' ? 'Item' : 'Object'}</h2>
        <button onClick={handleClose} style={{ position: 'absolute', top: '10px', right: '10px' }}>×</button>

        <div>
          <label>Describe the {elementType.data.type === 'stat' ? 'stat icon' : elementType.data.type === 'item' ? 'item' : 'sprite'}:</label>
          <textarea
            defaultValue={elementType.data?.description || ''}
            onBlur={(e) => updateElementType({ ...elementType, data: { ...elementType.data, description: e.target.value } })}
            placeholder={
              elementType.data.type === 'stat' ?
                "e.g., health bar icon, energy meter, strength symbol" :
              elementType.data.type === 'item' ?
                "e.g., wooden log, dollar bill, cup of water" :
                "e.g., a wooden treasure chest"
            }
            style={{ width: '100%', height: '80px' }}
          />
        </div>
        <div>
          <label>{elementType.data.type === 'stat' ? 'Stat' : elementType.data.type === 'item' ? 'Item' : 'Object'} Name:</label>
          <input
            type="text"
            defaultValue={elementType.data?.title}
            onBlur={(e) => updateElementType({ ...elementType, data: { ...elementType.data, title: e.target.value } })}
            placeholder={
              elementType.data.type === 'stat' ?
                "e.g., Health, Energy, Thirst, Strength" :
              elementType.data.type === 'item' ?
                "e.g., Log, Dollar, Cup of Water" :
                "Enter a name"
            }
            style={{ width: '100%' }}
          />
        </div>

        <button onClick={handleGenerate} disabled={!(elementType.data.description || '').trim() || isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Sprite'}
        </button>

        <div>
          <label>Width (grid units):</label>
          <input
            type="text"
            defaultValue={(elementType.data?.width || 1).toString()}
            onBlur={(e) => updateElementType({ ...elementType, data: { ...elementType.data, width: parseFloat(e.target.value) || 1 } })}
            placeholder="1"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label>Offset X:</label>
          <input
            type="text"
            defaultValue={(elementType.data?.offsetX || 0).toString()}
            onBlur={(e) => updateElementType({ ...elementType, data: { ...elementType.data, offsetX: parseFloat(e.target.value) || 0 } })}
            placeholder="0"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label>Offset Y:</label>
          <input
            type="text"
            defaultValue={(elementType.data?.offsetY || 0).toString()}
            onBlur={(e) => updateElementType({ ...elementType, data: { ...elementType.data, offsetY: parseFloat(e.target.value) || 0 } })}
            placeholder="0"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label>Shadow Radius:</label>
          <input
            type="text"
            defaultValue={(elementType.data?.shadowRadius || 0.5).toString()}
            onBlur={(e) => updateElementType({ ...elementType, data: { ...elementType.data, shadowRadius: parseFloat(e.target.value) || 0.5 } })}
            placeholder="0.5"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label>Collision Radius:</label>
          <input
            type="text"
            defaultValue={(elementType.data?.collisionRadius || 0.25).toString()}
            onBlur={(e) => updateElementType({ ...elementType, data: { ...elementType.data, collisionRadius: parseFloat(e.target.value) || 0.25 } })}
            placeholder="0.25"
            style={{ width: '100%' }}
          />
        </div>

        {/* Code Editor Toggle */}
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => {
              if (!showCodeEditor) {
                setJsonData(JSON.stringify(elementType, null, 2));
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
            <label>Edit Element Data (JSON):</label>
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
              placeholder="Edit the element data as JSON..."
            />
            <div style={{ marginTop: '5px' }}>
              <button
                onClick={() => {
                  try {
                    const parsedData = JSON.parse(jsonData);
                    updateElementType(parsedData);
                    alert('Element data updated successfully!');
                  } catch (error) {
                    alert('Invalid JSON: ' + error.message);
                  }
                }}
                style={{ backgroundColor: 'green', color: 'white', marginRight: '10px' }}
              >
                Apply JSON Changes
              </button>
              <button
                onClick={() => setJsonData(JSON.stringify(elementType, null, 2))}
                style={{ backgroundColor: 'orange', color: 'white' }}
              >
                Reset to Current
              </button>
            </div>
          </div>
        )}

        {(elementType.id || tentativeImages) && (
          <div>
            <h3>Preview:</h3>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Current Image */}
              {elementType.id && (
                <div>
                  <h4>Current:</h4>
                  <Stage
                    width={K.gridSize * (elementType.data.width || 1)}
                    height={K.gridSize * (elementType.data.width || 1) * ((elementType.data.originalHeight || 32) / (elementType.data.originalWidth || 32))}
                  >
                    <Layer>
                      <MapObject
                        elementId="preview-current"
                        elementTypeId="preview-current"
                        x={0}
                        y={0}
                        elementType={elementType}
                        playerPosition={{ x: 0, y: 0 }}
                        stageSize={{
                          width: K.gridSize * (elementType.data.width || 1),
                          height: K.gridSize * (elementType.data.width || 1) * ((elementType.data.originalHeight || 32) / (elementType.data.originalWidth || 32))
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
                    width={K.gridSize * (elementType.data.width || 1)}
                    height={K.gridSize * (elementType.data.width || 1) * (option.originalHeight / option.originalWidth)}
                  >
                    <Layer>
                      <MapObject
                        elementId={`preview-option-${option.id}`}
                        elementTypeId={`preview-option-${option.id}`}
                        x={0}
                        y={0}
                        elementType={{
                          ...elementType,
                          data: {
                            ...elementType.data,
                            imageData: option.imageData,
                            originalWidth: option.originalWidth,
                            originalHeight: option.originalHeight
                          }
                        }}
                        playerPosition={{ x: 0, y: 0 }}
                        stageSize={{
                          width: K.gridSize * (elementType.data.width || 1),
                          height: K.gridSize * (elementType.data.width || 1) * (option.originalHeight / option.originalWidth)
                        }}
                      />
                    </Layer>
                  </Stage>
                  <div style={{ marginTop: '10px' }}>
                    <button
                      onClick={() => handleAcceptImage(option)}
                      disabled={isUploading}
                      style={{ marginRight: '10px', backgroundColor: 'green', color: 'white' }}
                    >
                      {isUploading ? 'Uploading...' : 'Accept'}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this element type? This action cannot be undone.')) {
                  onDelete && onDelete(elementType.id);
                }
              }}
              style={{ backgroundColor: '#dc3545', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', marginRight: '10px' }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
