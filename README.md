# RPG Game Platform

A platform that allows users to create top-down-perspective RPG games without writing code.

## Game Data Schema

```javascript
game = {
  id: string,
  user_id: string,
  title: string,
  map: {
    elements: {
      [elementId]: [elementTypeId, x, y] // Token-optimized storage: [type, x, y]
    },
    boundaryPolygon: [[x1, y1], [x2, y2], ...] // Array of coordinate pairs defining map boundary
  },
  background: {
    [id]: { // ID starting with 1
      type: 'path', // Polygon type
      fill: string, // Fill color (e.g., 'gray', '#ff0000')
      points: [[x, y], [x, y], ...] // Array of coordinate pairs defining polygon shape
    }
  },
  element_type_ids: [elementTypeId1, elementTypeId2, ...] // References to element types
}
```

## Element Types Schema

```javascript
elementTypes = {
  [elementTypeId]: {
    id: elementTypeId,
    data: {
      title: string,
      imageDescription: string, // Description of the image for generation
      imageData: string, // Base64 string - ChatGPT-generated image or preview
      originalWidth: number, // Width of imageData in pixels
      originalHeight: number, // Height of imageData in pixels
      width: number, // Display width in grid units (K.gridSize = 20px)
      offsetX: number, // X offset in grid units
      offsetY: number, // Y offset in grid units
      collisionRadius: number, // Collision radius in grid units
      shadowRadius: number, // Shadow ellipse radius multiplier
      type: string // Element type identifier ('object', 'item', 'stat')
    }
  }
}
```

## Key Files

### Core Components
- **`src/components/Map.js`** - Main map rendering, player movement, boundary collision detection, boundary editing
- **`src/components/HUD.js`** - Game editing interface, element type management, drag-to-create functionality
- **`src/components/MapObject.js`** - Individual map element rendering and interaction
- **`src/components/ElementTypeEditor.js`** - Element type creation and editing interface
- **`src/components/Player.js`** - Player character rendering

### Pages
- **`src/pages/index.js`** - Home page with game listing and create game functionality
- **`src/pages/games/[gameId].js`** - Main game page with map and HUD integration
- **`src/pages/login.js`** - Authentication page

### API Routes
- **`src/pages/api/generate-sprite.js`** - ChatGPT image generation for element types
- **`src/pages/api/upload-element-image.js`** - Supabase storage upload for element images

### Configuration
- **`src/k.js`** - Global constants (grid size, etc.)
- **`src/lib/supabase.js`** - Supabase client configuration
