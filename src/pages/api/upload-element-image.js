import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for file uploads
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData, elementTypeId } = req.body;

    if (!imageData || !elementTypeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate filename
    const filename = `${elementTypeId}/image.png`;

    // Upload to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from('element_types')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('element_types')
      .getPublicUrl(filename);

    return res.status(200).json({
      success: true,
      imageUrl: publicUrl,
      path: data.path
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Increase body size limit for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
