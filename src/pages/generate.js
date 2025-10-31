import { useState } from 'react';
import { useRouter } from 'next/router';

export default function GenerateSprite() {
  const [description, setDescription] = useState('');
  const [type, setType] = useState('object');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const response = await fetch('/api/generate-sprite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description,
          type: type,
          count: 1,
          skipCredits: true // Skip credit check for one-off generation
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate sprite');
      }

      const data = await response.json();
      const option = data.options[0];

      setGeneratedImage(option);
    } catch (err) {
      console.error('Error generating sprite:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage.imageData;
    link.download = `sprite-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ marginTop: 0, marginBottom: '8px' }}>Sprite Generator</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Generate game sprites using AI. Describe what you want to create.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Sprite Type:
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              width: '100%',
              color: 'black',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontFamily: 'inherit',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
            disabled={generating}
          >
            <option value="object">Object (Trees, Buildings, Furniture)</option>
            <option value="item">Item (Collectibles, Tools, Consumables)</option>
            <option value="character">Character (People, Animals)</option>
            <option value="material">Material (Tileable Textures)</option>
            <option value="stat">Stat Icon (UI Icons for Health, Energy, etc.)</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Description:
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              type === 'object' ? "e.g., oak tree, wooden cabin, workbench" :
              type === 'item' ? "e.g., red apple, iron sword, health potion" :
              type === 'character' ? "e.g., medieval knight, forest deer, village farmer" :
              type === 'material' ? "e.g., grass texture, stone path, wooden floor" :
              type === 'stat' ? "e.g., heart icon for health, lightning bolt for energy" :
              "Describe what you want to generate"
            }
            style={{
              width: '100%',
              color: 'black',
              height: '120px',
              padding: '12px',
              fontSize: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            disabled={generating}
          />
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating || !description.trim()}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            color: 'white',
            backgroundColor: generating ? '#999' : '#007bff',
            border: 'none',
            borderRadius: '8px',
            cursor: generating || !description.trim() ? 'not-allowed' : 'pointer',
            marginBottom: '30px'
          }}
        >
          {generating ? 'Generating...' : 'Generate Sprite'}
        </button>

        {generatedImage && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Generated Sprite:</h2>

            <div style={{
              display: 'inline-block',
              padding: '20px',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <img
                src={generatedImage.imageData}
                alt="Generated sprite"
                style={{
                  display: 'block',
                  maxWidth: '512px',
                  maxHeight: '512px',
                  imageRendering: 'pixelated'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
              <p style={{ margin: '4px 0' }}>
                <strong>Dimensions:</strong> {generatedImage.originalWidth} × {generatedImage.originalHeight}px
              </p>
            </div>

            <button
              onClick={handleDownload}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                backgroundColor: '#28a745',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Download Image
            </button>

            <button
              onClick={() => {
                setGeneratedImage(null);
                setDescription('');
              }}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#666',
                backgroundColor: '#f0f0f0',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Generate Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
