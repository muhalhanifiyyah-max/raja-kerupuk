// Adapter Supabase PostgreSQL via Management Database API & REST
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

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
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

  // If query uses ? placeholders
  if (sql.includes('?')) {
    let index = 0;
    return sql.replace(/\?/g, () => {
      if (index >= params.length) {
        throw new Error('Jumlah parameter SQL tidak cocok dengan placeholder ?');
      }
      return escapeValue(params[index++]);
    });
  }

  // If query uses $1, $2, etc.
  return sql.replace(/\$(\d+)/g, (match, num) => {
    const idx = parseInt(num, 10) - 1;
    if (idx >= 0 && idx < params.length) {
      return escapeValue(params[idx]);
    }
    return match;
  });
}

/**
 * Execute raw SQL query against Supabase PostgreSQL
 */
async function query(sql, params = []) {
  const formattedSql = formatSql(sql, params);
  
  const response = await fetch(QUERY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: formattedSql })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase Query Error [${response.status}]: ${errorText}\nSQL: ${formattedSql.slice(0, 300)}...`);
  }

  const result = await response.json();
  return result;
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
    const res = await query('SELECT current_database(), current_user, version();');
    return { ok: true, info: res[0] };
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
  PROJECT_REF,
  QUERY_URL
};
