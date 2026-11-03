import { NextResponse } from 'next/server';
import { query, queryAll } from '@/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with'
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pabrikId = searchParams.get('pabrik_id');

    if (!pabrikId) {
      return NextResponse.json({ success: false, error: 'pabrik_id diperlukan' }, { status: 400, headers: corsHeaders });
    }

    const data = await queryAll(`
      SELECT * FROM tabel_produk 
      WHERE pabrik_id = ? 
      ORDER BY nama_produk ASC
    `, [Number(pabrikId)]);

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
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

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, nama_produk, kategori, satuan, harga_beli, harga_jual, stok, pabrik_id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID produk diperlukan' }, { status: 400 });
    }

    const prodId = Number(id);

    // Ambil data produk sebelumnya jika ada field yang tidak dikirim
    const existing = (await query(`SELECT * FROM tabel_produk WHERE id = ?`, [prodId]))[0];
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan' }, { status: 404 });
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

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID produk diperlukan' }, { status: 400 });
    }

    const prodId = Number(id);

    // Unlink foreign keys safely if any
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
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan atau gagal dihapus' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Produk berhasil dihapus dari persediaan' }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
