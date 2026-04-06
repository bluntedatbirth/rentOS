/**
 * Run this script once to create the 'contracts' storage bucket in Supabase.
 *
 * Usage: npx tsx scripts/setup-storage.ts
 *
 * Or create it manually in the Supabase Dashboard:
 * 1. Go to Storage → New Bucket
 * 2. Name: "contracts"
 * 3. Public: Yes (for file URL access)
 * 4. File size limit: 20MB
 * 5. Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  // Create the bucket
  const { data, error } = await supabase.storage.createBucket('contracts', {
    public: true,
    fileSizeLimit: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✓ Bucket "contracts" already exists');
    } else {
      console.error('✗ Failed to create bucket:', error.message);
      process.exit(1);
    }
  } else {
    console.log('✓ Created bucket:', data.name);
  }
}

main();
