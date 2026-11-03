import { NextResponse } from 'next/server';
import { query, queryOne } from '@/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with'
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const prod = await queryOne(`SELECT * FROM tabel_produk WHERE id = ?`, [Number(id)]);
    if (!prod) {
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan' }, { status: 404, headers: corsHeaders });
    }
    return NextResponse.json({ success: true, data: prod }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const prodId = Number(id);
    const body = await request.json();
    const { nama_produk, kategori, satuan, harga_beli, harga_jual, stok } = body;

    const existing = await queryOne(`SELECT * FROM tabel_produk WHERE id = ?`, [prodId]);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan' }, { status: 404, headers: corsHeaders });
    }

    const updatedNama = nama_produk !== undefined ? nama_produk : existing.nama_produk;
    const updatedKategori = kategori !== undefined ? kategori : existing.kategori;
    const updatedSatuan = satuan !== undefined ? satuan : existing.satuan;
    const updatedHargaBeli = harga_beli !== undefined ? Number(harga_beli) : Number(existing.harga_beli);
    const updatedHargaJual = harga_jual !== undefined ? Number(harga_jual) : Number(existing.harga_jual);
    const updatedStok = stok !== undefined ? Number(stok) : Number(existing.stok);

    const updated = await query(`
      UPDATE tabel_produk
      SET 
        nama_produk = ?,
        kategori = ?,
        satuan = ?,
        harga_beli = ?,
        harga_jual = ?,
        stok = ?
      WHERE id = ?
      RETURNING *
    `, [
      updatedNama,
      updatedKategori,
      updatedSatuan,
      updatedHargaBeli,
      updatedHargaJual,
      updatedStok,
      prodId
    ]);

    return NextResponse.json({ success: true, data: updated[0] }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const prodId = Number(id);

    try {
      await query(`UPDATE tabel_transaksi_pembelian SET produk_id = NULL WHERE produk_id = ?`, [prodId]);
    } catch {}
    try {
      await query(`UPDATE tabel_transaksi_distribusi SET produk_id = NULL WHERE produk_id = ?`, [prodId]);
    } catch {}

    const deleted = await query(`
      DELETE FROM tabel_produk 
      WHERE id = ?
      RETURNING *
    `, [prodId]);

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan atau gagal dihapus' }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, message: 'Produk berhasil dihapus dari persediaan' }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
