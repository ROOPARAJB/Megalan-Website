import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;

console.log('Connecting to Supabase at:', url);

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

async function main() {
  try {
    // Check if products table exists
    const { data: products, error: prodError } = await supabase.from('products').select('*').limit(5);

    if (prodError) {
      console.log('Products table check result:', prodError.message);
      if (prodError.message.includes('relation "public.products" does not exist') || prodError.code === '42P01') {
        console.log('Tables do not exist yet. Need to run schema.');
      }
    } else {
      console.log(`✓ Products table found! Rows count: ${products.length}`);
      if (products.length > 0) {
        console.log('Sample product:', products[0].slug, '-', products[0].name_en);
      }
    }

    // Check gallery
    const { data: gallery, error: galError } = await supabase.from('gallery').select('*').limit(5);
    if (!galError) {
      console.log(`✓ Gallery table found! Rows count: ${gallery.length}`);
    }

    // Check inquiries
    const { data: inquiries, error: inqError } = await supabase.from('inquiries').select('*').limit(5);
    if (!inqError) {
      console.log(`✓ Inquiries table found! Rows count: ${inquiries.length}`);
    }

  } catch (err) {
    console.error('Connection error:', err);
  }
}

main();
