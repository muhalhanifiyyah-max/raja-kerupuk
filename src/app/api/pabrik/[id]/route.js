import { NextResponse } from 'next/server';
import { query, queryOne } from '@/supabase';
import { invalidateConsolidationCache } from '@/accounting';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const pabrik = await queryOne(`SELECT * FROM tabel_pabrik WHERE id = ?`, [Number(id)]);
    if (!pabrik) {
      return NextResponse.json({ success: false, error: 'Pabrik tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: pabrik });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nama_pabrik, alamat, telepon, penanggung_jawab } = body;

    if (!nama_pabrik) {
      return NextResponse.json({ success: false, error: 'Nama pabrik wajib diisi' }, { status: 400 });
    }

    const updated = await query(`
      UPDATE tabel_pabrik 
      SET nama_pabrik = ?, alamat = ?, telepon = ?, penanggung_jawab = ?
      WHERE id = ?
      RETURNING *
    `, [nama_pabrik, alamat || '', telepon || '', penanggung_jawab || '', Number(id)]);

    if (!updated || updated.length === 0) {
      return NextResponse.json({ success: false, error: 'Pabrik tidak ditemukan' }, { status: 404 });
    }

    invalidateConsolidationCache();

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    
    // Pastikan pabrik ada
    const pabrik = await queryOne(`SELECT id, nama_pabrik FROM tabel_pabrik WHERE id = ?`, [Number(id)]);
    if (!pabrik) {
      return NextResponse.json({ success: false, error: 'Pabrik tidak ditemukan' }, { status: 404 });
    }

    // Hapus pabrik (CASCADE akan otomatis menghapus pedagang, produk, akun, dan jurnal terkait)
    await query(`DELETE FROM tabel_pabrik WHERE id = ?`, [Number(id)]);

    invalidateConsolidationCache();

    return NextResponse.json({ 
      success: true, 
      message: `Pabrik "${pabrik.nama_pabrik}" dan seluruh data terkait berhasil dihapus.` 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
