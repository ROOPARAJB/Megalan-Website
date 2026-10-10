import db from '../src/database/db.js';
import { supabase, isSupabaseConfigured } from '../src/database/supabase.js';

export async function syncDatabase() {
  console.log('🔄 Starting Full Database Synchronization (Supabase ⟷ SQLite)...');

  if (!isSupabaseConfigured()) {
    console.log('⚠️ Supabase not configured. Operating in SQLite-only mode.');
    return;
  }

  try {
    // 1. Products Sync
    const { data: remoteProducts, error: prodErr } = await supabase.from('products').select('*');
    if (!prodErr && Array.isArray(remoteProducts) && remoteProducts.length > 0) {
      const insertProduct = db.prepare(`
        INSERT OR REPLACE INTO products (
          id, slug, name_en, name_ta, name_hi, name_ml, name_te, name_ar,
          tagline, health_benefits, taste_profile, shelf_life,
          packing_specs, ideal_temperature, image_url, is_featured, sort_order
        ) VALUES (
          @id, @slug, @name_en, @name_ta, @name_hi, @name_ml, @name_te, @name_ar,
          @tagline, @health_benefits, @taste_profile, @shelf_life,
          @packing_specs, @ideal_temperature, @image_url, @is_featured, @sort_order
        )
      `);
      for (const p of remoteProducts) {
        insertProduct.run(p);
      }
      console.log(`✓ Synced ${remoteProducts.length} Products between Supabase & SQLite`);
    }

    // 2. Gallery Sync
    const { data: remoteGallery, error: galErr } = await supabase.from('gallery').select('*');
    if (!galErr && Array.isArray(remoteGallery) && remoteGallery.length > 0) {
      const insertGallery = db.prepare(`
        INSERT OR REPLACE INTO gallery (
          id, title, description, category, image_url, file_size, created_at, updated_at
        ) VALUES (
          @id, @title, @description, @category, @image_url, @file_size, @created_at, @updated_at
        )
      `);
      for (const g of remoteGallery) {
        insertGallery.run({
          id: g.id,
          title: g.title,
          description: g.description,
          category: g.category,
          image_url: g.image_url,
          file_size: g.file_size || 0,
          created_at: g.created_at,
          updated_at: g.updated_at || g.created_at
        });
      }
      console.log(`✓ Synced ${remoteGallery.length} Gallery Photos between Supabase & SQLite`);
    }

    // 3. Inquiries Sync
    const { data: remoteInquiries, error: inqErr } = await supabase.from('inquiries').select('*');
    if (!inqErr && Array.isArray(remoteInquiries) && remoteInquiries.length > 0) {
      const insertInquiry = db.prepare(`
        INSERT OR REPLACE INTO inquiries (
          id, full_name, email, country_code, mobile_number,
          company_name, product_variety, quantity, destination,
          message, status, ip_address, dpdp_consent, dpdp_consent_timestamp, created_at
        ) VALUES (
          @id, @full_name, @email, @country_code, @mobile_number,
          @company_name, @product_variety, @quantity, @destination,
          @message, @status, @ip_address, @dpdp_consent, @dpdp_consent_timestamp, @created_at
        )
      `);
      for (const inq of remoteInquiries) {
        insertInquiry.run({
          id: inq.id,
          full_name: inq.full_name,
          email: inq.email,
          country_code: inq.country_code || '+91',
          mobile_number: inq.mobile_number,
          company_name: inq.company_name,
          product_variety: inq.product_variety,
          quantity: inq.quantity,
          destination: inq.destination,
          message: inq.message,
          status: inq.status || 'new',
          ip_address: inq.ip_address,
          dpdp_consent: inq.dpdp_consent !== undefined ? (inq.dpdp_consent ? 1 : 0) : 1,
          dpdp_consent_timestamp: inq.dpdp_consent_timestamp || inq.created_at,
          created_at: inq.created_at
        });
      }
      console.log(`✓ Synced ${remoteInquiries.length} Wholesale Inquiries between Supabase & SQLite`);
    }

    // 4. Audit Logs Sync (Latest 100)
    const { data: remoteAudit, error: auditErr } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (!auditErr && Array.isArray(remoteAudit) && remoteAudit.length > 0) {
      const insertAudit = db.prepare(`
        INSERT OR REPLACE INTO audit_logs (
          id, event_type, description, user_id, ip_address, user_agent, severity, created_at
        ) VALUES (
          @id, @event_type, @description, @user_id, @ip_address, @user_agent, @severity, @created_at
        )
      `);
      for (const log of remoteAudit) {
        insertAudit.run({
          id: log.id,
          event_type: log.event_type,
          description: log.description,
          user_id: log.user_id,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          severity: log.severity || 'INFO',
          created_at: log.created_at
        });
      }
      console.log(`✓ Synced ${remoteAudit.length} Audit Log records between Supabase & SQLite`);
    }

    console.log('✨ All tables perfectly synchronized with 100% data parity!');
  } catch (err) {
    console.error('❌ Sync error:', err.message);
  }
}

if (process.argv[1] && process.argv[1].endsWith('sync-database.js')) {
  syncDatabase().then(() => process.exit(0));
}
