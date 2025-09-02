import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Stage = dynamic(() => import('react-konva').then(mod => ({ default: mod.Stage })), { ssr: false });
const Layer = dynamic(() => import('react-konva').then(mod => ({ default: mod.Layer })), { ssr: false });

import MapObject from './MapObject';
import K from '../k';

export default function ElementTypeEditor({ isOpen, onClose, elementType, updateElementType, tentativeImages, onSetTentativeImages, onAcceptTentativeImage, onRejectTentativeImage, onDelete, onGeneratingStart, elementTypes, updateGame, stateRef, userProfile, session }) {
  const [activeGenerations, setActiveGenerations] = useState(0);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleGenerate = async () => {
    const imageDescription = elementType.data.imageDescription || '';
    if (!imageDescription.trim()) return;

    // Increment active generations counter
    setActiveGenerations(prev => prev + 1);

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
        body: JSON.stringify({
          description: imageDescription,
          type: elementType.data.type,
          count: 1, // Generate only 1 option per click
          userId: session?.user?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate sprite');
      }

      const data = await response.json();

      // Add new options to existing tentative images instead of replacing them
      const newOptions = data.options || [data]; // Handle both single and multiple option responses
      const existingOptions = tentativeImages || [];
      const combinedOptions = [...existingOptions, ...newOptions];

      onSetTentativeImages(combinedOptions);
    } catch (error) {
      console.error('Error generating sprite:', error);
      alert('Failed to generate sprite. Please try again.');
    } finally {
      // Decrement active generations counter
      setActiveGenerations(prev => prev - 1);
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
          originalHeight: selectedOption.originalHeight,
          imageTimestamp: Date.now() // Add timestamp for cache busting
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
    setActiveGenerations(0);
    onClose();
  };

  // Handle escape key and click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleClickOutside = (e) => {
      // Check if click is on the backdrop (not on the modal content)
      if (e.target.style.backgroundColor === 'rgba(0, 0, 0, 0.8)') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000 }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '500px' }}>
        <h2>Create New {elementType.data.type === 'stat' ? 'Stat' : elementType.data.type === 'item' ? 'Item' : 'Object'}</h2>
        <button onClick={handleClose} style={{ position: 'absolute', top: '10px', right: '10px' }}>×</button>

        <div>
          <label>Describe the {elementType.data.type === 'stat' ? 'stat icon' : elementType.data.type === 'item' ? 'item' : 'sprite'}:</label>
          <textarea
            defaultValue={elementType.data?.imageDescription || ''}
            onBlur={(e) => updateElementType({ ...elementType, data: { ...elementType.data, imageDescription: e.target.value } })}
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
          <label>Type:</label>
          <select
            value={elementType.data.type || 'object'}
            onChange={(e) => updateElementType({ ...elementType, data: { ...elementType.data, type: e.target.value } })}
            style={{ width: '100%', marginBottom: '10px' }}
          >
            <option value="object">Object</option>
            <option value="plant">Plant</option>
            <option value="building">Buildable</option>
            <option value="tool">Tool</option>
            <option value="item">Item</option>
            <option value="stat">Stat</option>
          </select>
        </div>

        <div>
          <label>{elementType.data.type === 'stat' ? 'Stat' : elementType.data.type === 'item' ? 'Item' : elementType.data.type === 'tool' ? 'Tool' : elementType.data.type === 'plant' ? 'Plant' : elementType.data.type === 'building' ? 'Building' : 'Object'} Name:</label>
          <input
            type="text"
            defaultValue={elementType.data?.title}
            onBlur={(e) => updateElementType({ ...elementType, data: { ...elementType.data, title: e.target.value } })}
            placeholder={
              elementType.data.type === 'stat' ?
                "e.g., Health, Energy, Thirst, Strength" :
              elementType.data.type === 'item' ?
                "e.g., Log, Dollar, Cup of Water" :
              elementType.data.type === 'tool' ?
                "e.g., Axe, Hammer, Fishing Rod" :
              elementType.data.type === 'plant' ?
                "e.g., Oak Tree, Rose Bush, Wheat" :
              elementType.data.type === 'building' ?
                "e.g., House, Shop, Barn" :
                "Enter a name"
            }
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <button onClick={handleGenerate} disabled={!(elementType.data.imageDescription || '').trim()}>
            {activeGenerations > 0 ? `Generating... (${activeGenerations})` : 'Generate 1 Option'}
          </button>
          <span style={{ fontSize: '12px', color: '#666' }}>
            (-{K.spriteGenerationCost} credits)
          </span>
          {userProfile && (
            <span style={{ fontSize: '12px', color: '#333', fontWeight: 'bold' }}>
              {userProfile.credits} credits available
            </span>
          )}
          {tentativeImages && tentativeImages.length > 0 && (
            <span style={{ fontSize: '12px', color: '#666' }}>
              {tentativeImages.length} option{tentativeImages.length !== 1 ? 's' : ''} generated
            </span>
          )}
        </div>

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

        <div>
          <label>Price (for buying/selling):</label>
          <input
            type="text"
            defaultValue={(elementType.data?.price || 0).toString()}
            onBlur={(e) => updateElementType({ ...elementType, data: { ...elementType.data, price: parseFloat(e.target.value) || 0 } })}
            placeholder="0"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label>Actions:</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="checkbox"
                checked={elementType.data?.actions?.craft === 1}
                onChange={(e) => updateElementType({
                  ...elementType,
                  data: {
                    ...elementType.data,
                    actions: {
                      ...elementType.data.actions,
                      craft: e.target.checked ? 1 : 0
                    }
                  }
                })}
              />
              Craft
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="checkbox"
                checked={elementType.data?.actions?.sell === 1}
                onChange={(e) => updateElementType({
                  ...elementType,
                  data: {
                    ...elementType.data,
                    actions: {
                      ...elementType.data.actions,
                      sell: e.target.checked ? 1 : 0
                    }
                  }
                })}
              />
              Sell
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="checkbox"
                checked={elementType.data?.actions?.buy === 1}
                onChange={(e) => updateElementType({
                  ...elementType,
                  data: {
                    ...elementType.data,
                    actions: {
                      ...elementType.data.actions,
                      buy: e.target.checked ? 1 : 0
                    }
                  }
                })}
              />
              Buy
            </label>
          </div>

          {elementType.data?.type === 'item' && (
            <div style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <label>Craft Output Quantity:</label>
              <input
                type="number"
                value={elementType.data?.craftingOutputQuantity || 1}
                onChange={(e) => updateElementType({
                  ...elementType,
                  data: {
                    ...elementType.data,
                    craftingOutputQuantity: parseInt(e.target.value) || 1
                  }
                })}
                placeholder="1"
                style={{ width: '80px', marginLeft: '10px' }}
                min="1"
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                How many items are produced when crafted (e.g., 8 planks from 1 log)
              </div>
            </div>
          )}

          {elementType.data?.type === 'item' && (
            <div style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <label>Crafting Time (seconds):</label>
              <input
                type="number"
                value={elementType.data?.craftingTime || 0}
                onChange={(e) => updateElementType({
                  ...elementType,
                  data: {
                    ...elementType.data,
                    craftingTime: parseInt(e.target.value) || 0
                  }
                })}
                placeholder="0"
                style={{ width: '80px', marginLeft: '10px' }}
                min="0"
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                Time in seconds to craft this item (0 = instant)
              </div>
            </div>
          )}

          {(elementType.data?.type === 'item' || elementType.data?.type === 'tool' || elementType.data?.type === 'stat') && (
            <div style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <label>Initial Inventory Quantity:</label>
              <input
                type="number"
                value={elementType.data?.initialInventoryQuantity || 0}
                onChange={(e) => updateElementType({
                  ...elementType,
                  data: {
                    ...elementType.data,
                    initialInventoryQuantity: parseInt(e.target.value) || 0
                  }
                })}
                placeholder="0"
                style={{ width: '80px', marginLeft: '10px' }}
                min="0"
              />
              <button
                onClick={async () => {
                  const quantity = elementType.data?.initialInventoryQuantity || 0;
                  if (quantity === 0) {
                    alert('Set an initial inventory quantity first.');
                    return;
                  }

                  if (!confirm(`This will set all existing players' inventory of "${elementType.data?.title}" to ${quantity}. Are you sure?`)) {
                    return;
                  }

                  try {
                    const currentGame = stateRef.current.game;
                    const updatedPlayers = { ...currentGame.players };

                    Object.keys(updatedPlayers).forEach(playerId => {
                      if (!updatedPlayers[playerId].inventory) {
                        updatedPlayers[playerId].inventory = {};
                      }
                      updatedPlayers[playerId].inventory[elementType.id] = quantity;
                    });

                    await updateGame({ ...currentGame, players: updatedPlayers });
                    alert(`Successfully updated all players' ${elementType.data?.title} inventory to ${quantity}!`);
                  } catch (error) {
                    console.error('Error overriding inventory:', error);
                    alert('Failed to override inventory. Please try again.');
                  }
                }}
                style={{ backgroundColor: '#dc3545', color: 'white', padding: '5px 10px', fontSize: '12px', marginLeft: '10px' }}
              >
                Override All Players
              </button>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {elementType.data?.type === 'tool' ? 'Starting tools for new players' :
                 elementType.data?.type === 'stat' ? 'Starting stat values for new players' :
                 'Starting items for new players'}
              </div>
            </div>
          )}
        </div>

        {elementType.data?.type === 'item' && (
          <div>
            <label>Crafting Requirements (what's needed to craft this item):</label>
            <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '5px' }}>
              {Object.entries(elementType.data?.craftingRequirements || {}).map(([reqElementTypeId, quantity]) => {
                const reqElementType = elementTypes?.[reqElementTypeId];
                const reqElementName = reqElementType?.data?.title || `Unknown Item (ID: ${reqElementTypeId})`;
                return (
                  <div key={reqElementTypeId} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', minWidth: '150px' }}>
                      {reqElementName}
                    </span>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        const newRequirements = { ...elementType.data.craftingRequirements };
                        if (parseInt(e.target.value) > 0) {
                          newRequirements[reqElementTypeId] = parseInt(e.target.value);
                        } else {
                          delete newRequirements[reqElementTypeId];
                        }
                        updateElementType({
                          ...elementType,
                          data: {
                            ...elementType.data,
                            craftingRequirements: newRequirements
                          }
                        });
                      }}
                      style={{ width: '60px' }}
                      min="0"
                    />
                    <button
                      onClick={() => {
                        const newRequirements = { ...elementType.data.craftingRequirements };
                        delete newRequirements[reqElementTypeId];
                        updateElementType({
                          ...elementType,
                          data: {
                            ...elementType.data,
                            craftingRequirements: newRequirements
                          }
                        });
                      }}
                      style={{ backgroundColor: 'red', color: 'white', padding: '2px 6px', fontSize: '12px' }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                <select
                  id={`craft-req-select-${elementType.id}`}
                  style={{ width: '150px' }}
                  defaultValue=""
                >
                  <option value="">Select item...</option>
                  {elementTypes && Object.entries(elementTypes)
                    .filter(([id, et]) => et.data?.type === 'item' && id !== elementType.id.toString())
                    .map(([id, et]) => (
                      <option key={id} value={id}>
                        {et.data?.title || `Item ${id}`}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  placeholder="Quantity"
                  id={`craft-req-qty-${elementType.id}`}
                  style={{ width: '80px' }}
                  min="1"
                />
                <button
                  onClick={() => {
                    const selectInput = document.getElementById(`craft-req-select-${elementType.id}`);
                    const qtyInput = document.getElementById(`craft-req-qty-${elementType.id}`);
                    const elementTypeId = selectInput.value;
                    const quantity = parseInt(qtyInput.value);

                    if (elementTypeId && quantity > 0) {
                      const newRequirements = {
                        ...elementType.data.craftingRequirements,
                        [elementTypeId]: quantity
                      };
                      updateElementType({
                        ...elementType,
                        data: {
                          ...elementType.data,
                          craftingRequirements: newRequirements
                        }
                      });
                      selectInput.value = '';
                      qtyInput.value = '';
                    }
                  }}
                  style={{ backgroundColor: 'green', color: 'white', padding: '5px 10px', fontSize: '12px' }}
                >
                  Add Requirement
                </button>
              </div>
            </div>
          </div>
        )}

        {(elementType.data?.type === 'object' || elementType.data?.type === 'plant' || elementType.data?.type === 'building') && (
          <div>
            <label>Tools:</label>
            <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '5px' }}>
              {Object.entries(elementType.data?.toolData || {}).map(([toolElementTypeId, toolConfig]) => {
                const toolElementType = elementTypes?.[toolElementTypeId];
                const toolName = toolElementType?.data?.title || `Unknown Tool (ID: ${toolElementTypeId})`;
                const newElementType = elementTypes?.[toolConfig.newElementTypeId];
                const newElementName = newElementType?.data?.title || `Unknown Element (ID: ${toolConfig.newElementTypeId})`;

                return (
                  <div key={toolElementTypeId} style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      Tool: {toolName}
                    </div>

                    <div style={{ marginBottom: '5px' }}>
                      <label>Transforms into:</label>
                      <select
                        value={toolConfig.newElementTypeId || ''}
                        onChange={(e) => {
                          const newToolData = { ...elementType.data.toolData };
                          newToolData[toolElementTypeId] = {
                            ...newToolData[toolElementTypeId],
                            newElementTypeId: e.target.value
                          };
                          updateElementType({
                            ...elementType,
                            data: {
                              ...elementType.data,
                              toolData: newToolData
                            }
                          });
                        }}
                        style={{ width: '200px', marginLeft: '10px' }}
                      >
                        <option value="">Select element...</option>
                        {elementTypes && Object.entries(elementTypes)
                          .filter(([id, et]) => id !== elementType.id.toString())
                          .map(([id, et]) => (
                            <option key={id} value={id}>
                              {et.data?.title || `Element ${id}`} ({et.data?.type || 'object'})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: '5px' }}>
                      <label>Cost:</label>
                      <div style={{ marginLeft: '20px', marginTop: '5px' }}>
                        {Object.entries(toolConfig.cost || {}).map(([costElementTypeId, costAmount]) => {
                          const costElementType = elementTypes?.[costElementTypeId];
                          const costElementName = costElementType?.data?.title || `Unknown Element (ID: ${costElementTypeId})`;
                          return (
                            <div key={costElementTypeId} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                              <span style={{ fontSize: '12px', minWidth: '120px' }}>
                                {costElementName}
                              </span>
                              <input
                                type="number"
                                value={costAmount}
                                onChange={(e) => {
                                  const newToolData = { ...elementType.data.toolData };
                                  const newCost = { ...newToolData[toolElementTypeId].cost };
                                  if (parseInt(e.target.value) !== 0) {
                                    newCost[costElementTypeId] = parseInt(e.target.value);
                                  } else {
                                    delete newCost[costElementTypeId];
                                  }
                                  newToolData[toolElementTypeId] = {
                                    ...newToolData[toolElementTypeId],
                                    cost: newCost
                                  };
                                  updateElementType({
                                    ...elementType,
                                    data: {
                                      ...elementType.data,
                                      toolData: newToolData
                                    }
                                  });
                                }}
                                style={{ width: '60px' }}
                                placeholder="0"
                              />
                              <span style={{ fontSize: '12px', color: '#666' }}>
                                (negative = lose, positive = gain)
                              </span>
                              <button
                                onClick={() => {
                                  const newToolData = { ...elementType.data.toolData };
                                  const newCost = { ...newToolData[toolElementTypeId].cost };
                                  delete newCost[costElementTypeId];
                                  newToolData[toolElementTypeId] = {
                                    ...newToolData[toolElementTypeId],
                                    cost: newCost
                                  };
                                  updateElementType({
                                    ...elementType,
                                    data: {
                                      ...elementType.data,
                                      toolData: newToolData
                                    }
                                  });
                                }}
                                style={{ backgroundColor: 'red', color: 'white', padding: '2px 6px', fontSize: '12px' }}
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                          <select
                            id={`tool-cost-select-${elementType.id}-${toolElementTypeId}`}
                            style={{ width: '150px' }}
                            defaultValue=""
                          >
                            <option value="">Add cost element...</option>
                            {elementTypes && Object.entries(elementTypes)
                              .filter(([id, et]) => et.data?.type === 'item' || et.data?.type === 'stat')
                              .map(([id, et]) => (
                                <option key={id} value={id}>
                                  {et.data?.title || `Element ${id}`} ({et.data?.type})
                                </option>
                              ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Amount"
                            id={`tool-cost-amount-${elementType.id}-${toolElementTypeId}`}
                            style={{ width: '80px' }}
                          />
                          <button
                            onClick={() => {
                              const selectInput = document.getElementById(`tool-cost-select-${elementType.id}-${toolElementTypeId}`);
                              const amountInput = document.getElementById(`tool-cost-amount-${elementType.id}-${toolElementTypeId}`);
                              const costElementTypeId = selectInput.value;
                              const amount = parseInt(amountInput.value);

                              if (costElementTypeId && amount !== 0) {
                                const newToolData = { ...elementType.data.toolData };
                                const newCost = {
                                  ...newToolData[toolElementTypeId].cost,
                                  [costElementTypeId]: amount
                                };
                                newToolData[toolElementTypeId] = {
                                  ...newToolData[toolElementTypeId],
                                  cost: newCost
                                };
                                updateElementType({
                                  ...elementType,
                                  data: {
                                    ...elementType.data,
                                    toolData: newToolData
                                  }
                                });
                                selectInput.value = '';
                                amountInput.value = '';
                              }
                            }}
                            style={{ backgroundColor: 'green', color: 'white', padding: '5px 10px', fontSize: '12px' }}
                          >
                            Add Cost
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const newToolData = { ...elementType.data.toolData };
                        delete newToolData[toolElementTypeId];
                        updateElementType({
                          ...elementType,
                          data: {
                            ...elementType.data,
                            toolData: newToolData
                          }
                        });
                      }}
                      style={{ backgroundColor: 'red', color: 'white', padding: '5px 10px', fontSize: '12px' }}
                    >
                      Remove Tool
                    </button>
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                <select
                  id={`tool-select-${elementType.id}`}
                  style={{ width: '200px' }}
                  defaultValue=""
                >
                  <option value="">Add tool...</option>
                  {elementTypes && Object.entries(elementTypes)
                    .filter(([id, et]) => et.data?.type === 'tool')
                    .map(([id, et]) => (
                      <option key={id} value={id}>
                        {et.data?.title || `Tool ${id}`}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    const selectInput = document.getElementById(`tool-select-${elementType.id}`);
                    const toolElementTypeId = selectInput.value;

                    if (toolElementTypeId) {
                      const newToolData = {
                        ...elementType.data.toolData,
                        [toolElementTypeId]: {
                          cost: {},
                          newElementTypeId: ''
                        }
                      };
                      updateElementType({
                        ...elementType,
                        data: {
                          ...elementType.data,
                          toolData: newToolData
                        }
                      });
                      selectInput.value = '';
                    }
                  }}
                  style={{ backgroundColor: 'green', color: 'white', padding: '5px 10px', fontSize: '12px' }}
                >
                  Add Tool
                </button>
              </div>
            </div>
          </div>
        )}

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
