import OpenAI from 'openai';
var sharp = require('sharp');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Game styles
const gameStyles = {
  "minimalist watercolor": "flat minimalist style - watercolor print aesthetic",
  "low poly cartoon": "low-poly game map element - no stroke/border"
};

// Common prompt components
const baseStyle = "muted colors\nno strokes/gradients/textures\njust polygons\nbirds-eye top-down perspective like Pokemon/stardew valley";
const objectLighting = "afternoon sunlight coming from the top-left of the image\nmature elegant positive professional";
const transparentCanvas = "IMPORTANT: Use a completely transparent background (no black, no white, just transparent).\nCenter the object taking up most of the canvas space. 1024x1024 image.\nNo platform/ground/tile object at the base (we'll be placing what is generated on a texture of our own so it needs to just be the object with lighting coming from top-left)";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { description, type = 'object', count = 3 } = req.body;

    // Different prompts for different object types using "low poly cartoon" style
    let imagePrompt;
    const style = gameStyles["low poly cartoon"];

    if (type === 'material') {
      imagePrompt = `seamless tileable texture/material pattern for 2d game
${description}
${style}
${baseStyle}
Fill the entire 1024x1024 canvas edge to edge
satisfying
no building`;
    } else if (type === 'stat') {
      imagePrompt = `flat minimalist 2d game UI icon for player statistics - low poly cartoon style
${description}
clean simple icon design
${baseStyle}
clear readable symbol design
professional game UI aesthetic
${transparentCanvas}
Simple recognizable symbol for game HUD display`;
    } else if (type === 'item') {
      imagePrompt = `flat minimalist 2d game inventory item - low poly cartoon style
${description}
collectible item design
${baseStyle} items
clear recognizable object
${objectLighting}
${transparentCanvas}`;
    } else {
      imagePrompt = `${style}
${description}
${baseStyle}
head-on, not-isometric, not from a corner perspective
${objectLighting} technical
just see the front and the top of objects
${transparentCanvas}`;
    }

    // Generate the requested number of images in parallel
    const promises = Array(count).fill().map(() =>
      openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt
      })
    );

    const results = await Promise.all(promises);

    // Process all generated images
    const options = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const image_base64 = result.data[0].b64_json;
      const imageBuffer = Buffer.from(image_base64, 'base64');

      if (type === 'material') {
        // For materials, don't crop - use the full image
        const fullImageBase64 = `data:image/png;base64,${image_base64}`;

        options.push({
          id: i,
          imageData: fullImageBase64,
          originalWidth: 1024,
          originalHeight: 1024
        });
      } else {
        // For objects, do the cropping as before
        // Process image with Sharp: find content bounds and crop
        const { data, info } = await sharp(imageBuffer)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        // Find bounding box of non-transparent pixels
        let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
        let hasContent = false;

        for (let y = 0; y < info.height; y++) {
          for (let x = 0; x < info.width; x++) {
            const index = (y * info.width + x) * 4;
            const alpha = data[index + 3];

            if (alpha > 50) { // Consider pixels with some opacity as content
              hasContent = true;
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        // Calculate crop dimensions
        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;

        // Create the cropped image (preserving original resolution)
        const croppedBuffer = await sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        })
          .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
          .png()
          .toBuffer();

        const croppedImageBase64 = `data:image/png;base64,${croppedBuffer.toString('base64')}`;

        options.push({
          id: i,
          imageData: croppedImageBase64,
          originalWidth: hasContent ? (maxX - minX + 1) : 50,
          originalHeight: hasContent ? (maxY - minY + 1) : 50
        });
      }
    }

    res.status(200).json({ options });

  } catch (error) {
    console.error('Error generating sprite:', error);
    res.status(500).json({
      error: 'Failed to generate sprite',
      details: error.message
    });
  }
}
