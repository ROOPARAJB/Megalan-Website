const url = 'https://sammfailpehmtxlbqmmh.supabase.co';
const anonKey = 'sb_publishable_fW8EO__Y0fyRVkflrZ4Vlw_LFH-nVN0';

async function check(endpoint, method = 'GET', body = null) {
  try {
    const res = await fetch(`${url}/rest/v1/${endpoint}`, {
      method,
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    console.log(`[${method} ${endpoint}] Status: ${res.status} | Response: ${text.slice(0, 100)}`);
    return { status: res.status, body: text };
  } catch (e) {
    console.log(`[${method} ${endpoint}] Error: ${e.message}`);
    return { error: e.message };
  }
}

async function run() {
  console.log('=== Verifying Supabase Anon Key Access ===');
  await check('users?select=*');
  await check('inquiries?select=*');
  await check('audit_logs?select=*');
  await check('gallery?select=*');
  await check('inquiries', 'POST', { full_name: 'attacker', email: 'spam@evil.com', message: 'test', mobile_number: '1234567890' });
  await check('gallery', 'POST', { title: 'deface', image_url: 'http://evil.com/x.jpg' });
}

run();
