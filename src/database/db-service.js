import db from './db.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

/**
 * Universal Database Service
 * Seamlessly interfaces with Supabase (Cloud PostgreSQL) or SQLite (Local)
 */
export const dbService = {
  // ---------------- PRODUCTS ----------------
  async getProducts() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      return data;
    }

    return db.prepare(`SELECT * FROM products ORDER BY sort_order ASC, id ASC`).all();
  },

  async getProductBySlug(slug) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    }

    return db.prepare(`SELECT * FROM products WHERE slug = ?`).get(slug);
  },

  // ---------------- GALLERY ----------------
  async getGallery(category) {
    if (isSupabaseConfigured()) {
      let query = supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }

    if (category && category !== 'all') {
      return db.prepare(`SELECT * FROM gallery WHERE category = ? ORDER BY created_at DESC`).all(category);
    }
    return db.prepare(`SELECT * FROM gallery ORDER BY created_at DESC`).all();
  },

  async getGalleryItemById(id) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    }

    return db.prepare(`SELECT * FROM gallery WHERE id = ?`).get(id);
  },

  async createGalleryItem(item) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('gallery')
        .insert([{
          title: item.title,
          description: item.description,
          category: item.category,
          image_url: item.image_url,
          file_size: item.file_size || 0
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const stmt = db.prepare(`
      INSERT INTO gallery (title, description, category, image_url, file_size)
      VALUES (@title, @description, @category, @image_url, @file_size)
    `);
    const info = stmt.run(item);
    return { id: info.lastInsertRowid, ...item };
  },

  async updateGalleryItem(id, item) {
    if (isSupabaseConfigured()) {
      const updateData = {
        updated_at: new Date().toISOString()
      };
      if (item.title) updateData.title = item.title;
      if (item.description !== undefined) updateData.description = item.description;
      if (item.category) updateData.category = item.category;

      const { data, error } = await supabase
        .from('gallery')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const stmt = db.prepare(`
      UPDATE gallery
      SET title = COALESCE(@title, title),
          description = COALESCE(@description, description),
          category = COALESCE(@category, category),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);
    const info = stmt.run({ id, ...item });
    if (info.changes === 0) return null;
    return this.getGalleryItemById(id);
  },

  async deleteGalleryItem(id) {
    if (isSupabaseConfigured()) {
      const item = await this.getGalleryItemById(id);
      if (!item) return null;

      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return item;
    }

    const item = db.prepare(`SELECT * FROM gallery WHERE id = ?`).get(id);
    if (!item) return null;

    db.prepare(`DELETE FROM gallery WHERE id = ?`).run(id);
    return item;
  },

  // ---------------- INQUIRIES ----------------
  async createInquiry(data) {
    const consentVal = (data.dpdp_consent === true || data.dpdp_consent === 1 || data.dpdp_consent === 'true') ? 1 : 0;
    const consentTimestamp = new Date().toISOString();

    let supabaseInserted = null;
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
          ip_address: data.ip_address || null
        };

        const { data: inserted, error } = await supabase
          .from('inquiries')
          .insert([{ ...payload, dpdp_consent: consentVal, dpdp_consent_timestamp: consentTimestamp }])
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST204' || (error.message && error.message.includes('dpdp_consent'))) {
            const { data: fallbackIns, error: fallbackErr } = await supabase
              .from('inquiries')
              .insert([payload])
              .select()
              .single();
            if (!fallbackErr) supabaseInserted = fallbackIns;
          }
        } else {
          supabaseInserted = inserted;
        }
      } catch (sbErr) {
        console.warn('Supabase insert warning:', sbErr.message);
      }
    }

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

    return {
      id: supabaseInserted?.id || info.lastInsertRowid,
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
        if (!error && Array.isArray(data)) {
          return data.map(item => ({
            ...item,
            dpdp_consent: item.dpdp_consent !== undefined ? item.dpdp_consent : 1,
            dpdp_consent_timestamp: item.dpdp_consent_timestamp || item.created_at
          }));
        }
      } catch (e) {}
    }

    if (status && status !== 'all') {
      return db.prepare(`SELECT * FROM inquiries WHERE status = ? ORDER BY created_at DESC`).all(status);
    }
    return db.prepare(`SELECT * FROM inquiries ORDER BY created_at DESC`).all();
  },

  async updateInquiryStatus(id, status) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('inquiries')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const stmt = db.prepare(`UPDATE inquiries SET status = ? WHERE id = ?`);
    const info = stmt.run(status, id);
    return info.changes > 0;
  },

  async deleteInquiry(id) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('inquiries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    }

    const stmt = db.prepare(`DELETE FROM inquiries WHERE id = ?`);
    const info = stmt.run(id);
    return info.changes > 0;
  },

  // ---------------- AUDIT LOGS ----------------
  async createAuditLog(data) {
    try {
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
        return;
      }

      const stmt = db.prepare(`
        INSERT INTO audit_logs (event_type, description, user_id, ip_address, user_agent, severity)
        VALUES (@event_type, @description, @user_id, @ip_address, @user_agent, @severity)
      `);
      stmt.run(data);
    } catch (e) {
      console.error('[AUDIT LOG INSERT ERROR]', e);
    }
  },

  async getAuditLogs(limit = 100) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    }

    return db.prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?`).all(limit);
  },

  // ---------------- USERS & AUTH ----------------
  async getUserByUsername(username) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      return data;
    }

    return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
  },

  async getUserById(id) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    }

    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  },

  async updateUserLogin(id) {
    if (isSupabaseConfigured()) {
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', id);
      return;
    }

    db.prepare(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
  },

  async updateUser2FA(identifier, data) {
    if (isSupabaseConfigured()) {
      try {
        const isUsername = typeof identifier === 'string' && isNaN(Number(identifier));
        if (isUsername) {
          const { error } = await supabase.from('users').update(data).eq('username', identifier);
          if (error) console.error('[updateUser2FA Supabase Error]', error.message);
        } else {
          const { error } = await supabase.from('users').update(data).eq('id', identifier);
          if (error) console.error('[updateUser2FA Supabase Error]', error.message);
        }
      } catch (e) {
        console.error('[updateUser2FA Exception]', e.message);
      }
    }

    try {
      const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
      const isUsername = typeof identifier === 'string' && isNaN(Number(identifier));
      if (isUsername) {
        const stmt = db.prepare(`UPDATE users SET ${fields} WHERE username = @identifier`);
        stmt.run({ identifier, ...data });
      } else {
        const stmt = db.prepare(`UPDATE users SET ${fields} WHERE id = @identifier`);
        stmt.run({ identifier, ...data });
      }
    } catch (e) {}
  },

  async updateUserPassword(id, passwordHash) {
    if (isSupabaseConfigured()) {
      await supabase.from('users').update({ password_hash: passwordHash }).eq('id', id);
      return;
    }
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(passwordHash, id);
  }
};

export default dbService;
