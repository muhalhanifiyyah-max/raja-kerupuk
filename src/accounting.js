const { query, queryOne, queryAll, postgrestRequest } = require('./supabase');

// Standard Chart of Accounts (COA) Template
const DEFAULT_COA = [
  { kode: '1001', nama: 'Kas & Bank', tipe: 'aset_lancar', normal: 'debit' },
  { kode: '1002', nama: 'Piutang Dagang (Pedagang)', tipe: 'aset_lancar', normal: 'debit' },
  { kode: '1003', nama: 'Persediaan Barang Dagang (Kerupuk)', tipe: 'aset_lancar', normal: 'debit' },
  { kode: '1501', nama: 'Peralatan & Mesin Pabrik', tipe: 'aset_tetap', normal: 'debit' },
  { kode: '2001', nama: 'Utang Usaha', tipe: 'kewajiban', normal: 'kredit' },
  { kode: '3001', nama: 'Modal Disetor', tipe: 'ekuitas', normal: 'kredit' },
  { kode: '3002', nama: 'Laba Ditahan', tipe: 'ekuitas', normal: 'kredit' },
  { kode: '4001', nama: 'Pendapatan Penjualan Kerupuk', tipe: 'pendapatan', normal: 'kredit' },
  { kode: '5001', nama: 'Harga Pokok Penjualan (HPP)', tipe: 'beban', normal: 'debit' },
  { kode: '6001', nama: 'Beban Operasional & Pemeliharaan', tipe: 'beban', normal: 'debit' },
];

function generateNomorBukti(pabrikId, prefix) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-P${pabrikId}-${dateStr}-${rand}`;
}

async function initFactoryCOA(pabrikId) {
  const valueRows = DEFAULT_COA.map(item => 
    `(${pabrikId}, '${item.kode}', '${item.nama.replace(/'/g, "''")}', '${item.tipe}', '${item.normal}')`
  ).join(', ');
  
  await query(`
    INSERT INTO tabel_akun_perkiraan (pabrik_id, kode_akun, nama_akun, tipe_akun, saldo_normal)
    VALUES ${valueRows}
    ON CONFLICT (pabrik_id, kode_akun) DO NOTHING
  `);
}

async function getAccount(pabrikId, kodeAkun) {
  const row = await queryOne(
    `SELECT * FROM tabel_akun_perkiraan WHERE pabrik_id = ? AND kode_akun = ?`,
    [pabrikId, kodeAkun]
  );
  if (!row) {
    throw new Error(`Akun perkiraan dengan kode ${kodeAkun} untuk pabrik ${pabrikId} tidak ditemukan.`);
  }
  return row;
}

async function createJournalEntry({ pabrikId, tanggal, nomorBukti, tipeTransaksi, referensi, keterangan, entries }) {
  let totalDebit = 0;
  let totalKredit = 0;

  for (const entry of entries) {
    const debit = Number(entry.debit) || 0;
    const kredit = Number(entry.kredit) || 0;
    if (debit < 0 || kredit < 0) {
      throw new Error(`Nilai debit atau kredit tidak boleh negatif.`);
    }
    totalDebit += debit;
    totalKredit += kredit;
  }

  // Float precision tolerance
  if (Math.abs(totalDebit - totalKredit) > 0.01) {
    throw new Error(`Jurnal tidak seimbang! Total Debit: Rp ${totalDebit.toLocaleString('id-ID')} != Total Kredit: Rp ${totalKredit.toLocaleString('id-ID')}`);
  }

  if (totalDebit <= 0) {
    throw new Error(`Nominal transaksi jurnal harus lebih besar dari 0.`);
  }

  // Insert Header
  const header = await queryOne(`
    INSERT INTO tabel_jurnal_transaksi (pabrik_id, tanggal, nomor_bukti, tipe_transaksi, referensi, keterangan, total_nominal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING id
  `, [pabrikId, tanggal, nomorBukti, tipeTransaksi, referensi || '', keterangan || '', totalDebit]);

  const jurnalId = header.id;

  // Batch Insert Details in single query
  const detailRows = entries.map(e => 
    `(${jurnalId}, ${e.akunId}, ${Number(e.debit) || 0}, ${Number(e.kredit) || 0}, '${(e.catatan || '').replace(/'/g, "''")}')`
  ).join(', ');

  await query(`
    INSERT INTO tabel_jurnal_detail (jurnal_id, akun_id, debit, kredit, catatan)
    VALUES ${detailRows}
  `);

  invalidateConsolidationCache();

  return jurnalId;
}

async function getAccountBalance(pabrikId, akunId) {
  const account = await queryOne(`SELECT * FROM tabel_akun_perkiraan WHERE id = ? AND pabrik_id = ?`, [akunId, pabrikId]);
  if (!account) return 0;

  const mutasi = await queryOne(`
    SELECT 
      COALESCE(SUM(d.debit), 0)::numeric AS total_debit,
      COALESCE(SUM(d.kredit), 0)::numeric AS total_kredit
    FROM tabel_jurnal_detail d
    JOIN tabel_jurnal_transaksi j ON d.jurnal_id = j.id
    WHERE j.pabrik_id = ? AND d.akun_id = ?
  `, [pabrikId, akunId]);

  const totalDebit = Number(mutasi.total_debit) || 0;
  const totalKredit = Number(mutasi.total_kredit) || 0;

  if (account.saldo_normal === 'debit') {
    return totalDebit - totalKredit;
  } else {
    return totalKredit - totalDebit;
  }
}

// ----------------------
// TRANSAKSI BISNIS
// ----------------------

// A. Penyetoran Modal Awal
// Debit Kas (1001), Kredit Modal Disetor (3001)
async function setorModalAwal(pabrikId, { nominal, tanggal, keterangan, nomorBukti }) {
  nominal = Number(nominal);
  if (nominal <= 0) throw new Error('Nominal modal awal harus lebih besar dari 0');
  tanggal = tanggal || new Date().toISOString().slice(0, 10);
  nomorBukti = nomorBukti || generateNomorBukti(pabrikId, 'MODAL');

  await initFactoryCOA(pabrikId);
  const akunKas = await getAccount(pabrikId, '1001');
  const akunModal = await getAccount(pabrikId, '3001');

  const jurnalId = await createJournalEntry({
    pabrikId,
    tanggal,
    nomorBukti,
    tipeTransaksi: 'MODAL_AWAL',
    referensi: nomorBukti,
    keterangan: keterangan || `Penyetoran Modal Awal Pabrik`,
    entries: [
      { akunId: akunKas.id, debit: nominal, kredit: 0, catatan: 'Kas bertambah (Penyetoran Modal)' },
      { akunId: akunModal.id, debit: 0, kredit: nominal, catatan: 'Modal disetor bertambah' }
    ]
  });

  return { success: true, jurnalId, nomorBukti, nominal };
}

// B1. Pembelian Peralatan (Aset Tetap)
// Debit Peralatan (1501), Kredit Kas (1001)
async function beliPeralatan(pabrikId, { namaItem, harga, qty = 1, tanggal, keterangan, nomorBukti }) {
  harga = Number(harga);
  qty = Number(qty) || 1;
  const total = harga * qty;
  if (total <= 0) throw new Error('Total biaya pembelian peralatan harus lebih dari 0');
  tanggal = tanggal || new Date().toISOString().slice(0, 10);
  nomorBukti = nomorBukti || generateNomorBukti(pabrikId, 'ASET');

  const akunPeralatan = await getAccount(pabrikId, '1501');
  const akunKas = await getAccount(pabrikId, '1001');

  const kasBalance = await getAccountBalance(pabrikId, akunKas.id);
  if (kasBalance < total) {
    throw new Error(`Saldo Kas tidak mencukupi untuk pembelian peralatan! Kas saat ini: Rp ${kasBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${total.toLocaleString('id-ID')}`);
  }

  const jurnalId = await createJournalEntry({
    pabrikId,
    tanggal,
    nomorBukti,
    tipeTransaksi: 'BELI_PERALATAN',
    referensi: namaItem,
    keterangan: keterangan || `Pembelian Peralatan/Mesin: ${namaItem} (${qty} unit)`,
    entries: [
      { akunId: akunPeralatan.id, debit: total, kredit: 0, catatan: `Aset Tetap: ${namaItem}` },
      { akunId: akunKas.id, debit: 0, kredit: total, catatan: `Pengeluaran Kas pembelian aset` }
    ]
  });

  await query(`
    INSERT INTO tabel_transaksi_pembelian (pabrik_id, tanggal, jenis, nama_item, qty, harga_satuan, total, akun_kas_id, jurnal_id, keterangan)
    VALUES (?, ?, 'PERALATAN', ?, ?, ?, ?, ?, ?, ?)
  `, [pabrikId, tanggal, namaItem, qty, harga, total, akunKas.id, jurnalId, keterangan || '']);

  return { success: true, jurnalId, nomorBukti, total };
}

// B2. Pembelian Persediaan (Aset Lancar)
// Debit Persediaan (1003), Kredit Kas (1001)
async function beliPersediaan(pabrikId, { produkId, qty, hargaBeli, tanggal, keterangan, nomorBukti }) {
  qty = Number(qty);
  hargaBeli = Number(hargaBeli);
  if (qty <= 0 || hargaBeli <= 0) throw new Error('Qty dan Harga Beli harus lebih besar dari 0');
  const total = qty * hargaBeli;
  tanggal = tanggal || new Date().toISOString().slice(0, 10);
  nomorBukti = nomorBukti || generateNomorBukti(pabrikId, 'BELI');

  const prod = await queryOne(`SELECT * FROM tabel_produk WHERE id = ? AND pabrik_id = ?`, [produkId, pabrikId]);
  if (!prod) throw new Error('Produk tidak ditemukan');

  const akunPersediaan = await getAccount(pabrikId, '1003');
  const akunKas = await getAccount(pabrikId, '1001');

  const kasBalance = await getAccountBalance(pabrikId, akunKas.id);
  if (kasBalance < total) {
    throw new Error(`Saldo Kas tidak cukup untuk belanja stok! Kas saat ini: Rp ${kasBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${total.toLocaleString('id-ID')}`);
  }

  const jurnalId = await createJournalEntry({
    pabrikId,
    tanggal,
    nomorBukti,
    tipeTransaksi: 'BELI_PERSEDIAAN',
    referensi: prod.nama_produk,
    keterangan: keterangan || `Beli Persediaan: ${prod.nama_produk} (${qty} ${prod.satuan})`,
    entries: [
      { akunId: akunPersediaan.id, debit: total, kredit: 0, catatan: `Persediaan bertambah: ${prod.nama_produk}` },
      { akunId: akunKas.id, debit: 0, kredit: total, catatan: `Pengeluaran Kas pembelian persediaan` }
    ]
  });

  // Hitung rata-rata harga beli baru
  const stokLama = Number(prod.stok) || 0;
  const hargaBeliLama = Number(prod.harga_beli) || 0;
  const stokBaru = stokLama + qty;
  const totalNilaiBaru = (stokLama * hargaBeliLama) + total;
  const avgHargaBeli = stokBaru > 0 ? (totalNilaiBaru / stokBaru) : hargaBeli;

  await query(`
    UPDATE tabel_produk 
    SET stok = ?, harga_beli = ?
    WHERE id = ?
  `, [stokBaru, avgHargaBeli, produkId]);

  await query(`
    INSERT INTO tabel_transaksi_pembelian (pabrik_id, tanggal, jenis, nama_item, produk_id, qty, harga_satuan, total, akun_kas_id, jurnal_id, keterangan)
    VALUES (?, ?, 'PERSEDIAAN', ?, ?, ?, ?, ?, ?, ?, ?)
  `, [pabrikId, tanggal, prod.nama_produk, produkId, qty, hargaBeli, total, akunKas.id, jurnalId, keterangan || '']);

  return { success: true, jurnalId, nomorBukti, total, stokBaru };
}

// C. Distribusi Barang ke Pedagang (Pemberian Piutang)
// Double-entry:
// 1) Debit Piutang Dagang (Harga Jual), Kredit Pendapatan Penjualan (Harga Jual)
// 2) Debit HPP (Harga Modal), Kredit Persediaan (Harga Modal)
async function distribusiBarang(pabrikId, { pedagangId, produkId, qty, hargaJual, tanggal, keterangan, nomorBukti }) {
  qty = Number(qty);
  if (qty <= 0) throw new Error('Qty distribusi harus lebih besar dari 0');

  const pedagang = await queryOne(`SELECT * FROM tabel_pedagang WHERE id = ? AND pabrik_id = ?`, [pedagangId, pabrikId]);
  if (!pedagang) throw new Error('Data pedagang tidak ditemukan');

  const prod = await queryOne(`SELECT * FROM tabel_produk WHERE id = ? AND pabrik_id = ?`, [produkId, pabrikId]);
  if (!prod) throw new Error('Data produk tidak ditemukan');

  const stokTersedia = Number(prod.stok) || 0;
  if (stokTersedia < qty) {
    throw new Error(`Stok produk "${prod.nama_produk}" tidak mencukupi! Tersedia: ${stokTersedia} ${prod.satuan}, Permintaan: ${qty} ${prod.satuan}`);
  }

  const unitJual = hargaJual ? Number(hargaJual) : Number(prod.harga_jual);
  const totalJual = qty * unitJual;
  const unitHPP = Number(prod.harga_beli);
  const totalHPP = qty * unitHPP;

  const saldoPiutangSaatIni = Number(pedagang.saldo_piutang) || 0;
  const limitPiutang = Number(pedagang.limit_piutang) || 0;
  const proyeksiPiutang = saldoPiutangSaatIni + totalJual;

  if (limitPiutang > 0 && proyeksiPiutang > limitPiutang) {
    const sisaLimit = limitPiutang - saldoPiutangSaatIni;
    throw new Error(`Melebihi Limit Piutang! Pedagang ${pedagang.nama_pedagang} memiliki limit Rp ${limitPiutang.toLocaleString('id-ID')}, saldo piutang saat ini Rp ${saldoPiutangSaatIni.toLocaleString('id-ID')}. Sisa limit Rp ${Math.max(0, sisaLimit).toLocaleString('id-ID')}, transaksi ini: Rp ${totalJual.toLocaleString('id-ID')}.`);
  }

  tanggal = tanggal || new Date().toISOString().slice(0, 10);
  nomorBukti = nomorBukti || generateNomorBukti(pabrikId, 'DIST');

  const akunPiutang = await getAccount(pabrikId, '1002');
  const akunPendapatan = await getAccount(pabrikId, '4001');
  const akunHPP = await getAccount(pabrikId, '5001');
  const akunPersediaan = await getAccount(pabrikId, '1003');

  const entries = [
    { akunId: akunPiutang.id, debit: totalJual, kredit: 0, catatan: `Piutang dagang atas ${pedagang.nama_pedagang}` },
    { akunId: akunPendapatan.id, debit: 0, kredit: totalJual, catatan: `Pendapatan penjualan ${prod.nama_produk}` },
    { akunId: akunHPP.id, debit: totalHPP, kredit: 0, catatan: `Beban pokok penjualan ${prod.nama_produk} (${qty} ${prod.satuan})` },
    { akunId: akunPersediaan.id, debit: 0, kredit: totalHPP, catatan: `Pengurangan persediaan gudang` }
  ];

  const jurnalId = await createJournalEntry({
    pabrikId,
    tanggal,
    nomorBukti,
    tipeTransaksi: 'DISTRIBUSI_PENJUALAN',
    referensi: `${pedagang.nama_pedagang} - ${prod.nama_produk}`,
    keterangan: keterangan || `Distribusi ${qty} ${prod.satuan} ${prod.nama_produk} ke ${pedagang.nama_pedagang}`,
    entries
  });

  // Kurangi stok
  await query(`UPDATE tabel_produk SET stok = ? WHERE id = ?`, [stokTersedia - qty, produkId]);

  // Tambah piutang pedagang
  await query(`UPDATE tabel_pedagang SET saldo_piutang = ? WHERE id = ?`, [proyeksiPiutang, pedagangId]);

  // Simpan record distribusi
  await query(`
    INSERT INTO tabel_transaksi_distribusi (pabrik_id, tanggal, pedagang_id, produk_id, qty, harga_beli, harga_jual, total_jual, total_hpp, jurnal_id, keterangan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [pabrikId, tanggal, pedagangId, produkId, qty, unitHPP, unitJual, totalJual, totalHPP, jurnalId, keterangan || '']);

  return { 
    success: true, 
    jurnalId, 
    nomorBukti, 
    totalJual, 
    totalHPP, 
    sisaStok: stokTersedia - qty, 
    saldoPiutangBaru: proyeksiPiutang 
  };
}

// D. Pedagang Membayar/Menyetor Uang
// Debit Kas (1001), Kredit Piutang Dagang (1002)
async function setorPembayaranPedagang(pabrikId, { pedagangId, nominal, tanggal, keterangan, nomorBukti }) {
  nominal = Number(nominal);
  if (nominal <= 0) throw new Error('Nominal setoran pembayaran harus lebih besar dari 0');

  const pedagang = await queryOne(`SELECT * FROM tabel_pedagang WHERE id = ? AND pabrik_id = ?`, [pedagangId, pabrikId]);
  if (!pedagang) throw new Error('Data pedagang tidak ditemukan');

  tanggal = tanggal || new Date().toISOString().slice(0, 10);
  nomorBukti = nomorBukti || generateNomorBukti(pabrikId, 'SETOR');

  const akunKas = await getAccount(pabrikId, '1001');
  const akunPiutang = await getAccount(pabrikId, '1002');

  const jurnalId = await createJournalEntry({
    pabrikId,
    tanggal,
    nomorBukti,
    tipeTransaksi: 'SETORAN_PIUTANG',
    referensi: pedagang.nama_pedagang,
    keterangan: keterangan || `Penerimaan setoran pembayaran piutang dari ${pedagang.nama_pedagang}`,
    entries: [
      { akunId: akunKas.id, debit: nominal, kredit: 0, catatan: `Penerimaan kas dari ${pedagang.nama_pedagang}` },
      { akunId: akunPiutang.id, debit: 0, kredit: nominal, catatan: `Pelunasan piutang ${pedagang.nama_pedagang}` }
    ]
  });

  // Kurangi saldo piutang pedagang
  const sisaPiutangBaru = Math.max(0, (Number(pedagang.saldo_piutang) || 0) - nominal);
  await query(`UPDATE tabel_pedagang SET saldo_piutang = ? WHERE id = ?`, [sisaPiutangBaru, pedagangId]);

  // Simpan riwayat setoran
  await query(`
    INSERT INTO tabel_transaksi_setoran (pabrik_id, tanggal, pedagang_id, nominal, akun_kas_id, jurnal_id, keterangan)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [pabrikId, tanggal, pedagangId, nominal, akunKas.id, jurnalId, keterangan || '']);

  const updatedPedagang = await queryOne(`SELECT saldo_piutang FROM tabel_pedagang WHERE id = ?`, [pedagangId]);

  return { success: true, jurnalId, nomorBukti, nominal, sisaPiutang: Number(updatedPedagang.saldo_piutang) };
}

// E. Beban Operasional Lainnya (Listrik, Gaji, BBM, dll)
async function catatBebanOperasional(pabrikId, { namaBeban, nominal, tanggal, keterangan, nomorBukti }) {
  nominal = Number(nominal);
  if (nominal <= 0) throw new Error('Nominal beban operasional harus lebih dari 0');
  tanggal = tanggal || new Date().toISOString().slice(0, 10);
  nomorBukti = nomorBukti || generateNomorBukti(pabrikId, 'BEBAN');

  const akunBeban = await getAccount(pabrikId, '6001');
  const akunKas = await getAccount(pabrikId, '1001');

  const kasBalance = await getAccountBalance(pabrikId, akunKas.id);
  if (kasBalance < nominal) {
    throw new Error(`Saldo Kas tidak mencukupi untuk membayar operasional! Kas saat ini: Rp ${kasBalance.toLocaleString('id-ID')}`);
  }

  const jurnalId = await createJournalEntry({
    pabrikId,
    tanggal,
    nomorBukti,
    tipeTransaksi: 'BEBAN_OPERASIONAL',
    referensi: namaBeban,
    keterangan: keterangan || `Beban Operasional: ${namaBeban}`,
    entries: [
      { akunId: akunBeban.id, debit: nominal, kredit: 0, catatan: namaBeban },
      { akunId: akunKas.id, debit: 0, kredit: nominal, catatan: 'Pengeluaran kas operasional' }
    ]
  });

  return { success: true, jurnalId, nomorBukti, nominal };
}

// ----------------------
// LAPORAN KEUANGAN OTOMATIS
// ----------------------

// 1. Laba Rugi (Income Statement)
async function getLabaRugi(pabrikId, startDate, endDate) {
  let dateFilter = '';
  const params = [];
  let wherePabrik = ' 1=1 ';

  if (pabrikId && pabrikId !== 'all') {
    wherePabrik = ' a.pabrik_id = ? ';
    params.push(Number(pabrikId));
  }

  if (startDate && endDate) {
    dateFilter = ' AND j.tanggal BETWEEN ? AND ? ';
    params.push(startDate, endDate);
  }

  const rows = await queryAll(`
    SELECT 
      MIN(a.id) as id,
      a.kode_akun,
      a.nama_akun,
      a.tipe_akun,
      a.saldo_normal,
      COALESCE(SUM(d.debit), 0)::numeric AS total_debit,
      COALESCE(SUM(d.kredit), 0)::numeric AS total_kredit
    FROM tabel_akun_perkiraan a
    LEFT JOIN tabel_jurnal_detail d ON a.id = d.akun_id
    LEFT JOIN tabel_jurnal_transaksi j ON d.jurnal_id = j.id ${dateFilter}
    WHERE ${wherePabrik} AND a.tipe_akun IN ('pendapatan', 'beban')
    GROUP BY a.kode_akun, a.nama_akun, a.tipe_akun, a.saldo_normal
    ORDER BY a.kode_akun ASC
  `, params);

  let totalPendapatan = 0;
  let totalHPP = 0;
  let totalBebanOperasional = 0;

  const rincianPendapatan = [];
  const rincianHPP = [];
  const rincianBeban = [];

  for (const row of rows) {
    const debit = Number(row.total_debit) || 0;
    const kredit = Number(row.total_kredit) || 0;

    if (row.tipe_akun === 'pendapatan') {
      const saldo = kredit - debit;
      totalPendapatan += saldo;
      rincianPendapatan.push({ ...row, saldo });
    } else if (row.tipe_akun === 'beban') {
      const saldo = debit - kredit;
      if (row.kode_akun.startsWith('5')) {
        totalHPP += saldo;
        rincianHPP.push({ ...row, saldo });
      } else {
        totalBebanOperasional += saldo;
        rincianBeban.push({ ...row, saldo });
      }
    }
  }

  const labaKotor = totalPendapatan - totalHPP;
  const labaBersih = labaKotor - totalBebanOperasional;

  return {
    pabrikId,
    periode: { startDate: startDate || 'Semua', endDate: endDate || 'Saat Ini' },
    pendapatan: { total: totalPendapatan, items: rincianPendapatan },
    hpp: { total: totalHPP, items: rincianHPP },
    labaKotor,
    bebanOperasional: { total: totalBebanOperasional, items: rincianBeban },
    labaBersih
  };
}

// 2. Neraca (Balance Sheet)
async function getNeraca(pabrikId, asOfDate) {
  let dateFilter = '';
  const params = [];
  let wherePabrik = ' 1=1 ';

  if (pabrikId && pabrikId !== 'all') {
    wherePabrik = ' a.pabrik_id = ? ';
    params.push(Number(pabrikId));
  }

  if (asOfDate) {
    dateFilter = ' AND j.tanggal <= ? ';
    params.push(asOfDate);
  }

  const rows = await queryAll(`
    SELECT 
      MIN(a.id) as id,
      a.kode_akun,
      a.nama_akun,
      a.tipe_akun,
      a.saldo_normal,
      COALESCE(SUM(d.debit), 0)::numeric AS total_debit,
      COALESCE(SUM(d.kredit), 0)::numeric AS total_kredit
    FROM tabel_akun_perkiraan a
    LEFT JOIN tabel_jurnal_detail d ON a.id = d.akun_id
    LEFT JOIN tabel_jurnal_transaksi j ON d.jurnal_id = j.id ${dateFilter}
    WHERE ${wherePabrik}
    GROUP BY a.kode_akun, a.nama_akun, a.tipe_akun, a.saldo_normal
    ORDER BY a.kode_akun ASC
  `, params);

  const asetLancar = [];
  const asetTetap = [];
  const kewajiban = [];
  const ekuitas = [];

  let totalAsetLancar = 0;
  let totalAsetTetap = 0;
  let totalKewajiban = 0;
  let totalEkuitas = 0;

  let totalPendapatan = 0;
  let totalBeban = 0;

  for (const row of rows) {
    const debit = Number(row.total_debit) || 0;
    const kredit = Number(row.total_kredit) || 0;
    let saldo = 0;

    if (row.saldo_normal === 'debit') {
      saldo = debit - kredit;
    } else {
      saldo = kredit - debit;
    }

    if (row.tipe_akun === 'aset_lancar') {
      asetLancar.push({ ...row, saldo });
      totalAsetLancar += saldo;
    } else if (row.tipe_akun === 'aset_tetap') {
      asetTetap.push({ ...row, saldo });
      totalAsetTetap += saldo;
    } else if (row.tipe_akun === 'kewajiban') {
      kewajiban.push({ ...row, saldo });
      totalKewajiban += saldo;
    } else if (row.tipe_akun === 'ekuitas') {
      ekuitas.push({ ...row, saldo });
      totalEkuitas += saldo;
    } else if (row.tipe_akun === 'pendapatan') {
      totalPendapatan += (kredit - debit);
    } else if (row.tipe_akun === 'beban') {
      totalBeban += (debit - kredit);
    }
  }

  // Masukkan Laba Periode Berjalan dari Laba Rugi ke dalam Ekuitas (dihitung langsung dari akun)
  const labaPeriodeBerjalan = totalPendapatan - totalBeban;

  ekuitas.push({
    id: 0,
    kode_akun: '3999',
    nama_akun: 'Laba Periode Berjalan',
    tipe_akun: 'ekuitas',
    saldo_normal: 'kredit',
    saldo: labaPeriodeBerjalan
  });
  totalEkuitas += labaPeriodeBerjalan;

  const totalAset = totalAsetLancar + totalAsetTetap;
  const totalKewajibanDanEkuitas = totalKewajiban + totalEkuitas;
  const selisih = Math.round((totalAset - totalKewajibanDanEkuitas) * 100) / 100;
  const isBalanced = Math.abs(selisih) < 0.01;

  return {
    pabrikId,
    asOfDate: asOfDate || new Date().toISOString().slice(0, 10),
    aset: {
      lancar: { items: asetLancar, total: totalAsetLancar },
      tetap: { items: asetTetap, total: totalAsetTetap },
      totalAset
    },
    kewajibanDanEkuitas: {
      kewajiban: { items: kewajiban, total: totalKewajiban },
      ekuitas: { items: ekuitas, total: totalEkuitas },
      totalKewajibanDanEkuitas
    },
    isBalanced,
    selisih
  };
}

// 3. Jurnal Umum
async function getJurnalUmum(pabrikId, { limit = 100, startDate, endDate } = {}) {
  try {
    let endpoint = `tabel_jurnal_transaksi?select=*,tabel_pabrik(nama_pabrik),tabel_jurnal_detail(*,tabel_akun_perkiraan(*))&order=tanggal.desc,id.desc&limit=${limit}`;
    if (pabrikId && pabrikId !== 'all') {
      endpoint += `&pabrik_id=eq.${Number(pabrikId)}`;
    }
    if (startDate) {
      endpoint += `&tanggal=gte.${startDate}`;
    }
    if (endDate) {
      endpoint += `&tanggal=lte.${endDate}`;
    }

    const records = await postgrestRequest(endpoint);
    if (Array.isArray(records)) {
      return records.map(j => ({
        id: j.id,
        pabrik_id: j.pabrik_id,
        nama_pabrik: j.tabel_pabrik?.nama_pabrik || 'Pabrik',
        tanggal: j.tanggal,
        nomor_bukti: j.nomor_bukti,
        tipe_transaksi: j.tipe_transaksi,
        referensi: j.referensi,
        keterangan: j.keterangan,
        total_nominal: Number(j.total_nominal) || 0,
        details: Array.isArray(j.tabel_jurnal_detail) ? j.tabel_jurnal_detail.map(d => ({
          detail_id: d.id,
          akun_id: d.akun_id,
          kode_akun: d.tabel_akun_perkiraan?.kode_akun || '',
          nama_akun: d.tabel_akun_perkiraan?.nama_akun || '',
          debit: Number(d.debit) || 0,
          kredit: Number(d.kredit) || 0,
          catatan: d.catatan
        })) : []
      }));
    }
  } catch (err) {
    console.warn('Fallback direct query getJurnalUmum:', err.message);
  }

  let where = 'WHERE 1=1';
  const params = [];

  if (pabrikId && pabrikId !== 'all') {
    where += ' AND j.pabrik_id = ?';
    params.push(Number(pabrikId));
  }

  if (startDate && endDate) {
    where += ' AND j.tanggal BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  params.push(limit * 6);

  const rows = await queryAll(`
    SELECT 
      j.id AS jurnal_id,
      j.pabrik_id,
      p.nama_pabrik,
      j.tanggal,
      j.nomor_bukti,
      j.tipe_transaksi,
      j.referensi,
      j.keterangan,
      j.total_nominal,
      d.id AS detail_id,
      d.akun_id,
      a.kode_akun,
      a.nama_akun,
      d.debit,
      d.kredit,
      d.catatan
    FROM tabel_jurnal_transaksi j
    LEFT JOIN tabel_pabrik p ON j.pabrik_id = p.id
    JOIN tabel_jurnal_detail d ON j.id = d.jurnal_id
    JOIN tabel_akun_perkiraan a ON d.akun_id = a.id
    ${where}
    ORDER BY j.tanggal DESC, j.id DESC, d.debit DESC
    LIMIT ?
  `, params);

  const journalsMap = new Map();
  for (const r of rows) {
    const jId = r.jurnal_id || r.id;
    if (!journalsMap.has(jId)) {
      journalsMap.set(jId, {
        id: jId,
        pabrik_id: r.pabrik_id,
        nama_pabrik: r.nama_pabrik,
        tanggal: r.tanggal,
        nomor_bukti: r.nomor_bukti,
        tipe_transaksi: r.tipe_transaksi,
        referensi: r.referensi,
        keterangan: r.keterangan,
        total_nominal: Number(r.total_nominal) || 0,
        details: []
      });
    }
    if (r.detail_id || r.akun_id) {
      journalsMap.get(jId).details.push({
        detail_id: r.detail_id,
        akun_id: r.akun_id,
        kode_akun: r.kode_akun,
        nama_akun: r.nama_akun,
        debit: Number(r.debit) || 0,
        kredit: Number(r.kredit) || 0,
        catatan: r.catatan
      });
    }
  }

  return Array.from(journalsMap.values());
}

// 4. Kartu Piutang Pedagang
async function getKartuPiutangPedagang(pabrikId, pedagangId) {
  const pedagang = await queryOne(`SELECT * FROM tabel_pedagang WHERE id = ? AND pabrik_id = ?`, [pedagangId, pabrikId]);
  if (!pedagang) throw new Error('Pedagang tidak ditemukan');

  const distribusiList = await queryAll(`
    SELECT 
      td.tanggal,
      jt.nomor_bukti,
      'DISTRIBUSI' AS tipe,
      tp.nama_produk,
      td.qty,
      td.harga_jual,
      td.total_jual AS penambahan_piutang,
      0 AS pengurangan_piutang,
      td.keterangan
    FROM tabel_transaksi_distribusi td
    JOIN tabel_produk tp ON td.produk_id = tp.id
    LEFT JOIN tabel_jurnal_transaksi jt ON td.jurnal_id = jt.id
    WHERE td.pabrik_id = ? AND td.pedagang_id = ?
  `, [pabrikId, pedagangId]);

  const setoranList = await queryAll(`
    SELECT 
      ts.tanggal,
      jt.nomor_bukti,
      'SETORAN' AS tipe,
      'Pembayaran Setoran Tunai/Transfer' AS nama_produk,
      1 AS qty,
      ts.nominal AS harga_jual,
      0 AS penambahan_piutang,
      ts.nominal AS pengurangan_piutang,
      ts.keterangan
    FROM tabel_transaksi_setoran ts
    LEFT JOIN tabel_jurnal_transaksi jt ON ts.jurnal_id = jt.id
    WHERE ts.pabrik_id = ? AND ts.pedagang_id = ?
  `, [pabrikId, pedagangId]);

  const mutasi = [...distribusiList, ...setoranList].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

  let runningSaldo = 0;
  const history = mutasi.map(m => {
    const penambahan = Number(m.penambahan_piutang) || 0;
    const pengurangan = Number(m.pengurangan_piutang) || 0;
    runningSaldo += (penambahan - pengurangan);
    return {
      ...m,
      penambahan_piutang: penambahan,
      pengurangan_piutang: pengurangan,
      saldo_berjalan: runningSaldo
    };
  });

  const saldoPiutang = Number(pedagang.saldo_piutang) || 0;
  const limitPiutang = Number(pedagang.limit_piutang) || 0;

  return {
    pedagang,
    totalPenambahan: history.reduce((acc, cur) => acc + cur.penambahan_piutang, 0),
    totalSetoran: history.reduce((acc, cur) => acc + cur.pengurangan_piutang, 0),
    saldoPiutangSaatIni: saldoPiutang,
    limitPiutang,
    sisaLimit: Math.max(0, limitPiutang - saldoPiutang),
    persenLimitTerpakai: limitPiutang > 0 ? Math.round((saldoPiutang / limitPiutang) * 100) : 0,
    history
  };
}

let consolidationCache = null;
let consolidationCacheTime = 0;
const CACHE_TTL_MS = 25000; // 25 seconds cache

function invalidateConsolidationCache() {
  consolidationCache = null;
  consolidationCacheTime = 0;
}

// 5. Global Consolidation Overview (Super Admin) - Optimized Single-Query & Cache
async function getGlobalConsolidation() {
  const now = Date.now();
  if (consolidationCache && (now - consolidationCacheTime) < CACHE_TTL_MS) {
    return consolidationCache;
  }

  const sql = `
    SELECT json_build_object(
      'pabriks', (SELECT COALESCE(json_agg(p), '[]'::json) FROM (SELECT * FROM tabel_pabrik ORDER BY id ASC) p),
      'accounts', (
        SELECT COALESCE(json_agg(a), '[]'::json) FROM (
          SELECT 
            a.pabrik_id,
            a.id,
            a.kode_akun,
            a.nama_akun,
            a.tipe_akun,
            a.saldo_normal,
            COALESCE(SUM(d.debit), 0)::numeric AS total_debit,
            COALESCE(SUM(d.kredit), 0)::numeric AS total_kredit
          FROM tabel_akun_perkiraan a
          LEFT JOIN tabel_jurnal_detail d ON a.id = d.akun_id
          GROUP BY a.pabrik_id, a.id, a.kode_akun, a.nama_akun, a.tipe_akun, a.saldo_normal
          ORDER BY a.pabrik_id ASC, a.kode_akun ASC
        ) a
      ),
      'pedagangs', (
        SELECT COALESCE(json_agg(ped), '[]'::json) FROM (
          SELECT pabrik_id, COUNT(*)::int as count FROM tabel_pedagang GROUP BY pabrik_id
        ) ped
      ),
      'produks', (
        SELECT COALESCE(json_agg(prod), '[]'::json) FROM (
          SELECT pabrik_id, COUNT(*)::int as count FROM tabel_produk GROUP BY pabrik_id
        ) prod
      )
    ) as consolidated_data;
  `;

  const row = await queryOne(sql);
  const data = row?.consolidated_data || { pabriks: [], accounts: [], pedagangs: [], produks: [] };
  const pabriks = data.pabriks || [];
  const accountRows = data.accounts || [];
  const pedagangCounts = data.pedagangs || [];
  const produkCounts = data.produks || [];

  const pedagangMap = new Map();
  for (const r of pedagangCounts) {
    pedagangMap.set(Number(r.pabrik_id), Number(r.count));
  }

  const produkMap = new Map();
  for (const r of produkCounts) {
    produkMap.set(Number(r.pabrik_id), Number(r.count));
  }

  const accountsByPabrik = new Map();
  for (const row of accountRows) {
    const pId = Number(row.pabrik_id);
    if (!accountsByPabrik.has(pId)) {
      accountsByPabrik.set(pId, []);
    }
    accountsByPabrik.get(pId).push(row);
  }

  const pabrikSummaries = [];
  let globalKas = 0;
  let globalPiutang = 0;
  let globalPersediaan = 0;
  let globalAsetTetap = 0;
  let globalOmset = 0;
  let globalHPP = 0;
  let globalBebanOperasional = 0;
  let globalLabaBersih = 0;

  for (const p of pabriks) {
    const rows = accountsByPabrik.get(Number(p.id)) || [];

    let kas = 0;
    let piutang = 0;
    let persediaan = 0;
    let asetTetap = 0;
    let totalAsetLancar = 0;
    let totalKewajiban = 0;
    let totalEkuitas = 0;
    let totalPendapatan = 0;
    let totalHPP = 0;
    let totalBebanOperasional = 0;

    for (const row of rows) {
      const debit = Number(row.total_debit) || 0;
      const kredit = Number(row.total_kredit) || 0;

      if (row.tipe_akun === 'aset_lancar') {
        const saldo = debit - kredit;
        totalAsetLancar += saldo;
        if (row.kode_akun === '1001') kas = saldo;
        else if (row.kode_akun === '1002') piutang = saldo;
        else if (row.kode_akun === '1003') persediaan = saldo;
      } else if (row.tipe_akun === 'aset_tetap') {
        const saldo = debit - kredit;
        asetTetap += saldo;
      } else if (row.tipe_akun === 'kewajiban') {
        const saldo = kredit - debit;
        totalKewajiban += saldo;
      } else if (row.tipe_akun === 'ekuitas') {
        const saldo = kredit - debit;
        totalEkuitas += saldo;
      } else if (row.tipe_akun === 'pendapatan') {
        const saldo = kredit - debit;
        totalPendapatan += saldo;
      } else if (row.tipe_akun === 'beban') {
        const saldo = debit - kredit;
        if (row.kode_akun && row.kode_akun.startsWith('5')) {
          totalHPP += saldo;
        } else {
          totalBebanOperasional += saldo;
        }
      }
    }

    const totalAset = totalAsetLancar + asetTetap;
    const labaBersih = totalPendapatan - totalHPP - totalBebanOperasional;
    const totalKewajibanDanEkuitas = totalKewajiban + totalEkuitas + labaBersih;
    const isBalanced = Math.abs(totalAset - totalKewajibanDanEkuitas) < 0.01;

    globalKas += kas;
    globalPiutang += piutang;
    globalPersediaan += persediaan;
    globalAsetTetap += asetTetap;
    globalOmset += totalPendapatan;
    globalHPP += totalHPP;
    globalBebanOperasional += totalBebanOperasional;
    globalLabaBersih += labaBersih;

    pabrikSummaries.push({
      pabrik: p,
      kas,
      piutang,
      persediaan,
      asetTetap,
      totalAset,
      omset: totalPendapatan,
      labaBersih,
      jumlahPedagang: pedagangMap.get(Number(p.id)) || 0,
      jumlahProduk: produkMap.get(Number(p.id)) || 0,
      isBalanced
    });
  }

  const result = {
    totalPabrik: pabriks.length,
    totals: {
      kas: globalKas,
      piutang: globalPiutang,
      persediaan: globalPersediaan,
      asetTetap: globalAsetTetap,
      totalAset: globalKas + globalPiutang + globalPersediaan + globalAsetTetap,
      omset: globalOmset,
      hpp: globalHPP,
      labaKotor: globalOmset - globalHPP,
      bebanOperasional: globalBebanOperasional,
      labaBersih: globalLabaBersih
    },
    factories: pabrikSummaries
  };

  consolidationCache = result;
  consolidationCacheTime = Date.now();

  return result;
}

/**
 * Delete a transaction/journal and revert its financial & inventory impact
 */
async function deleteTransaction(pabrikId, jurnalId) {
  const journal = await queryOne(
    `SELECT * FROM tabel_jurnal_transaksi WHERE id = ? AND (? IS NULL OR pabrik_id = ?)`,
    [jurnalId, pabrikId || null, pabrikId || null]
  );

  if (!journal) {
    throw new Error(`Transaksi dengan ID ${jurnalId} tidak ditemukan.`);
  }

  // Revert operational effects based on transaction type
  switch (journal.tipe_transaksi) {
    case 'DISTRIBUSI_PENJUALAN': {
      const distRecords = await queryAll(
        `SELECT * FROM tabel_transaksi_distribusi WHERE jurnal_id = ?`,
        [jurnalId]
      );
      for (const d of distRecords) {
        // Restore stock to product
        await query(`UPDATE tabel_produk SET stok = stok + ? WHERE id = ?`, [Number(d.qty), d.produk_id]);
        // Reduce merchant receivable
        await query(`UPDATE tabel_pedagang SET saldo_piutang = GREATEST(0, saldo_piutang - ?) WHERE id = ?`, [Number(d.total_jual), d.pedagang_id]);
      }
      await query(`DELETE FROM tabel_transaksi_distribusi WHERE jurnal_id = ?`, [jurnalId]);
      break;
    }
    case 'SETORAN_PIUTANG': {
      const setorRecords = await queryAll(
        `SELECT * FROM tabel_transaksi_setoran WHERE jurnal_id = ?`,
        [jurnalId]
      );
      for (const s of setorRecords) {
        // Restore merchant receivable (debt increases back)
        await query(`UPDATE tabel_pedagang SET saldo_piutang = saldo_piutang + ? WHERE id = ?`, [Number(s.nominal), s.pedagang_id]);
      }
      await query(`DELETE FROM tabel_transaksi_setoran WHERE jurnal_id = ?`, [jurnalId]);
      break;
    }
    case 'BELI_PERSEDIAAN': {
      const beliRecords = await queryAll(
        `SELECT * FROM tabel_transaksi_pembelian WHERE jurnal_id = ?`,
        [jurnalId]
      );
      for (const b of beliRecords) {
        if (b.produk_id) {
          // Deduct stock back
          await query(`UPDATE tabel_produk SET stok = GREATEST(0, stok - ?) WHERE id = ?`, [Number(b.qty), b.produk_id]);
        }
      }
      await query(`DELETE FROM tabel_transaksi_pembelian WHERE jurnal_id = ?`, [jurnalId]);
      break;
    }
    case 'BELI_PERALATAN': {
      await query(`DELETE FROM tabel_transaksi_pembelian WHERE jurnal_id = ?`, [jurnalId]);
      break;
    }
    default:
      break;
  }

  // Delete journal details & transaction header
  await query(`DELETE FROM tabel_jurnal_detail WHERE jurnal_id = ?`, [jurnalId]);
  await query(`DELETE FROM tabel_jurnal_transaksi WHERE id = ?`, [jurnalId]);

  invalidateConsolidationCache();

  return { success: true, message: `Transaksi ${journal.nomor_bukti} berhasil dihapus dan saldo telah dipulihkan.` };
}

/**
 * Update transaction metadata (tanggal, keterangan, referensi)
 */
async function updateTransaction(pabrikId, jurnalId, { tanggal, keterangan, referensi }) {
  const journal = await queryOne(
    `SELECT * FROM tabel_jurnal_transaksi WHERE id = ? AND (? IS NULL OR pabrik_id = ?)`,
    [jurnalId, pabrikId || null, pabrikId || null]
  );

  if (!journal) {
    throw new Error(`Transaksi dengan ID ${jurnalId} tidak ditemukan.`);
  }

  const newTanggal = tanggal || journal.tanggal;
  const newKet = keterangan !== undefined ? keterangan : journal.keterangan;
  const newRef = referensi !== undefined ? referensi : journal.referensi;

  await query(
    `UPDATE tabel_jurnal_transaksi SET tanggal = ?, keterangan = ?, referensi = ? WHERE id = ?`,
    [newTanggal, newKet, newRef, jurnalId]
  );

  // Update operational tables if needed
  switch (journal.tipe_transaksi) {
    case 'DISTRIBUSI_PENJUALAN':
      await query(`UPDATE tabel_transaksi_distribusi SET tanggal = ?, keterangan = ? WHERE jurnal_id = ?`, [newTanggal, newKet, jurnalId]);
      break;
    case 'SETORAN_PIUTANG':
      await query(`UPDATE tabel_transaksi_setoran SET tanggal = ?, keterangan = ? WHERE jurnal_id = ?`, [newTanggal, newKet, jurnalId]);
      break;
    case 'BELI_PERSEDIAAN':
    case 'BELI_PERALATAN':
      await query(`UPDATE tabel_transaksi_pembelian SET tanggal = ?, keterangan = ? WHERE jurnal_id = ?`, [newTanggal, newKet, jurnalId]);
      break;
    default:
      break;
  }

  invalidateConsolidationCache();

  return { success: true, message: `Transaksi ${journal.nomor_bukti} berhasil diperbarui.` };
}

module.exports = {
  DEFAULT_COA,
  initFactoryCOA,
  getAccount,
  createJournalEntry,
  setorModalAwal,
  beliPeralatan,
  beliPersediaan,
  distribusiBarang,
  setorPembayaranPedagang,
  catatBebanOperasional,
  getNeraca,
  getLabaRugi,
  getJurnalUmum,
  getKartuPiutangPedagang,
  getGlobalConsolidation,
  deleteTransaction,
  updateTransaction,
  invalidateConsolidationCache
};
