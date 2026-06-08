const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const ws = require('ws');

// Use service role key for server-side storage writes.
// The anon key is read-only on protected buckets and will cause upload failures.
// Pass ws transport for Node.js < 22 compatibility (no native WebSocket).
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  { realtime: { transport: ws } }
);

/**
 * Upload a file buffer to Supabase Storage.
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} originalname - Original filename (used for extension)
 * @param {string} folder - Storage folder: 'avatars' | 'posts'
 * @returns {string} Public URL of the uploaded file
 */
const uploadToSupabase = async (buffer, originalname, folder = 'posts', mimetype = null) => {
  const ext = path.extname(originalname) || '.jpg';
  const filename = `${folder}/${uuidv4()}${ext}`;

  // Derive content type from extension if mimetype is not provided
  const extToMime = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  const contentType = mimetype || extToMime[ext.toLowerCase()] || 'image/jpeg';

  const { error } = await supabase.storage
    .from('campuslink')
    .upload(filename, buffer, {
      contentType,
      upsert: false,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from('campuslink').getPublicUrl(filename);
  return data.publicUrl;
};

module.exports = { supabase, uploadToSupabase };
