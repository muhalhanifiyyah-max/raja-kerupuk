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
      SELECT * FROM tabel_produk 
      WHERE pabrik_id = ? 
      ORDER BY nama_produk ASC
    `, [Number(pabrikId)]);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { pabrik_id, nama_produk, kategori, satuan, harga_beli, harga_jual, stok } = body;

    if (!pabrik_id || !nama_produk || !harga_beli || !harga_jual) {
      return NextResponse.json({ success: false, error: 'Data produk belum lengkap' }, { status: 400 });
    }

    const inserted = await query(`
      INSERT INTO tabel_produk (pabrik_id, nama_produk, kategori, satuan, harga_beli, harga_jual, stok)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [
      Number(pabrik_id), 
      nama_produk, 
      kategori || 'Kerupuk', 
      satuan || 'Bal', 
      Number(harga_beli), 
      Number(harga_jual), 
      Number(stok) || 0
    ]);

    return NextResponse.json({ success: true, data: inserted[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
