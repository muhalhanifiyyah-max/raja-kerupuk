const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'raja_kerupuk.db');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    -- 1. Tabel Pabrik (Multi-tenant root)
    CREATE TABLE IF NOT EXISTS tabel_pabrik (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_pabrik TEXT NOT NULL,
      alamat TEXT,
      telepon TEXT,
      penanggung_jawab TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Tabel Pedagang (Master Data Pelanggan Penerima Barang)
    CREATE TABLE IF NOT EXISTS tabel_pedagang (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pabrik_id INTEGER NOT NULL,
      nama_pedagang TEXT NOT NULL,
      no_telepon TEXT,
      alamat TEXT,
      limit_piutang REAL NOT NULL DEFAULT 0,
      saldo_piutang REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pabrik_id) REFERENCES tabel_pabrik(id) ON DELETE CASCADE
    );

    -- 3. Tabel Produk (Master Data Persediaan Barang)
    CREATE TABLE IF NOT EXISTS tabel_produk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pabrik_id INTEGER NOT NULL,
      nama_produk TEXT NOT NULL,
      kategori TEXT DEFAULT 'Kerupuk',
      satuan TEXT DEFAULT 'Bal',
      harga_beli REAL NOT NULL DEFAULT 0,
      harga_jual REAL NOT NULL DEFAULT 0,
      stok REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pabrik_id) REFERENCES tabel_pabrik(id) ON DELETE CASCADE
    );

    -- 4. Tabel Akun Perkiraan / Chart of Accounts (COA per pabrik)
    CREATE TABLE IF NOT EXISTS tabel_akun_perkiraan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pabrik_id INTEGER NOT NULL,
      kode_akun TEXT NOT NULL,
      nama_akun TEXT NOT NULL,
      tipe_akun TEXT NOT NULL, -- 'aset_lancar', 'aset_tetap', 'kewajiban', 'ekuitas', 'pendapatan', 'beban'
      saldo_normal TEXT NOT NULL, -- 'debit', 'kredit'
      FOREIGN KEY (pabrik_id) REFERENCES tabel_pabrik(id) ON DELETE CASCADE,
      UNIQUE(pabrik_id, kode_akun)
    );

    -- 5. Tabel Jurnal Transaksi (Header Double-Entry)
    CREATE TABLE IF NOT EXISTS tabel_jurnal_transaksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pabrik_id INTEGER NOT NULL,
      tanggal TEXT NOT NULL,
      nomor_bukti TEXT NOT NULL,
      tipe_transaksi TEXT NOT NULL, -- 'MODAL_AWAL', 'BELI_PERALATAN', 'BELI_PERSEDIAAN', 'DISTRIBUSI_PENJUALAN', 'SETORAN_PIUTANG', 'BEBAN_OPERASIONAL'
      referensi TEXT,
      keterangan TEXT,
      total_nominal REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pabrik_id) REFERENCES tabel_pabrik(id) ON DELETE CASCADE
    );

    -- 6. Tabel Jurnal Detail (Debit / Kredit Baris Akun)
    CREATE TABLE IF NOT EXISTS tabel_jurnal_detail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jurnal_id INTEGER NOT NULL,
      akun_id INTEGER NOT NULL,
      debit REAL NOT NULL DEFAULT 0,
      kredit REAL NOT NULL DEFAULT 0,
      catatan TEXT,
      FOREIGN KEY (jurnal_id) REFERENCES tabel_jurnal_transaksi(id) ON DELETE CASCADE,
      FOREIGN KEY (akun_id) REFERENCES tabel_akun_perkiraan(id) ON DELETE RESTRICT
    );

    -- Tabel Transaksi Operasional Spesifik untuk Rekap Cepat
    CREATE TABLE IF NOT EXISTS tabel_transaksi_pembelian (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pabrik_id INTEGER NOT NULL,
      tanggal TEXT NOT NULL,
      jenis TEXT NOT NULL, -- 'PERALATAN', 'PERSEDIAAN'
      nama_item TEXT NOT NULL,
      produk_id INTEGER,
      qty REAL DEFAULT 1,
      harga_satuan REAL NOT NULL,
      total REAL NOT NULL,
      akun_kas_id INTEGER NOT NULL,
      jurnal_id INTEGER,
      keterangan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pabrik_id) REFERENCES tabel_pabrik(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tabel_transaksi_distribusi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pabrik_id INTEGER NOT NULL,
      tanggal TEXT NOT NULL,
      pedagang_id INTEGER NOT NULL,
      produk_id INTEGER NOT NULL,
      qty REAL NOT NULL,
      harga_beli REAL NOT NULL,
      harga_jual REAL NOT NULL,
      total_jual REAL NOT NULL,
      total_hpp REAL NOT NULL,
      jurnal_id INTEGER,
      keterangan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pabrik_id) REFERENCES tabel_pabrik(id) ON DELETE CASCADE,
      FOREIGN KEY (pedagang_id) REFERENCES tabel_pedagang(id) ON DELETE RESTRICT,
      FOREIGN KEY (produk_id) REFERENCES tabel_produk(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS tabel_transaksi_setoran (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pabrik_id INTEGER NOT NULL,
      tanggal TEXT NOT NULL,
      pedagang_id INTEGER NOT NULL,
      nominal REAL NOT NULL,
      akun_kas_id INTEGER NOT NULL,
      jurnal_id INTEGER,
      keterangan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pabrik_id) REFERENCES tabel_pabrik(id) ON DELETE CASCADE,
      FOREIGN KEY (pedagang_id) REFERENCES tabel_pedagang(id) ON DELETE RESTRICT
    );

    -- Create indices for speed
    CREATE INDEX IF NOT EXISTS idx_pedagang_pabrik ON tabel_pedagang(pabrik_id);
    CREATE INDEX IF NOT EXISTS idx_produk_pabrik ON tabel_produk(pabrik_id);
    CREATE INDEX IF NOT EXISTS idx_akun_pabrik ON tabel_akun_perkiraan(pabrik_id);
    CREATE INDEX IF NOT EXISTS idx_jurnal_pabrik ON tabel_jurnal_transaksi(pabrik_id);
    CREATE INDEX IF NOT EXISTS idx_jurnal_detail_jurnal ON tabel_jurnal_detail(jurnal_id);
    CREATE INDEX IF NOT EXISTS idx_jurnal_detail_akun ON tabel_jurnal_detail(akun_id);
  `);
}

module.exports = {
  getDb,
  DB_PATH
};
