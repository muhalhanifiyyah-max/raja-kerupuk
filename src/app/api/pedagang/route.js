import { NextResponse } from 'next/server';
import { query, queryAll } from '@/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pabrikId = searchParams.get('pabrik_id');

    if (!pabrikId) {
      return NextResponse.json({ success: false, error: 'pabrik_id diperlukan' }, { status: 400 });
    }

    const data = await queryAll(`
      SELECT * FROM tabel_pedagang 
      WHERE pabrik_id = ? 
      ORDER BY nama_pedagang ASC
    `, [Number(pabrikId)]);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { pabrik_id, nama_pedagang, no_telepon, alamat, limit_piutang } = body;

    if (!pabrik_id || !nama_pedagang) {
      return NextResponse.json({ success: false, error: 'Pabrik dan Nama Pedagang harus diisi' }, { status: 400 });
    }

    const inserted = await query(`
      INSERT INTO tabel_pedagang (pabrik_id, nama_pedagang, no_telepon, alamat, limit_piutang, saldo_piutang)
      VALUES (?, ?, ?, ?, ?, 0)
      RETURNING *
    `, [Number(pabrik_id), nama_pedagang, no_telepon || '', alamat || '', Number(limit_piutang) || 0]);

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
