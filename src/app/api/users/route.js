import { NextResponse } from 'next/server';
import { query, queryAll } from '@/supabase';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const users = await queryAll(`
      SELECT 
        u.id,
        u.nama,
        u.email,
        u.username,
        u.role,
        u.pabrik_id,
        u.pedagang_id,
        u.status,
        u.created_at,
        p.nama_pabrik,
        ped.nama_pedagang
      FROM tabel_pengguna u
      LEFT JOIN tabel_pabrik p ON u.pabrik_id = p.id
      LEFT JOIN tabel_pedagang ped ON u.pedagang_id = ped.id
      ORDER BY u.id ASC
    `);
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nama, email, username, password, role, pabrik_id, pedagang_id, status } = body;

    if (!nama || !email || !username || !role) {
      return NextResponse.json({ success: false, error: 'Nama, Email, Username, dan Role wajib diisi' }, { status: 400 });
    }

    const inserted = await query(`
      INSERT INTO tabel_pengguna (nama, email, username, password, role, pabrik_id, pedagang_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, nama, email, username, role, pabrik_id, pedagang_id, status, created_at
    `, [
      nama, 
      email, 
      username.toLowerCase().trim(), 
      hashPassword(password || 'admin123'), 
      role, 
      pabrik_id ? Number(pabrik_id) : null, 
      pedagang_id ? Number(pedagang_id) : null, 
      status || 'aktif'
    ]);

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
