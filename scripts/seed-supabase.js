import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(url, key, { auth: { persistSession: false } });

const productsData = [
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
    name_hi: 'कर्पूरावल्ली (Karpuravalli)',
    name_ml: 'കർപ്പൂരവള്ളി (Karpuravalli)',
    name_te: 'కర్పూరవల్లి (Karpuravalli)',
    name_ar: 'موز كارفورافالي (Karpuravalli)',
    tagline: 'Drought-Tolerant High Natural Sugar Profile',
    health_benefits: 'Naturally endowed with high sugar content, rich in dietary fiber, potassium, and beneficial phytonutrients that support healthy digestion and rapid cellular rejuvenation.',
    taste_profile: 'Extremely sweet with a distinct refreshing cooling aftertaste and soft juicy pulp.',
    shelf_life: '6 to 9 Days at 13-14°C',
    packing_specs: '10kg / 15kg Corrugated Master Cartons with Air Vents',
    ideal_temperature: '13.0°C - 14.0°C',
    image_url: '/images/products/karpuravalli-banana.jpg',
    is_featured: 1,
    sort_order: 5
  },
  {
    slug: 'rasthali-banana',
    name_en: 'Rasthali / Silk Banana',
    name_ta: 'ரஸ்தாளி (Rasthali)',
    name_hi: 'रसथली (Rasthali)',
    name_ml: 'രസ്താലി (Rasthali)',
    name_te: 'రస్తాలి (Rasthali)',
    name_ar: 'موز راسثالي (Rasthali)',
    tagline: 'Delicate Gourmet Silk Texture & Aristocratic Fragrance',
    health_benefits: 'Contains balanced minerals, vitamin B-complex, and prebiotic fiber that foster gastrointestinal comfort and support nervous system regulation.',
    taste_profile: 'Silky, melt-in-mouth mouthfeel with delicate sub-acid sweetness and floral aroma.',
    shelf_life: '4 to 6 Days at 13-14°C',
    packing_specs: '7kg / 10kg Ventilated Rigid Boxes with Protective Spacers',
    ideal_temperature: '13.5°C - 14.5°C',
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
    tagline: 'Global Commercial Workhorse & High Calorie Energy',
    health_benefits: 'A powerhouse of quick carbohydrates, magnesium, vitamin B6, and potassium. Widely demanded for athletic nutrition, commercial food processing, and global retail distribution.',
    taste_profile: 'Smooth, creamy sweetness with uniform cylindrical shape and heavy bunch density.',
    shelf_life: '10 to 14 Days at 13-14°C',
    packing_specs: '13kg / 18.14kg (40lb) International Standard Vacuum-Packed Cartons',
    ideal_temperature: '13.0°C - 13.5°C',
    image_url: '/images/products/robusta-banana.jpg',
    is_featured: 1,
    sort_order: 7
  },
  {
    slug: 'monthan-banana',
    name_en: 'Monthan / Cooking Plantain',
    name_ta: 'மொந்தன் வாழை (Monthan)',
    name_hi: 'मोंथन केला (Monthan)',
    name_ml: 'മൊന്തൻ (Monthan)',
    name_te: 'మొంతన్ అరటి (Monthan)',
    name_ar: 'موز مونثان (Monthan)',
    tagline: 'Culinary Powerhouse for Traditional Recipes & Prebiotics',
    health_benefits: 'Rich in dietary fiber and essential minerals. Widely celebrated in culinary traditions across India for chips, curries, and wholesome dietary preparations.',
    taste_profile: 'Firm, starchy flesh that softens to savory, savory-sweet perfection upon cooking.',
    shelf_life: '7 to 10 Days at 13-14°C',
    packing_specs: '15kg / 20kg Heavy Duty Crates',
    ideal_temperature: '13.0°C - 14.0°C',
    image_url: '/images/products/monthan-banana.jpg',
    is_featured: 1,
    sort_order: 8
  }
];

const galleryData = [
  { title: 'Direct Farm Sourcing', description: 'Cultivating premium export-grade bananas in rich South Indian agricultural belts.', category: 'farms', image_url: '/images/products/red-banana.jpg', file_size: 245000 },
  { title: 'Ethical & Precision Harvest', description: 'Harvesting bunches at optimal maturity to ensure long shipping shelf-life.', category: 'harvest', image_url: '/images/products/poovan-banana.jpg', file_size: 312000 },
  { title: 'Export Multi-Layer Packaging', description: 'Foam wrapping and corrugated telescopic boxes designed for air & sea freight.', category: 'packaging', image_url: '/images/products/nendran-banana.jpg', file_size: 289000 },
  { title: 'Continuous 13-14°C Cold-Chain', description: 'Refrigerated logistics preserving nutritional density and freshness.', category: 'logistics', image_url: '/images/products/yelakki-banana.jpg', file_size: 350000 },
  { title: 'Quality Assurance & Sizing', description: 'Strict sorting to ensure uniform caliber, finger length, and blemish-free skin.', category: 'products', image_url: '/images/products/karpuravalli-banana.jpg', file_size: 295000 },
  { title: 'Global Dispatch Hub', description: 'Efficient loading into refrigerated shipping containers for international destinations.', category: 'logistics', image_url: '/images/products/robusta-banana.jpg', file_size: 410000 }
];

async function seed() {
  console.log('Seeding Supabase Database...');

  // 1. Upsert Products
  for (const p of productsData) {
    const { error } = await supabase.from('products').upsert(p, { onConflict: 'slug' });
    if (error) console.error('Product error:', p.slug, error.message);
    else console.log(`✓ Seeded Product: ${p.name_en}`);
  }

  // 2. Insert Gallery items if empty
  const { data: existingGal } = await supabase.from('gallery').select('id');
  if (!existingGal || existingGal.length === 0) {
    for (const g of galleryData) {
      const { error } = await supabase.from('gallery').insert(g);
      if (error) console.error('Gallery error:', g.title, error.message);
      else console.log(`✓ Seeded Gallery: ${g.title}`);
    }
  }

  console.log('✨ Seeding completed!');
}

seed();
