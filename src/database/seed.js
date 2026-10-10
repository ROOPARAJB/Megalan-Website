import db from './db.js';
import { supabase, isSupabaseConfigured } from './supabase.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

export async function seedDatabase() {
  console.log('[SEED] Starting database seeding...');

  // 1. Seed Admin User
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'ChangeMeImmediately#2026!';
  const adminEmail = process.env.ADMIN_EMAIL || 'megalan@vpsayogafresh.com';

  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(adminPass, salt);

  if (isSupabaseConfigured()) {
    try {
      const { data: existingSupabaseAdmin } = await supabase
        .from('users')
        .select('id')
        .eq('username', adminUser)
        .maybeSingle();

      if (!existingSupabaseAdmin) {
        await supabase.from('users').insert({
          username: adminUser,
          password_hash: hash,
          email: adminEmail,
          role: 'admin'
        });
        console.log(`[SEED] Created default admin user in Supabase: ${adminUser}`);
      } else {
        await supabase.from('users').update({
          password_hash: hash,
          email: adminEmail
        }).eq('username', adminUser);
        console.log(`[SEED] Updated admin user password hash in Supabase to match .env`);
      }
    } catch (e) {
      console.warn('[SEED SUPABASE USER WARNING]', e.message);
    }
  }

  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUser);
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO users (username, password_hash, email, role)
      VALUES (?, ?, ?, 'admin')
    `).run(adminUser, hash, adminEmail);
    console.log(`[SEED] Created default admin user: ${adminUser}`);
  } else {
    db.prepare(`
      UPDATE users SET password_hash = ?, email = ? WHERE username = ?
    `).run(hash, adminEmail, adminUser);
    console.log(`[SEED] Updated admin user password hash to match .env`);
  }

  // 2. Seed Banana Products
  const products = [
    {
      slug: 'red-banana',
      name_en: 'Red Banana (Sevvazhai)',
      name_ta: 'செவ்வாழை (Red Banana)',
      name_hi: 'लाल केला (Red Banana)',
      name_ml: 'ചെങ്കദളി (Red Banana)',
      name_te: 'ఎరుపు అరటి (Red Banana)',
      name_ar: 'موز أحمر (Red Banana)',
      tagline: 'High Nutrient & Antioxidant Superfruit',
      health_benefits: 'Rich in potassium, magnesium, vitamin B6, and significantly higher levels of vitamin C and beta-carotene than standard yellow bananas. Boosts immunity, aids blood pressure regulation, and enhances ocular health.',
      taste_profile: 'Distinctively sweet with delicate berry-like nuances and velvety texture.',
      shelf_life: '6 to 8 Days at 13-14°C',
      packing_specs: '7kg / 13kg Export Grade Corrugated Box, Foam Wrapped',
      ideal_temperature: '13.0°C - 14.5°C',
      image_url: '/images/products/red-banana.jpg',
      is_featured: 1,
      sort_order: 1
    },
    {
      slug: 'poovan-banana',
      name_en: 'Poovan Banana',
      name_ta: 'பூவன் வாழை (Poovan)',
      name_hi: 'पूवन केला (Poovan)',
      name_ml: 'പൂവൻ പഴം (Poovan)',
      name_te: 'పూవన్ అరటి (Poovan)',
      name_ar: 'موز بوفان (Poovan)',
      tagline: 'Gentle on Stomach & High Dietary Fiber',
      health_benefits: 'Rich in soluble dietary fiber, making it gentle on the stomach and exceptionally easy to digest. Enhances intestinal microflora, relieves acidity, and provides quick, sustained natural energy.',
      taste_profile: 'Pleasantly tangy-sweet with firm pulp and distinct pleasant aroma.',
      shelf_life: '7 to 10 Days at 13-14°C',
      packing_specs: '10kg / 15kg Telescopic Cartons with Polyethylene Liner',
      ideal_temperature: '13.5°C - 14.0°C',
      image_url: '/images/products/poovan-banana.jpg',
      is_featured: 1,
      sort_order: 2
    },
    {
      slug: 'nendran-banana',
      name_en: 'Nendran Banana (Kerala Plantain)',
      name_ta: 'நேந்திரன் வாழை (Nendran)',
      name_hi: 'नेन्द्रन केला (Nendran)',
      name_ml: 'നേന്ത്രപ്പഴം (Nendran)',
      name_te: 'నేంద్రన్ అరటి (Nendran)',
      name_ar: 'موز نيندران (Nendran)',
      tagline: 'Kerala Specialty for Culinary & Superfood Vitality',
      health_benefits: 'High in resistant starch (when slightly green), dietary fiber, potassium, and Vitamin B6, making them exceptionally beneficial for gut microbiota, insulin sensitivity, and cardiovascular health.',
      taste_profile: 'Rich, firm, subtly sweet with versatile culinary suitability for chips, steaming, and ripe consumption.',
      shelf_life: '8 to 12 Days at 13-14°C',
      packing_specs: '12kg / 18kg Heavy Duty Export Crates with Ethylene Absorbers',
      ideal_temperature: '13.0°C - 14.0°C',
      image_url: '/images/products/nendran-banana.jpg',
      is_featured: 1,
      sort_order: 3
    },
    {
      slug: 'yelakki-banana',
      name_en: 'Yelakki / Elakki Banana',
      name_ta: 'ஏலக்கி வாழை (Yelakki)',
      name_hi: 'इलायची केला (Yelakki)',
      name_ml: 'ഏലക്കി പഴം (Yelakki)',
      name_te: 'ఏలక్కి అరటి (Yelakki)',
      name_ar: 'موز يلاكي (Yelakki)',
      tagline: 'Pocket-Sized Intense Honey-Sweet Aroma',
      health_benefits: 'Small, highly sweet, and aromatic variety widely cultivated in South India. Packed with concentrated energy, calcium, vitamin C, and dietary fiber. Ideal for children, athletes, and gourmet desserts.',
      taste_profile: 'Intense honeyed sweetness with a rich floral bouquet and firm, fragrant flesh.',
      shelf_life: '5 to 7 Days at 13-14°C',
      packing_specs: '5kg / 10kg Premium Master Cartons with Cushioning Trays',
      ideal_temperature: '13.5°C - 14.5°C',
      image_url: '/images/products/yelakki-banana.jpg',
      is_featured: 1,
      sort_order: 4
    },
    {
      slug: 'karpuravalli-banana',
      name_en: 'Karpuravalli Banana',
      name_ta: 'கற்பூரவள்ளி (Karpuravalli)',
      name_hi: 'कर्पूरावल्ली केला (Karpuravalli)',
      name_ml: 'കർപ്പൂരവള്ളി (Karpuravalli)',
      name_te: 'కర్పూరవల్లి అరటి (Karpuravalli)',
      name_ar: 'موز كارفورافالي (Karpuravalli)',
      tagline: 'Traditional South Indian Creamy Delicacy',
      health_benefits: 'Known for its plump, slightly angular shape, ash-grey to golden-yellow skin, and exceptionally sweet, creamy flesh. Known in traditional diets for respiratory soothing properties and cooling vitality.',
      taste_profile: 'Silky smooth, extremely sweet, with a distinct natural camphoraceous sweet aroma.',
      shelf_life: '6 to 9 Days at 13-14°C',
      packing_specs: '10kg Ventilated Export Boxes with protective dividers',
      ideal_temperature: '13.0°C - 14.0°C',
      image_url: '/images/products/karpuravalli-banana.jpg',
      is_featured: 1,
      sort_order: 5
    },
    {
      slug: 'rasthali-banana',
      name_en: 'Rasthali Banana',
      name_ta: 'ரஸ்தாளி (Rasthali)',
      name_hi: 'रसथाली केला (Rasthali)',
      name_ml: 'രസ്താലി (Rasthali)',
      name_te: 'రసతాళి అరటి (Rasthali)',
      name_ar: 'موز راستهالي (Rasthali)',
      tagline: 'Silky Texture with Subtle Apple Aroma',
      health_benefits: 'A premium, traditional Indian banana variety known for its exceptionally sweet taste, silky texture, and subtle apple-like aroma. High in natural sugars, vitamin B complex, and digestive enzymes.',
      taste_profile: 'Dessert grade royal sweetness with a subtle undertone of crisp apple fragrance.',
      shelf_life: '5 to 8 Days at 13-14°C',
      packing_specs: '8kg / 12kg Protective Layered Master Cartons',
      ideal_temperature: '13.5°C - 14.0°C',
      image_url: '/images/products/rasthali-banana.jpg',
      is_featured: 1,
      sort_order: 6
    },
    {
      slug: 'robusta-banana',
      name_en: 'Robusta Cavendish Banana',
      name_ta: 'ரோபஸ்டா கேவென்டிஷ் (Robusta)',
      name_hi: 'रोबस्टा केला (Robusta)',
      name_ml: 'റോബസ്റ്റ (Robusta)',
      name_te: 'రోబస్టా అరటి (Robusta)',
      name_ar: 'موز روبوستا كافنديش (Robusta)',
      tagline: 'Global Favorite for Bulk Supply & Uniform Ripening',
      health_benefits: 'Medium-to-large Cavendish banana variety known for sweet flavor, soft and creamy texture, and thick protective green peel that turns bright yellow upon ripening. Exceptional potassium, manganese, and energy density.',
      taste_profile: 'Classic rich banana sweetness with dense, creamy, uniform bite.',
      shelf_life: '14 to 21 Days under Cold Chain (13.5°C)',
      packing_specs: '13.5kg / 18.14kg (40lb) Standard International Reefer Cartons',
      ideal_temperature: '13.2°C - 14.0°C',
      image_url: '/images/products/robusta-banana.jpg',
      is_featured: 1,
      sort_order: 7
    },
    {
      slug: 'monthan-banana',
      name_en: 'Monthan Cooking Banana',
      name_ta: 'மொந்தன் வாழை (Monthan)',
      name_hi: 'मंथन केला (Monthan)',
      name_ml: 'മൊന്തൻ (Monthan)',
      name_te: 'మొంతన్ అరటి (Monthan)',
      name_ar: 'موز مونثان للطبخ (Monthan)',
      tagline: 'Hearty Starch Profile for Gourmet Food Processing',
      health_benefits: 'A popular, robust cooking banana variety in India known for its large, stocky, knobbed green fruits and starchy, mealy pulp. Low in simple sugars, rich in dietary fiber, zinc, and prebiotic resistant starch.',
      taste_profile: 'Savory, starchy, absorbs culinary seasoning with superb firmness upon cooking.',
      shelf_life: '15 to 25 Days at Ambient / 14°C',
      packing_specs: '20kg / 25kg Heavy Duty Jute or Ventilated Master Bags',
      ideal_temperature: '14.0°C - 16.0°C',
      image_url: '/images/products/monthan-banana.jpg',
      is_featured: 1,
      sort_order: 8
    }
  ];

  const insertProduct = db.prepare(`
    INSERT OR REPLACE INTO products (
      slug, name_en, name_ta, name_hi, name_ml, name_te, name_ar,
      tagline, health_benefits, taste_profile, shelf_life,
      packing_specs, ideal_temperature, image_url, is_featured, sort_order
    ) VALUES (
      @slug, @name_en, @name_ta, @name_hi, @name_ml, @name_te, @name_ar,
      @tagline, @health_benefits, @taste_profile, @shelf_life,
      @packing_specs, @ideal_temperature, @image_url, @is_featured, @sort_order
    )
  `);

  const insertManyProducts = db.transaction((items) => {
    for (const item of items) insertProduct.run(item);
  });
  insertManyProducts(products);
  console.log(`[SEED] Seeded ${products.length} banana varieties in SQLite.`);

  if (isSupabaseConfigured()) {
    try {
      for (const p of products) {
        await supabase.from('products').upsert(p, { onConflict: 'slug' });
      }
      console.log(`[SEED] Synced ${products.length} banana varieties to Supabase.`);
    } catch (e) {
      console.warn('[SEED SUPABASE PRODUCTS WARNING]', e.message);
    }
  }

  // 3. Seed Gallery Items
  const galleryItems = [
    {
      title: 'Theni High-Yield Farm Sourcing',
      description: 'Lush green banana plantation in Theni, direct harvest from certified partner growers.',
      category: 'farms',
      image_url: '/images/products/rasthali-banana.jpg'
    },
    {
      title: 'Oddanchatram Grading Hub',
      description: 'Hand-inspected bunches meeting international grading parameters for export.',
      category: 'harvest',
      image_url: '/images/products/poovan-banana.jpg'
    },
    {
      title: 'Cold-Chain Fleet Loading (13-14°C)',
      description: 'Reefer containerized fleet coordination ensuring zero damage & optimal shelf-life.',
      category: 'logistics',
      image_url: '/images/products/robusta-banana.jpg'
    },
    {
      title: 'Super-Sweet Yelakki Bunches',
      description: 'Golden, freshly harvested Yelakki bananas ready for South India retail chains.',
      category: 'products',
      image_url: '/images/products/yelakki-banana.jpg'
    },
    {
      title: 'Nutrient-Dense Red Banana Batches',
      description: 'Premium organic Sevvazhai bunches undergoing hygienic sorting.',
      category: 'products',
      image_url: '/images/products/red-banana.jpg'
    },
    {
      title: 'Export Packaging & Palletizing',
      description: 'Telescopic ventilated carton packaging with ethylene management.',
      category: 'packaging',
      image_url: '/images/products/nendran-banana.jpg'
    }
  ];

  const existingGalleryCount = db.prepare('SELECT COUNT(*) as count FROM gallery').get().count;
  if (existingGalleryCount === 0) {
    const insertGallery = db.prepare(`
      INSERT INTO gallery (title, description, category, image_url, file_size)
      VALUES (?, ?, ?, ?, 102400)
    `);
    const insertManyGallery = db.transaction((items) => {
      for (const item of items) {
        insertGallery.run(item.title, item.description, item.category, item.image_url);
      }
    });
    insertManyGallery(galleryItems);
    console.log(`[SEED] Seeded ${galleryItems.length} initial gallery items in SQLite.`);
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: existingGal } = await supabase.from('gallery').select('id');
      if (!existingGal || existingGal.length === 0) {
        for (const g of galleryItems) {
          await supabase.from('gallery').insert([{ ...g, file_size: 102400 }]);
        }
        console.log(`[SEED] Synced ${galleryItems.length} initial gallery items to Supabase.`);
      }
    } catch (e) {
      console.warn('[SEED SUPABASE GALLERY WARNING]', e.message);
    }
  }

  // 4. Seed sample audit log
  db.prepare(`
    INSERT INTO audit_logs (event_type, description, severity)
    VALUES ('SYSTEM_INIT', 'Database schema initialized and seed executed successfully.', 'INFO')
  `).run();

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_logs').insert([{
        event_type: 'SYSTEM_INIT',
        description: 'Database schema initialized and seed executed successfully.',
        severity: 'INFO'
      }]);
    } catch (e) {}
  }

  console.log('[SEED] Seeding completed successfully.');
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase().catch(console.error);
}
