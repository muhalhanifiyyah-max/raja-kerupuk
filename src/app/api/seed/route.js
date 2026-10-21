import { NextResponse } from 'next/server';
import { query, queryOne, queryAll } from '@/supabase';
import { 
  initFactoryCOA, 
  setorModalAwal, 
  beliPeralatan, 
  beliPersediaan, 
  distribusiBarang, 
  setorPembayaranPedagang 
} from '@/accounting';

export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine
    }

    // Opsi seeding khusus Pabrik Kerupuk Depok
    if (body?.factory === 'depok' || body?.resetDepok) {
      const pDepok = (await query(`
        SELECT * FROM tabel_pabrik WHERE id = 1 OR nama_pabrik ILIKE '%Depok%' LIMIT 1
      `))[0];

      if (pDepok) {
        return NextResponse.json({
          success: true,
          message: 'Pabrik Kerupuk Depok sudah aktif dengan data transaksi lengkap.',
          factory: pDepok
        });
      }
    }

    // Cek apakah sudah ada data pabrik
    const existing = await queryAll(`SELECT id, nama_pabrik FROM tabel_pabrik`);
    if (existing.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database sudah memiliki data pabrik', 
        factories: existing 
      });
    }

    // 1. Buat Pabrik A (Sidoarjo)
    const p1 = (await query(`
      INSERT INTO tabel_pabrik (nama_pabrik, alamat, telepon, penanggung_jawab)
      VALUES ('Pabrik Kerupuk Berkah', 'Jl. Industri No. 12, Waru, Sidoarjo', '0812-3456-7890', 'H. Syafi''i')
      RETURNING *
    `))[0];

    await initFactoryCOA(p1.id);
    await setorModalAwal(p1.id, {
      nominal: 100000000,
      tanggal: '2026-09-01',
      keterangan: 'Penyetoran Modal Awal Pabrik Kerupuk Berkah'
    });

    await beliPeralatan(p1.id, {
      namaItem: 'Mesin Pemotong & Pencetak Kerupuk Otomatis',
      harga: 25000000,
      qty: 1,
      tanggal: '2026-09-03',
      keterangan: 'Investasi Mesin Cetak Kerupuk Kapasitas 500kg/hari'
    });

    // Produk Pabrik 1
    const prod1 = (await query(`
      INSERT INTO tabel_produk (pabrik_id, nama_produk, kategori, satuan, harga_beli, harga_jual, stok)
      VALUES (?, 'Kerupuk Udang Super', 'Kerupuk Udang', 'Bal', 95000, 135000, 0) RETURNING *
    `, [p1.id]))[0];

    const prod2 = (await query(`
      INSERT INTO tabel_produk (pabrik_id, nama_produk, kategori, satuan, harga_beli, harga_jual, stok)
      VALUES (?, 'Kerupuk Bawang Renyah', 'Kerupuk Bawang', 'Bal', 42000, 62000, 0) RETURNING *
    `, [p1.id]))[0];

    const prod3 = (await query(`
      INSERT INTO tabel_produk (pabrik_id, nama_produk, kategori, satuan, harga_beli, harga_jual, stok)
      VALUES (?, 'Kerupuk Ikan Tenggiri', 'Kerupuk Ikan', 'Bal', 115000, 165000, 0) RETURNING *
    `, [p1.id]))[0];

    // Belanja persediaan stok
    await beliPersediaan(p1.id, {
      produkId: prod1.id,
      qty: 200,
      hargaBeli: 95000,
      tanggal: '2026-09-05',
      keterangan: 'Belanja bahan baku & stok Kerupuk Udang Super 200 Bal'
    });

    await beliPersediaan(p1.id, {
      produkId: prod2.id,
      qty: 350,
      hargaBeli: 42000,
      tanggal: '2026-09-06',
      keterangan: 'Belanja persediaan Kerupuk Bawang Renyah 350 Bal'
    });

    await beliPersediaan(p1.id, {
      produkId: prod3.id,
      qty: 150,
      hargaBeli: 115000,
      tanggal: '2026-09-07',
      keterangan: 'Belanja persediaan Kerupuk Ikan Tenggiri 150 Bal'
    });

    // Pedagang Pabrik 1
    const ped1 = (await query(`
      INSERT INTO tabel_pedagang (pabrik_id, nama_pedagang, no_telepon, alamat, limit_piutang, saldo_piutang)
      VALUES (?, 'Cak Nanang (Grosir Waru)', '0857-1122-3344', 'Pasar Waru Blok B-14', 25000000, 0) RETURNING *
    `, [p1.id]))[0];

    const ped2 = (await query(`
      INSERT INTO tabel_pedagang (pabrik_id, nama_pedagang, no_telepon, alamat, limit_piutang, saldo_piutang)
      VALUES (?, 'Bu Siti (Pasar Larangan)', '0813-9988-7766', 'Kios Bu Siti, Pasar Larangan', 15000000, 0) RETURNING *
    `, [p1.id]))[0];

    const ped3 = (await query(`
      INSERT INTO tabel_pedagang (pabrik_id, nama_pedagang, no_telepon, alamat, limit_piutang, saldo_piutang)
      VALUES (?, 'Mas Joko (Warung Makan Sentosa)', '0821-4455-6677', 'Jl. Raya Tropodo No. 45', 10000000, 0) RETURNING *
    `, [p1.id]))[0];

    // Distribusi ke pedagang (Pemberian Piutang)
    await distribusiBarang(p1.id, {
      pedagangId: ped1.id,
      produkId: prod1.id,
      qty: 40,
      hargaJual: 135000,
      tanggal: '2026-09-12',
      keterangan: 'Pengiriman 40 Bal Kerupuk Udang ke Cak Nanang'
    });

    await distribusiBarang(p1.id, {
      pedagangId: ped1.id,
      produkId: prod2.id,
      qty: 60,
      hargaJual: 62000,
      tanggal: '2026-09-15',
      keterangan: 'Pengiriman 60 Bal Kerupuk Bawang ke Cak Nanang'
    });

    await distribusiBarang(p1.id, {
      pedagangId: ped2.id,
      produkId: prod3.id,
      qty: 30,
      hargaJual: 165000,
      tanggal: '2026-09-18',
      keterangan: 'Pengiriman 30 Bal Kerupuk Tenggiri ke Bu Siti'
    });

    // Setoran pembayaran pedagang
    await setorPembayaranPedagang(p1.id, {
      pedagangId: ped1.id,
      nominal: 4500000,
      tanggal: '2026-09-25',
      keterangan: 'Setoran hasil penjualan termin 1 Cak Nanang'
    });

    await setorPembayaranPedagang(p1.id, {
      pedagangId: ped2.id,
      nominal: 2000000,
      tanggal: '2026-09-28',
      keterangan: 'Setoran sebagian Bu Siti'
    });

    // 2. Buat Pabrik B (Cirebon)
    const p2 = (await query(`
      INSERT INTO tabel_pabrik (nama_pabrik, alamat, telepon, penanggung_jawab)
      VALUES ('Pabrik Kerupuk Melati', 'Jl. Kalitanjung No. 88, Harjamukti, Cirebon', '0819-8765-4321', 'Ibu Melati')
      RETURNING *
    `))[0];

    await initFactoryCOA(p2.id);
    await setorModalAwal(p2.id, {
      nominal: 75000000,
      tanggal: '2026-09-02',
      keterangan: 'Penyetoran Modal Awal Pabrik Melati Cirebon'
    });

    await beliPeralatan(p2.id, {
      namaItem: 'Wajan Penggorengan Pasir & Kaleng Tradisional',
      harga: 16000000,
      qty: 1,
      tanggal: '2026-09-04',
      keterangan: 'Peralatan penggorengan pasir higienis'
    });

    const prodB1 = (await query(`
      INSERT INTO tabel_produk (pabrik_id, nama_produk, kategori, satuan, harga_beli, harga_jual, stok)
      VALUES (?, 'Kerupuk Melarat Gurih', 'Kerupuk Melarat', 'Bal', 30000, 48000, 0) RETURNING *
    `, [p2.id]))[0];

    await beliPersediaan(p2.id, {
      produkId: prodB1.id,
      qty: 300,
      hargaBeli: 30000,
      tanggal: '2026-09-10',
      keterangan: 'Stok awal Kerupuk Melarat Gurih 300 Bal'
    });

    const pedB1 = (await query(`
      INSERT INTO tabel_pedagang (pabrik_id, nama_pedagang, no_telepon, alamat, limit_piutang, saldo_piutang)
      VALUES (?, 'Pak Haji Ujang', '0818-7766-5544', 'Pasar Kanoman Kios 5', 18000000, 0) RETURNING *
    `, [p2.id]))[0];

    await distribusiBarang(p2.id, {
      pedagangId: pedB1.id,
      produkId: prodB1.id,
      qty: 50,
      hargaJual: 48000,
      tanggal: '2026-09-20',
      keterangan: 'Drop 50 Bal Kerupuk Melarat ke Pak Haji Ujang'
    });

    await setorPembayaranPedagang(p2.id, {
      pedagangId: pedB1.id,
      nominal: 1200000,
      tanggal: '2026-09-29',
      keterangan: 'Setoran tunai Pak Haji Ujang'
    });

    // 3. Buat Pabrik C (Solo)
    const p3 = (await query(`
      INSERT INTO tabel_pabrik (nama_pabrik, alamat, telepon, penanggung_jawab)
      VALUES ('Pabrik Kerupuk Sumber Rejeki', 'Jl. Slamet Riyadi No. 201, Solo', '0815-4433-2211', 'Bambang Tri')
      RETURNING *
    `))[0];

    await initFactoryCOA(p3.id);
    await setorModalAwal(p3.id, {
      nominal: 60000000,
      tanggal: '2026-09-05',
      keterangan: 'Penyetoran Modal Awal Pabrik Sumber Rejeki Solo'
    });

    return NextResponse.json({
      success: true,
      message: 'Data demo multi-pabrik berhasil dimuat ke Supabase!',
      factories: [p1, p2, p3]
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
