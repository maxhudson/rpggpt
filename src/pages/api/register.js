import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { firstName, lastName, email, userId } = req.body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    // Confirm user with userId exists as well
    var user = await supabase.auth.admin.getUserById(userId);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (!data) {
      await supabase.from('profiles').insert({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email,
        credits: 100, // Starting credits for RPG platform
        settings: {}, // JSON column for user settings
        created_at: (new Date()).toISOString()
      });
    }

    res.status(200).json({});
  }
}
