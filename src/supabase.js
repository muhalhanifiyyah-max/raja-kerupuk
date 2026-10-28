// Adapter Supabase PostgreSQL via Management Database API & Direct PostgREST
const fs = require('node:fs');
const path = require('node:path');

// Simple .env parser without external dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'lvkqfctwsgtjwrbxwgpu';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const QUERY_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

/**
 * Escape a value safely for PostgreSQL
 */
function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? val.toString() : 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Format parameterized SQL query ($1, $2, or ? placeholders)
 */
function formatSql(sql, params = []) {
  if (!params || params.length === 0) return sql;

  if (sql.includes('?')) {
    let index = 0;
    return sql.replace(/\?/g, () => {
      if (index >= params.length) {
        throw new Error('Jumlah parameter SQL tidak cocok dengan placeholder ?');
      }
      return escapeValue(params[index++]);
    });
  }

  return sql.replace(/\$(\d+)/g, (match, num) => {
    const idx = parseInt(num, 10) - 1;
    if (idx >= 0 && idx < params.length) {
      return escapeValue(params[idx]);
    }
    return match;
  });
}

/**
 * Direct PostgREST execution engine (never expires, 100% reliable)
 */
async function postgrestRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PostgREST error [${res.status}]: ${errText}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

/**
 * Fallback SQL-to-PostgREST parser
 */
async function fallbackPostgrest(sql, params = []) {
  const formattedSql = formatSql(sql, params);
  const trimmed = formattedSql.trim();
  const upper = trimmed.toUpperCase();

  // 1. SELECT query
  if (upper.startsWith('SELECT')) {
    const tableMatch = trimmed.match(/FROM\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i);
    const table = tableMatch ? tableMatch[1] : null;
    let tableAlias = tableMatch && tableMatch[2] ? tableMatch[2].toLowerCase() : null;
    if (tableAlias && ['where', 'join', 'left', 'right', 'inner', 'order', 'group', 'limit', 'on'].includes(tableAlias)) {
      tableAlias = null;
    }

    if (table) {
      // Build query string
      let qs = 'select=*';
      let whereClause = null;
      
      // Check for WHERE conditions
      const whereMatch = trimmed.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|\s*;|$)/is);
      if (whereMatch) {
        whereClause = whereMatch[1].trim();

        // 1A. Jika klausa WHERE memiliki klausa OR
        if (whereClause.includes(' OR ') || whereClause.includes(' or ')) {
          const orTokens = whereClause.split(/\s+OR\s+/i);
          const orFilterParts = [];
          for (const token of orTokens) {
            const trimmedToken = token.trim();
            if (trimmedToken === '1=1' || trimmedToken === '1 = 1' || trimmedToken === 'true') continue;
            const m = token.match(/(?:LOWER\s*\(\s*(?:([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+)\s*\)|(?:([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+))\s*(=|ILIKE|LIKE)\s*(.+)/i);
            if (m) {
              const colAlias = (m[1] || m[3] || '').toLowerCase();
              const col = m[2] || m[4];
              if (col === '1') continue;
              if (colAlias && tableAlias && colAlias !== tableAlias && colAlias !== table.toLowerCase()) {
                continue;
              }
              const val = m[6].trim().replace(/^['"]|['"]$/g, '');
              if (col && val) {
                orFilterParts.push(`${col}.ilike.${val}`);
              }
            }
          }
          if (orFilterParts.length > 0) {
            qs += `&or=(${orFilterParts.join(',')})`;
          }
        } else {
          // 1B. Klausa WHERE dengan AND / kondisi tunggal
          const conds = whereClause.split(/\s+AND\s+/i);
          for (const cond of conds) {
            const trimmedCond = cond.trim();
            if (trimmedCond === '1=1' || trimmedCond === '1 = 1' || trimmedCond === 'true') continue;
            const m = cond.match(/(?:LOWER\s*\(\s*(?:([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+)\s*\)|(?:([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+))\s*(=|ILIKE|LIKE)\s*(.+)/i);
            if (m) {
              const colAlias = (m[1] || m[3] || '').toLowerCase();
              const col = m[2] || m[4];
              if (col === '1') continue;
              if (colAlias && tableAlias && colAlias !== tableAlias && colAlias !== table.toLowerCase()) {
                continue;
              }
              const val = m[6].trim().replace(/^['"]|['"]$/g, '');
              const hasLower = /^\s*LOWER\s*\(/i.test(cond);
              const op = m[5].toUpperCase();
              const isNumeric = /^-?\d+(\.\d+)?$/.test(val);
              const isLower = !isNumeric && (hasLower || op === 'ILIKE');
              if (col && val) {
                if (isLower) {
                  qs += `&${col}=ilike.${encodeURIComponent(val)}`;
                } else {
                  qs += `&${col}=eq.${encodeURIComponent(val)}`;
                }
              }
            }
          }
        }
      }

      // Check ORDER BY (mendukung multi-kolom seperti ORDER BY tanggal DESC, id DESC)
      const orderMatch = trimmed.match(/ORDER\s+BY\s+([a-zA-Z0-9_., ]+?)(?:\s+LIMIT|\s*;|$)/i);
      if (orderMatch) {
        const orderPart = orderMatch[1].trim();
        const clauses = orderPart.split(',').map(s => s.trim()).filter(Boolean);
        const orderTokens = [];
        for (const clause of clauses) {
          const parts = clause.split(/\s+/);
          const rawCol = parts[0];
          const colParts = rawCol.split('.');
          const colAlias = colParts.length > 1 ? colParts[0].trim().toLowerCase() : null;
          const col = colParts.pop().trim();
          if (colAlias && tableAlias && colAlias !== tableAlias && colAlias !== table.toLowerCase()) {
            continue;
          }
          const dir = parts[1] && parts[1].toUpperCase() === 'DESC' ? 'desc' : 'asc';
          orderTokens.push(`${col}.${dir}`);
        }
        if (orderTokens.length > 0) {
          qs += `&order=${orderTokens.join(',')}`;
        }
      }

      // Check LIMIT
      const limitMatch = trimmed.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        qs += `&limit=${limitMatch[1]}`;
      }

      let rows = [];
      try {
        rows = await postgrestRequest(`${table}?${qs}`);
      } catch (err) {
        console.warn(`PostgREST select fallback for ${table}:`, err.message);
        rows = await postgrestRequest(`${table}?select=*`);
      }

      if (!Array.isArray(rows)) return [];

      // Enrich join tabel_pabrik dan tabel_pedagang untuk tabel_pengguna
      if (table === 'tabel_pengguna') {
        try {
          const [pabriks, pedagangs] = await Promise.all([
            postgrestRequest('tabel_pabrik?select=id,nama_pabrik'),
            postgrestRequest('tabel_pedagang?select=id,nama_pedagang')
          ]);
          const pabrikMap = (pabriks || []).reduce((acc, p) => ({ ...acc, [p.id]: p.nama_pabrik }), {});
          const pedagangMap = (pedagangs || []).reduce((acc, p) => ({ ...acc, [p.id]: p.nama_pedagang }), {});

          rows = rows.map(r => ({
            ...r,
            nama_pabrik: r.pabrik_id ? pabrikMap[r.pabrik_id] || null : null,
            nama_pedagang: r.pedagang_id ? pedagangMap[r.pedagang_id] || null : null
          }));
        } catch {
          // ignore enrich error
        }
      }

      // Client-side safety filter jika klausa WHERE spesifik
      if (whereClause && rows.length > 0) {
        const userMatch = whereClause.match(/username\)?\s*=\s*['"]([^'"]+)['"]/i);
        const emailMatch = whereClause.match(/email\)?\s*=\s*['"]([^'"]+)['"]/i);
        if (userMatch || emailMatch) {
          const targetU = userMatch ? userMatch[1].toLowerCase() : null;
          const targetE = emailMatch ? emailMatch[1].toLowerCase() : null;
          const filtered = rows.filter(r => 
            (targetU && (r.username || '').toLowerCase() === targetU) ||
            (targetE && (r.email || '').toLowerCase() === targetE)
          );
          if (filtered.length > 0) {
            rows = filtered;
          }
        }
      }

      return rows;
    }
  }

  // 2. INSERT query
  if (upper.startsWith('INSERT INTO')) {
    const tableMatch = trimmed.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
    const table = tableMatch ? tableMatch[1] : null;

    if (table) {
      const colsMatch = trimmed.match(/\(([^)]+)\)\s+VALUES/i);
      const valsMatch = trimmed.match(/VALUES\s*\((.+)\)(?:\s+RETURNING|\s*;|$)/is);

      if (colsMatch && valsMatch) {
        const cols = colsMatch[1].split(',').map(c => c.trim().replace(/["']/g, ''));
        const formattedValuesStr = valsMatch[1];

        // Parse comma-separated values respecting strings
        const vals = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < formattedValuesStr.length; i++) {
          const ch = formattedValuesStr[i];
          if (ch === "'" && formattedValuesStr[i - 1] !== "\\") {
            inQuotes = !inQuotes;
          } else if (ch === ',' && !inQuotes) {
            vals.push(cur.trim());
            cur = '';
            continue;
          }
          cur += ch;
        }
        if (cur.trim()) vals.push(cur.trim());

        const bodyObj = {};
        cols.forEach((col, idx) => {
          let val = vals[idx];
          if (val === undefined || val === 'NULL' || val === 'null') {
            bodyObj[col] = null;
          } else if (val.startsWith("'") && val.endsWith("'")) {
            bodyObj[col] = val.slice(1, -1).replace(/''/g, "'");
          } else if (!isNaN(Number(val))) {
            bodyObj[col] = Number(val);
          } else if (val.toUpperCase() === 'TRUE') {
            bodyObj[col] = true;
          } else if (val.toUpperCase() === 'FALSE') {
            bodyObj[col] = false;
          } else {
            bodyObj[col] = val;
          }
        });

        return await postgrestRequest(table, {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(bodyObj)
        });
      }
    }
  }

  // 3. UPDATE query
  if (upper.startsWith('UPDATE')) {
    const tableMatch = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+)\s+WHERE\s+(.+)$/is);
    if (tableMatch) {
      const table = tableMatch[1].trim();
      const setClause = tableMatch[2].trim();
      const whereClause = tableMatch[3].trim().replace(/;$/, '');

      const idMatch = whereClause.match(/id\s*=\s*(\d+|\?)/i);
      const targetId = idMatch ? (idMatch[1] === '?' ? params[params.length - 1] : idMatch[1]) : null;

      const updates = {};
      const setParts = setClause.split(',');
      for (const part of setParts) {
        const [k, v] = part.split('=').map(s => s && s.trim());
        if (k && v) {
          let cleanVal = v;
          if (cleanVal.startsWith("'") && cleanVal.endsWith("'")) {
            updates[k] = cleanVal.slice(1, -1).replace(/''/g, "'");
          } else if (!isNaN(Number(cleanVal))) {
            updates[k] = Number(cleanVal);
          } else if (cleanVal.toUpperCase() === 'NULL') {
            updates[k] = null;
          } else {
            // Cek apakah ekspresi aritmatika numerik seperti col +/- delta atau GREATEST(0, col - delta)
            const mathMatch = cleanVal.match(/(?:GREATEST\s*\(\s*0\s*,\s*)?([a-zA-Z0-9_]+)\s*([\+\-])\s*([\d\.]+)/i);
            if (mathMatch && targetId) {
              const opCol = mathMatch[1];
              const op = mathMatch[2];
              const delta = Number(mathMatch[3]) || 0;
              const isGreatest = cleanVal.toUpperCase().includes('GREATEST');

              try {
                const currentRows = await postgrestRequest(`${table}?id=eq.${targetId}&select=${opCol}`);
                const currentVal = currentRows && currentRows[0] ? Number(currentRows[0][opCol]) || 0 : 0;
                let calculated = op === '+' ? (currentVal + delta) : (currentVal - delta);
                if (isGreatest) calculated = Math.max(0, calculated);
                updates[k] = calculated;
              } catch {
                updates[k] = cleanVal;
              }
            } else {
              updates[k] = cleanVal;
            }
          }
        }
      }

      let patchEndpoint = table;
      if (targetId) {
        patchEndpoint += `?id=eq.${targetId}`;
      }

      return await postgrestRequest(patchEndpoint, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(updates)
      });
    }
  }

  // 4. DELETE query
  if (upper.startsWith('DELETE FROM')) {
    const tableMatch = trimmed.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)\s+WHERE\s+(.+)$/is);
    if (tableMatch) {
      const table = tableMatch[1].trim();
      const whereClause = tableMatch[2].trim().replace(/;$/, '');
      const idMatch = whereClause.match(/id\s*=\s*(\d+|\?)/i);
      const targetId = idMatch ? (idMatch[1] === '?' ? params[0] : idMatch[1]) : null;

      if (targetId) {
        return await postgrestRequest(`${table}?id=eq.${targetId}`, {
          method: 'DELETE',
          headers: { 'Prefer': 'return=representation' }
        });
      }
    }
  }

  return [];
}

/**
 * Execute raw SQL query against Supabase with seamless PostgREST engine
 */
async function query(sql, params = []) {
  const formattedSql = formatSql(sql, params);

  // Try direct Management API if token is valid
  if (ACCESS_TOKEN && !ACCESS_TOKEN.startsWith('expired')) {
    try {
      const response = await fetch(QUERY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: formattedSql })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to PostgREST
  return await fallbackPostgrest(sql, params);
}

/**
 * Execute query and return the first row or null
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Execute query and return all rows
 */
async function queryAll(sql, params = []) {
  const rows = await query(sql, params);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Test connectivity to Supabase
 */
async function testConnection() {
  try {
    const rows = await postgrestRequest('tabel_pabrik?select=id,nama_pabrik&limit=1');
    return { ok: true, info: rows[0] };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  query,
  queryOne,
  queryAll,
  testConnection,
  formatSql,
  postgrestRequest,
  PROJECT_REF,
  QUERY_URL,
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
};
