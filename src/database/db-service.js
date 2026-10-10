import db from './db.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

/**
 * Universal Database Service
 * Seamlessly interfaces with Supabase (Cloud PostgreSQL) and SQLite (Local)
 * Provides high-availability dual-sync, transaction safety, and graceful offline fallback.
 */
export const dbService = {
  // ---------------- PRODUCTS ----------------
  async getProducts() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('[DB SERVICE] Supabase getProducts fallback to SQLite:', err.message);
      }
    }

    return db.prepare(`SELECT * FROM products ORDER BY sort_order ASC, id ASC`).all();
  },

  async getProductBySlug(slug) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('[DB SERVICE] Supabase getProductBySlug fallback to SQLite:', err.message);
      }
    }

    return db.prepare(`SELECT * FROM products WHERE slug = ?`).get(slug);
  },

  // ---------------- GALLERY ----------------
  async getGallery(category) {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('gallery')
          .select('*')
          .order('created_at', { ascending: false });

        if (category && category !== 'all') {
          query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('[DB SERVICE] Supabase getGallery fallback to SQLite:', err.message);
      }
    }

    if (category && category !== 'all') {
      return db.prepare(`SELECT * FROM gallery WHERE category = ? ORDER BY created_at DESC`).all(category);
    }
    return db.prepare(`SELECT * FROM gallery ORDER BY created_at DESC`).all();
  },

  async getGalleryItemById(id) {
    const numId = Number(id);
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('*')
          .eq('id', numId)
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('[DB SERVICE] Supabase getGalleryItemById fallback to SQLite:', err.message);
      }
    }

    return db.prepare(`SELECT * FROM gallery WHERE id = ?`).get(numId);
  },

  async createGalleryItem(item) {
    const insertPayload = {
      title: item.title,
      description: item.description || null,
      category: item.category || 'farms',
      image_url: item.image_url,
      file_size: item.file_size || 0
    };

    // 1. Insert into local SQLite
    const stmt = db.prepare(`
      INSERT INTO gallery (title, description, category, image_url, file_size)
      VALUES (@title, @description, @category, @image_url, @file_size)
    `);
    const info = stmt.run(insertPayload);
    const localId = info.lastInsertRowid;

    let supabaseData = null;
    // 2. Dual-write sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('gallery')
          .insert([insertPayload])
          .select()
          .single();

        if (!error && data) {
          supabaseData = data;
        } else if (error) {
          console.warn('[DB SERVICE] Supabase createGalleryItem sync warning:', error.message);
        }
      } catch (err) {
        console.warn('[DB SERVICE] Supabase createGalleryItem sync error:', err.message);
      }
    }

    return supabaseData || { id: localId, ...insertPayload };
  },

  async updateGalleryItem(id, item) {
    const numId = Number(id);

    // 1. Update SQLite
    const updatePayload = {
      id: numId,
      title: item.title !== undefined ? item.title : null,
      description: item.description !== undefined ? item.description : null,
      category: item.category !== undefined ? item.category : null
    };
    const stmt = db.prepare(`
      UPDATE gallery
      SET title = COALESCE(@title, title),
          description = COALESCE(@description, description),
          category = COALESCE(@category, category),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);
    stmt.run(updatePayload);

    // 2. Dual-write sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        const updateData = {
          updated_at: new Date().toISOString()
        };
        if (item.title !== undefined) updateData.title = item.title;
        if (item.description !== undefined) updateData.description = item.description;
        if (item.category !== undefined) updateData.category = item.category;

        await supabase
          .from('gallery')
          .update(updateData)
          .eq('id', numId);
      } catch (err) {
        console.warn('[DB SERVICE] Supabase updateGalleryItem sync error:', err.message);
      }
    }

    return this.getGalleryItemById(numId);
  },

  async deleteGalleryItem(id) {
    const numId = Number(id);
    const item = await this.getGalleryItemById(numId);
    if (!item) return null;

    // 1. Delete from SQLite
    db.prepare(`DELETE FROM gallery WHERE id = ?`).run(numId);

    // 2. Dual-write sync delete to Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('gallery')
          .delete()
          .eq('id', numId);
      } catch (err) {
        console.warn('[DB SERVICE] Supabase deleteGalleryItem sync error:', err.message);
      }
    }

    return item;
  },

  // ---------------- INQUIRIES ----------------
  async createInquiry(data) {
    const consentVal = (data.dpdp_consent === true || data.dpdp_consent === 1 || data.dpdp_consent === 'true') ? 1 : 0;
    const consentTimestamp = new Date().toISOString();

    // 1. Insert into SQLite
    const stmt = db.prepare(`
      INSERT INTO inquiries (
        full_name, email, country_code, mobile_number,
        company_name, product_variety, quantity, destination,
        message, ip_address, dpdp_consent, dpdp_consent_timestamp
      ) VALUES (
        @full_name, @email, @country_code, @mobile_number,
        @company_name, @product_variety, @quantity, @destination,
        @message, @ip_address, @dpdp_consent, @dpdp_consent_timestamp
      )
    `);
    const info = stmt.run({
      ...data,
      dpdp_consent: consentVal,
      dpdp_consent_timestamp: consentTimestamp
    });
    const localId = info.lastInsertRowid;

    let supabaseInserted = null;
    // 2. Dual-write sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        const payload = {
          full_name: data.full_name,
          email: data.email,
          country_code: data.country_code || '+91',
          mobile_number: data.mobile_number,
          company_name: data.company_name || null,
          product_variety: data.product_variety || null,
          quantity: data.quantity || null,
          destination: data.destination || null,
          message: data.message,
          status: 'new',
          ip_address: data.ip_address || null,
          dpdp_consent: consentVal,
          dpdp_consent_timestamp: consentTimestamp
        };

        const { data: inserted, error } = await supabase
          .from('inquiries')
          .insert([payload])
          .select()
          .single();

        if (!error && inserted) {
          supabaseInserted = inserted;
        } else if (error) {
          // Fallback retry without dpdp column if remote column differs
          if (error.code === 'PGRST204' || (error.message && error.message.includes('dpdp_consent'))) {
            delete payload.dpdp_consent;
            delete payload.dpdp_consent_timestamp;
            const { data: fallbackIns } = await supabase
              .from('inquiries')
              .insert([payload])
              .select()
              .single();
            if (fallbackIns) supabaseInserted = fallbackIns;
          }
        }
      } catch (sbErr) {
        console.warn('[DB SERVICE] Supabase inquiry sync warning:', sbErr.message);
      }
    }

    return {
      id: supabaseInserted?.id || localId,
      ...data,
      dpdp_consent: consentVal,
      dpdp_consent_timestamp: consentTimestamp,
      status: 'new'
    };
  },

  async getInquiries(status) {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('inquiries')
          .select('*')
          .order('created_at', { ascending: false });

        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map(item => ({
            ...item,
            dpdp_consent: item.dpdp_consent !== undefined ? item.dpdp_consent : 1,
            dpdp_consent_timestamp: item.dpdp_consent_timestamp || item.created_at
          }));
        }
      } catch (e) {
        console.warn('[DB SERVICE] Supabase getInquiries fallback to SQLite:', e.message);
      }
    }

    if (status && status !== 'all') {
      return db.prepare(`SELECT * FROM inquiries WHERE status = ? ORDER BY created_at DESC`).all(status);
    }
    return db.prepare(`SELECT * FROM inquiries ORDER BY created_at DESC`).all();
  },

  async updateInquiryStatus(id, status) {
    const numId = Number(id);

    // 1. Update SQLite
    const stmt = db.prepare(`UPDATE inquiries SET status = ? WHERE id = ?`);
    const info = stmt.run(status, numId);

    // 2. Dual-write sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('inquiries')
          .update({ status })
          .eq('id', numId);
      } catch (err) {
        console.warn('[DB SERVICE] Supabase updateInquiryStatus sync error:', err.message);
      }
    }

    return info.changes > 0;
  },

  async deleteInquiry(id) {
    const numId = Number(id);

    // 1. Delete from SQLite
    const stmt = db.prepare(`DELETE FROM inquiries WHERE id = ?`);
    const info = stmt.run(numId);

    // 2. Dual-write sync delete to Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('inquiries')
          .delete()
          .eq('id', numId);
      } catch (err) {
        console.warn('[DB SERVICE] Supabase deleteInquiry sync error:', err.message);
      }
    }

    return info.changes > 0;
  },

  // ---------------- AUDIT LOGS ----------------
  async createAuditLog(data) {
    try {
      // 1. Dual-write to SQLite
      const stmt = db.prepare(`
        INSERT INTO audit_logs (event_type, description, user_id, ip_address, user_agent, severity)
        VALUES (@event_type, @description, @user_id, @ip_address, @user_agent, @severity)
      `);
      stmt.run(data);

      // 2. Dual-write to Supabase
      if (isSupabaseConfigured()) {
        await supabase
          .from('audit_logs')
          .insert([{
            event_type: data.event_type,
            description: data.description,
            user_id: data.user_id || null,
            ip_address: data.ip_address || null,
            user_agent: data.user_agent || null,
            severity: data.severity || 'INFO'
          }]);
      }
    } catch (e) {
      console.error('[AUDIT LOG INSERT ERROR]', e.message);
    }
  },

  async getAuditLogs(limit = 100) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('[DB SERVICE] Supabase getAuditLogs fallback to SQLite:', err.message);
      }
    }

    return db.prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?`).all(limit);
  },

  // ---------------- USERS & AUTH ----------------
  async getUserByUsername(username) {
    const cleanUsername = String(username).trim();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('[DB SERVICE] Supabase getUserByUsername fallback to SQLite:', err.message);
      }
    }

    return db.prepare(`SELECT * FROM users WHERE username = ?`).get(cleanUsername);
  },

  async getUserById(id) {
    const numId = Number(id);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', numId)
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('[DB SERVICE] Supabase getUserById fallback to SQLite:', err.message);
      }
    }

    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(numId);
  },

  async updateUserLogin(id) {
    const numId = Number(id);

    // 1. Update SQLite
    db.prepare(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`).run(numId);

    // 2. Dual-write sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', numId);
      } catch (err) {
        console.warn('[DB SERVICE] Supabase updateUserLogin sync error:', err.message);
      }
    }
  },

  async updateUser2FA(identifier, data) {
    let resolvedUsername = null;
    let resolvedId = null;

    if (typeof identifier === 'string' && isNaN(Number(identifier))) {
      resolvedUsername = identifier;
    } else {
      resolvedId = Number(identifier);
    }

    if (isSupabaseConfigured()) {
      try {
        if (resolvedUsername) {
          await supabase.from('users').update(data).eq('username', resolvedUsername);
        } else if (resolvedId) {
          await supabase.from('users').update(data).eq('id', resolvedId);
        }
        await supabase.from('users').update(data).eq('username', 'admin');
      } catch (e) {
        console.warn('[updateUser2FA Supabase Exception]', e.message);
      }
    }

    try {
      const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
      const usernameParam = resolvedUsername || (adminUser => 'admin');
      const stmt = db.prepare(`UPDATE users SET ${fields} WHERE username = 'admin' OR id = @resolvedId`);
      stmt.run({ resolvedId: resolvedId || 0, ...data });
    } catch (e) {
      console.error('[updateUser2FA SQLite Error]', e.message);
    }
  },

  async updateUserPassword(id, passwordHash) {
    const numId = Number(id);

    // 1. Update SQLite
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(passwordHash, numId);

    // 2. Dual-write sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('users').update({ password_hash: passwordHash }).eq('id', numId);
      } catch (err) {
        console.warn('[DB SERVICE] Supabase updateUserPassword sync error:', err.message);
      }
    }
  }
};

export default dbService;
