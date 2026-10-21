const { query, queryOne, queryAll } = require('../src/supabase');
const { 
  initFactoryCOA, 
  setorModalAwal, 
  beliPeralatan, 
  beliPersediaan, 
  distribusiBarang, 
  setorPembayaranPedagang,
  catatBebanOperasional
} = require('../src/accounting');
const { hashPassword } = require('../src/lib/auth');

async function seedDepok() {
  console.log('🚀 Memulai pembuatan mock data untuk Pabrik Kerupuk Depok...');

  // 1. Dapatkan atau buat Pabrik Kerupuk Depok
  let pabrik = await queryOne(`SELECT * FROM tabel_pabrik WHERE id = 1 OR nama_pabrik ILIKE '%Depok%' LIMIT 1`);
  if (!pabrik) {
    pabrik = (await query(`
      INSERT INTO tabel_pabrik (nama_pabrik, alamat, telepon, penanggung_jawab)
      VALUES ('Pabrik Kerupuk Depok', 'Jl. Margonda Raya No. 128, Kemiri Muka, Beji, Depok', '0812-3456-7890', 'Bpk. Ahmad Fauzi')
      RETURNING *
    `))[0];
    console.log(`✅ Pabrik Kerupuk Depok berhasil dibuat (ID: ${pabrik.id})`);
  } else {
    // Update alamat & penanggung jawab agar lengkap
    await query(`
      UPDATE tabel_pabrik 
      SET alamat = 'Jl. Margonda Raya No. 128, Kemiri Muka, Beji, Depok',
          penanggung_jawab = 'Bpk. Ahmad Fauzi',
          telepon = '0812-3456-7890'
      WHERE id = ?
    `, [pabrik.id]);
    console.log(`ℹ️ Menggunakan Pabrik Kerupuk Depok (ID: ${pabrik.id})`);
  }

  const pabrikId = pabrik.id;

  // 2. Pastikan COA (Chart of Accounts) terinisialisasi
  await initFactoryCOA(pabrikId);
  console.log('✅ Akun Perkiraan (COA) terverifikasi.');

  // 3. User Admin Pabrik Depok
  const existingUser = await queryOne(`SELECT * FROM tabel_pengguna WHERE username = 'admin_depok'`);
  if (!existingUser) {
    const passwordHash = hashPassword('admin123');
    await query(`
      INSERT INTO tabel_pengguna (nama, email, username, password, role, pabrik_id, status)
      VALUES ('Admin Pabrik Depok', 'depok@rajakerupuk.com', 'admin_depok', ?, 'admin_pabrik', ?, 'aktif')
    `, [passwordHash, pabrikId]);
    console.log('✅ User admin_depok (password: admin123) berhasil dibuat.');
  }

  // 4. Update / Buat Master Data Pedagang Depok
  const pedagangList = [
    { nama: 'Toko Berkah Margonda (Pasar Kemiri Muka)', telp: '0812-8877-6655', alamat: 'Kios Pasar Kemiri Muka Blok B-08, Margonda', limit: 25000000 },
    { nama: 'Ibu Ratna (Pasar Cisalak Depok)', telp: '0813-2233-4455', alamat: 'Pasar Cisalak Kios 14, Cimanggis, Depok', limit: 20000000 },
    { nama: 'Bang Udin (Grosir Sawangan)', telp: '0857-9988-1122', alamat: 'Jl. Raya Sawangan No. 42, Sawangan, Depok', limit: 15000000 },
    { nama: 'Warung Makan Bu Dewi (Cinere)', telp: '0821-3344-5566', alamat: 'Jl. Cinere Raya No. 18, Cinere, Depok', limit: 10000000 }
  ];

  const peds = [];
  for (const p of pedagangList) {
    let ped = await queryOne(`SELECT * FROM tabel_pedagang WHERE pabrik_id = ? AND nama_pedagang = ?`, [pabrikId, p.nama]);
    if (!ped) {
      ped = (await query(`
        INSERT INTO tabel_pedagang (pabrik_id, nama_pedagang, no_telepon, alamat, limit_piutang, saldo_piutang)
        VALUES (?, ?, ?, ?, ?, 0)
        RETURNING *
      `, [pabrikId, p.nama, p.telp, p.alamat, p.limit]))[0];
    } else {
      await query(`UPDATE tabel_pedagang SET limit_piutang = ?, alamat = ?, no_telepon = ? WHERE id = ?`, [p.limit, p.alamat, p.telp, ped.id]);
    }
    peds.push(ped);
  }
  console.log(`✅ ${peds.length} Master Data Pedagang Depok siap.`);

  // 5. Update / Buat Master Data Produk
  const produkList = [
    { nama: 'Kerupuk Udang Super', kategori: 'Kerupuk Udang', satuan: 'Bal', hargaBeli: 95000, hargaJual: 135000 },
    { nama: 'Kerupuk Bawang Renyah', kategori: 'Kerupuk Bawang', satuan: 'Bal', hargaBeli: 42000, hargaJual: 62000 },
    { nama: 'Kerupuk Ikan Tenggiri', kategori: 'Kerupuk Ikan', satuan: 'Bal', hargaBeli: 115000, hargaJual: 165000 },
    { nama: 'Kerupuk Putih Kaleng (Warung)', kategori: 'Kerupuk Putih', satuan: 'Kaleng', hargaBeli: 35000, hargaJual: 55000 },
    { nama: 'Kerupuk Kulit Sapi Asli', kategori: 'Kerupuk Kulit', satuan: 'Bal', hargaBeli: 75000, hargaJual: 110000 }
  ];

  const prods = [];
  for (const pr of produkList) {
    let prod = await queryOne(`SELECT * FROM tabel_produk WHERE pabrik_id = ? AND nama_produk = ?`, [pabrikId, pr.nama]);
    if (!prod) {
      prod = (await query(`
        INSERT INTO tabel_produk (pabrik_id, nama_produk, kategori, satuan, harga_beli, harga_jual, stok)
        VALUES (?, ?, ?, ?, ?, ?, 0)
        RETURNING *
      `, [pabrikId, pr.nama, pr.kategori, pr.satuan, pr.hargaBeli, pr.hargaJual]))[0];
    } else {
      await query(`UPDATE tabel_produk SET harga_beli = ?, harga_jual = ?, kategori = ?, satuan = ? WHERE id = ?`, 
        [pr.hargaBeli, pr.hargaJual, pr.kategori, pr.satuan, prod.id]);
    }
    prods.push(prod);
  }
  console.log(`✅ ${prods.length} Master Data Produk Kerupuk siap.`);

  // 6. Transaksi Akuntansi & Siklus Bisnis
  // Cek apakah sudah ada transaksi jurnal
  const existingJurnal = await queryOne(`SELECT count(*) as count FROM tabel_jurnal_transaksi WHERE pabrik_id = ?`, [pabrikId]);
  if (Number(existingJurnal?.count) > 0) {
    console.log(`ℹ️ Pabrik Depok sudah memiliki ${existingJurnal.count} transaksi jurnal. Melewati pembuatan ulang.`);
    return;
  }

  console.log('📌 Memproses siklus transaksi akuntansi terverifikasi...');

  // A. Setor Modal Awal Pemilik
  await setorModalAwal(pabrikId, {
    nominal: 100000000,
    tanggal: '2026-10-01',
    keterangan: 'Penyetoran Modal Awal Usaha Pabrik Kerupuk Depok'
  });
  console.log('  1. Modal Awal disetor: Rp 100.000.000');

  // B. Investasi Peralatan Pabrik (Aset Tetap)
  await beliPeralatan(pabrikId, {
    namaItem: 'Mesin Pencetak & Pemotong Kerupuk Otomatis',
    harga: 22000000,
    qty: 1,
    tanggal: '2026-10-02',
    keterangan: 'Pengadaan mesin cetak kapasitas 500kg/hari'
  });

  await beliPeralatan(pabrikId, {
    namaItem: 'Oven Pengering & Wajan Stainless Steel',
    harga: 8000000,
    qty: 1,
    tanggal: '2026-10-03',
    keterangan: 'Pengadaan oven pengering kerupuk higienis'
  });
  console.log('  2. Investasi Peralatan (Aset Tetap): Rp 30.000.000');

  // C. Pembelian Persediaan (Stok Gudang)
  // prod 0: Udang (150 bal)
  await beliPersediaan(pabrikId, {
    produkId: prods[0].id,
    qty: 150,
    hargaBeli: 95000,
    tanggal: '2026-10-05',
    keterangan: 'Beli stok Kerupuk Udang Super 150 Bal'
  });

  // prod 1: Bawang (300 bal)
  await beliPersediaan(pabrikId, {
    produkId: prods[1].id,
    qty: 300,
    hargaBeli: 42000,
    tanggal: '2026-10-05',
    keterangan: 'Beli persediaan Kerupuk Bawang Renyah 300 Bal'
  });

  // prod 2: Tenggiri (120 bal)
  await beliPersediaan(pabrikId, {
    produkId: prods[2].id,
    qty: 120,
    hargaBeli: 115000,
    tanggal: '2026-10-06',
    keterangan: 'Beli persediaan Kerupuk Ikan Tenggiri 120 Bal'
  });

  // prod 3: Putih Kaleng (200 kaleng)
  await beliPersediaan(pabrikId, {
    produkId: prods[3].id,
    qty: 200,
    hargaBeli: 35000,
    tanggal: '2026-10-06',
    keterangan: 'Beli stok Kerupuk Putih Kaleng 200 Kaleng'
  });

  // prod 4: Kulit Sapi (100 bal)
  await beliPersediaan(pabrikId, {
    produkId: prods[4].id,
    qty: 100,
    hargaBeli: 75000,
    tanggal: '2026-10-07',
    keterangan: 'Beli stok Kerupuk Kulit Sapi Asli 100 Bal'
  });
  console.log('  3. Belanja Persediaan (5 Produk): Rp 55.150.000');

  // D. Distribusi Penjualan ke Pedagang Depok (Pemberian Piutang)
  // Toko Berkah Margonda
  await distribusiBarang(pabrikId, {
    pedagangId: peds[0].id,
    produkId: prods[0].id,
    qty: 40,
    hargaJual: 135000,
    tanggal: '2026-10-08',
    keterangan: 'Pengiriman 40 Bal Kerupuk Udang ke Toko Berkah Margonda'
  });

  await distribusiBarang(pabrikId, {
    pedagangId: peds[0].id,
    produkId: prods[1].id,
    qty: 80,
    hargaJual: 62000,
    tanggal: '2026-10-10',
    keterangan: 'Pengiriman 80 Bal Kerupuk Bawang ke Toko Berkah Margonda'
  });

  await distribusiBarang(pabrikId, {
    pedagangId: peds[0].id,
    produkId: prods[4].id,
    qty: 20,
    hargaJual: 110000,
    tanggal: '2026-10-10',
    keterangan: 'Pengiriman 20 Bal Kerupuk Kulit Sapi ke Toko Berkah Margonda'
  });

  // Ibu Ratna (Pasar Cisalak)
  await distribusiBarang(pabrikId, {
    pedagangId: peds[1].id,
    produkId: prods[2].id,
    qty: 35,
    hargaJual: 165000,
    tanggal: '2026-10-11',
    keterangan: 'Pengiriman 35 Bal Kerupuk Tenggiri ke Ibu Ratna'
  });

  await distribusiBarang(pabrikId, {
    pedagangId: peds[1].id,
    produkId: prods[1].id,
    qty: 60,
    hargaJual: 62000,
    tanggal: '2026-10-12',
    keterangan: 'Pengiriman 60 Bal Kerupuk Bawang ke Ibu Ratna Pasar Cisalak'
  });

  // Bang Udin (Sawangan)
  await distribusiBarang(pabrikId, {
    pedagangId: peds[2].id,
    produkId: prods[0].id,
    qty: 30,
    hargaJual: 135000,
    tanggal: '2026-10-13',
    keterangan: 'Drop 30 Bal Kerupuk Udang Super ke Bang Udin Sawangan'
  });

  await distribusiBarang(pabrikId, {
    pedagangId: peds[2].id,
    produkId: prods[3].id,
    qty: 60,
    hargaJual: 55000,
    tanggal: '2026-10-14',
    keterangan: 'Drop 60 Kaleng Kerupuk Putih ke Bang Udin Sawangan'
  });

  // Warung Makan Bu Dewi (Cinere)
  await distribusiBarang(pabrikId, {
    pedagangId: peds[3].id,
    produkId: prods[3].id,
    qty: 40,
    hargaJual: 55000,
    tanggal: '2026-10-15',
    keterangan: 'Distribusi 40 Kaleng Kerupuk ke Warung Bu Dewi Cinere'
  });
  console.log('  4. Distribusi Penjualan ke 4 Pedagang (Omset): Rp 31.605.000');

  // E. Setoran Pembayaran Pedagang (Pelunasan Piutang)
  await setorPembayaranPedagang(pabrikId, {
    pedagangId: peds[0].id,
    nominal: 8000000,
    tanggal: '2026-10-16',
    keterangan: 'Setoran termin 1 Toko Berkah Margonda'
  });

  await setorPembayaranPedagang(pabrikId, {
    pedagangId: peds[1].id,
    nominal: 5500000,
    tanggal: '2026-10-17',
    keterangan: 'Setoran tunai pedagang Pasar Cisalak (Ibu Ratna)'
  });

  await setorPembayaranPedagang(pabrikId, {
    pedagangId: peds[2].id,
    nominal: 4500000,
    tanggal: '2026-10-18',
    keterangan: 'Setoran penjualan kerupuk Bang Udin Sawangan'
  });

  await setorPembayaranPedagang(pabrikId, {
    pedagangId: peds[3].id,
    nominal: 1500000,
    tanggal: '2026-10-19',
    keterangan: 'Setoran kaleng kerupuk Bu Dewi Cinere'
  });
  console.log('  5. Setoran Pembayaran Piutang (Kas Masuk): Rp 19.500.000');

  // F. Biaya Operasional Pabrik
  await catatBebanOperasional(pabrikId, {
    namaBeban: 'Beban Listrik, Air & Kebersihan Pabrik',
    nominal: 1850000,
    tanggal: '2026-10-18',
    keterangan: 'Pembayaran tagihan listrik & air bulan Oktober 2026'
  });

  await catatBebanOperasional(pabrikId, {
    namaBeban: 'Pembelian Minyak Goreng & Gas Elpiji Industri',
    nominal: 2500000,
    tanggal: '2026-10-19',
    keterangan: 'Bahan bakar & minyak penggorengan kerupuk'
  });

  await catatBebanOperasional(pabrikId, {
    namaBeban: 'Pemeliharaan Mesin & Operasional Kendaraan',
    nominal: 750000,
    tanggal: '2026-10-20',
    keterangan: 'Servis rutin mesin pemotong kerupuk'
  });
  console.log('  6. Beban Operasional Pabrik: Rp 5.100.000');

  console.log('🎉 Mock data Pabrik Kerupuk Depok berhasil dibuat secara lengkap dan seimbang!');
}

seedDepok().catch(err => {
  console.error('❌ Gagal membuat mock data:', err);
  process.exit(1);
});
