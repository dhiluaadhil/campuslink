const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Upload a file buffer to Supabase Storage.
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} originalname - Original filename (used for extension)
 * @param {string} folder - Storage folder: 'avatars' | 'posts'
 * @returns {string} Public URL of the uploaded file
 */
const uploadToSupabase = async (buffer, originalname, folder = 'posts') => {
  const ext = path.extname(originalname) || '.jpg';
  const filename = `${folder}/${uuidv4()}${ext}`;

  const { error } = await supabase.storage
    .from('campuslink')
    .upload(filename, buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from('campuslink').getPublicUrl(filename);
  return data.publicUrl;
};

module.exports = { supabase, uploadToSupabase };
