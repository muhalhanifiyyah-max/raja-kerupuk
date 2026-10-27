import { NextResponse } from 'next/server';
import { query, queryOne, queryAll } from '@/supabase';
import { distribusiBarang, setorPembayaranPedagang } from '@/accounting';
import fs from 'node:fs';
import path from 'node:path';

// Helper simpan base64 foto ke public/uploads/
function saveBase64Image(base64Str) {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return base64Str; // sudah berupa URL atau kosong
  }
  try {
    const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Str;

    const ext = matches[1].replace('jpeg', 'jpg');
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `drop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.warn('Gagal menyimpan file foto bukti, fallback ke raw string:', err.message);
    return base64Str;
  }
}

// GET: Ambil daftar riwayat check-point drop
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pedagangId = searchParams.get('pedagang_id');
    const pabrikId = searchParams.get('pabrik_id');

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (pedagangId) {
      whereClause += ' AND td.pedagang_id = ?';
      params.push(Number(pedagangId));
    }

    if (pabrikId && pabrikId !== 'all') {
      whereClause += ' AND td.pabrik_id = ?';
      params.push(Number(pabrikId));
    }

    const rows = await queryAll(`
      SELECT 
        td.id,
        td.pabrik_id,
        tpab.nama_pabrik,
        td.pedagang_id,
        tped.nama_pedagang,
        tped.no_telepon as telp_pedagang,
        td.produk_id,
        tprod.nama_produk,
        tprod.satuan,
        td.qty,
        td.harga_jual,
        td.total_jual,
        td.tanggal,
        td.keterangan,
        td.created_at
      FROM tabel_transaksi_distribusi td
      LEFT JOIN tabel_pabrik tpab ON td.pabrik_id = tpab.id
      LEFT JOIN tabel_pedagang tped ON td.pedagang_id = tped.id
      LEFT JOIN tabel_produk tprod ON td.produk_id = tprod.id
      ${whereClause}
      ORDER BY td.tanggal DESC, td.id DESC
      LIMIT 100
    `, params);

    // Parse metadata checkpoint dari keterangan JSON
    const checkPoints = rows.map((r) => {
      let meta = {};
      try {
        if (r.keterangan && r.keterangan.startsWith('{')) {
          meta = JSON.parse(r.keterangan);
        }
      } catch {
        meta = {};
      }

      return {
        id: r.id,
        pabrik_id: r.pabrik_id,
        nama_pabrik: r.nama_pabrik,
        pedagang_id: r.pedagang_id,
        nama_pedagang: r.nama_pedagang,
        telp_pedagang: r.telp_pedagang,
        produk_id: r.produk_id,
        nama_produk: r.nama_produk,
        satuan: r.satuan || 'Bal',
        qty: Number(r.qty) || 0,
        harga_jual: Number(r.harga_jual) || 0,
        total_jual: Number(r.total_jual) || 0,
        tanggal: r.tanggal,
        created_at: r.created_at,
        nama_warung: meta.nama_warung || 'Warung Mitra Rekanan',
        alamat_warung: meta.alamat_warung || '',
        latitude: meta.latitude || null,
        longitude: meta.longitude || null,
        akurasi_meter: meta.akurasi || null,
        foto_bukti: meta.foto_bukti || null,
        metode_bayar: meta.metode_bayar || 'piutang',
        catatan: meta.catatan || (meta.nama_warung ? '' : r.keterangan)
      };
    });

    return NextResponse.json({
      success: true,
      checkPoints
    });
  } catch (error) {
    console.error('GET /api/checkpoint error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Simpan check-point drop kerupuk baru dari pedagang
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      pedagang_id,
      pabrik_id,
      nama_warung,
      alamat_warung,
      produk_id,
      qty,
      harga_jual,
      metode_bayar,
      latitude,
      longitude,
      akurasi_meter,
      foto_bukti,
      catatan,
      tanggal
    } = body;

    if (!pedagang_id || !produk_id || !qty || Number(qty) <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Data wajib belum lengkap (Pedagang, Produk, dan Qty drop harus diisi).'
      }, { status: 400 });
    }

    const pedagangIdNum = Number(pedagang_id);
    const produkIdNum = Number(produk_id);
    const qtyNum = Number(qty);

    // Ambil info pedagang untuk pabrik_id
    const pedagang = await queryOne('SELECT * FROM tabel_pedagang WHERE id = ?', [pedagangIdNum]);
    if (!pedagang) {
      return NextResponse.json({ success: false, error: 'Pedagang tidak ditemukan' }, { status: 404 });
    }

    const pabrikIdNum = Number(pabrik_id || pedagang.pabrik_id);
    const prod = await queryOne('SELECT * FROM tabel_produk WHERE id = ? AND pabrik_id = ?', [produkIdNum, pabrikIdNum]);
    if (!prod) {
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan di pabrik ini' }, { status: 404 });
    }

    const tgl = tanggal || new Date().toISOString().slice(0, 10);
    const unitJual = harga_jual ? Number(harga_jual) : Number(prod.harga_jual);
    const totalJual = qtyNum * unitJual;

    // Simpan foto bukti jika ada
    let finalFotoUrl = null;
    if (foto_bukti) {
      finalFotoUrl = saveBase64Image(foto_bukti);
    }

    // Susun metadata checkpoint
    const metaCheckpoint = {
      tipe: 'CHECKPOINT_DROP',
      nama_warung: nama_warung || 'Warung Rekanan',
      alamat_warung: alamat_warung || '',
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      akurasi: akurasi_meter ? Number(akurasi_meter) : null,
      foto_bukti: finalFotoUrl,
      catatan: catatan || '',
      metode_bayar: metode_bayar || 'piutang'
    };

    const keteranganStr = JSON.stringify(metaCheckpoint);

    // 1. Eksekusi distribusi barang (double-entry otomatis & update stok produk)
    const distResult = await distribusiBarang(pabrikIdNum, {
      pedagangId: pedagangIdNum,
      produkId: produkIdNum,
      qty: qtyNum,
      hargaJual: unitJual,
      tanggal: tgl,
      keterangan: keteranganStr
    });

    // 2. Jika metode bayar tunai / cash di tempat, langsung catat setoran pembayaran
    let setorResult = null;
    if (metode_bayar === 'tunai') {
      try {
        setorResult = await setorPembayaranPedagang(pabrikIdNum, {
          pedagangId: pedagangIdNum,
          nominal: totalJual,
          tanggal: tgl,
          keterangan: `Pembayaran Tunai Lunas saat Drop di ${nama_warung || 'Warung Rekanan'}`
        });
      } catch (err) {
        console.warn('Gagal mencatat setoran tunai otomatis:', err.message);
      }
    }

    // Ambil saldo terbaru pedagang
    const updatedPedagang = await queryOne('SELECT saldo_piutang, limit_piutang FROM tabel_pedagang WHERE id = ?', [pedagangIdNum]);

    return NextResponse.json({
      success: true,
      message: `Check-point drop ${qtyNum} ${prod.satuan || 'Bal'} ${prod.nama_produk} di ${nama_warung || 'Warung'} berhasil dicatat!`,
      distribusiId: distResult?.jurnalId,
      nomorBukti: distResult?.nomorBukti,
      fotoUrl: finalFotoUrl,
      saldoPiutangSaatIni: updatedPedagang?.saldo_piutang || 0,
      metodeBayar: metode_bayar || 'piutang'
    });
  } catch (error) {
    console.error('POST /api/checkpoint error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
