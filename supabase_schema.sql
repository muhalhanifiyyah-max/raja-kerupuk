-- ========================================================
-- SKEMA DATABASE MULTI-TENANT SISTEM PEMBUKUAN PABRIK KERUPUK
-- SUPABASE POSTGRESQL
-- ========================================================

-- 1. Tabel Pabrik (Multi-tenant root)
CREATE TABLE IF NOT EXISTS tabel_pabrik (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama_pabrik TEXT NOT NULL,
    alamat TEXT,
    telepon TEXT,
    penanggung_jawab TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Pedagang (Master Data Pelanggan Penerima Barang)
CREATE TABLE IF NOT EXISTS tabel_pedagang (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pabrik_id BIGINT NOT NULL REFERENCES tabel_pabrik(id) ON DELETE CASCADE,
    nama_pedagang TEXT NOT NULL,
    no_telepon TEXT,
    alamat TEXT,
    limit_piutang NUMERIC(15, 2) NOT NULL DEFAULT 0,
    saldo_piutang NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Produk (Master Data Persediaan Barang)
CREATE TABLE IF NOT EXISTS tabel_produk (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pabrik_id BIGINT NOT NULL REFERENCES tabel_pabrik(id) ON DELETE CASCADE,
    nama_produk TEXT NOT NULL,
    kategori TEXT DEFAULT 'Kerupuk',
    satuan TEXT DEFAULT 'Bal',
    harga_beli NUMERIC(15, 2) NOT NULL DEFAULT 0,
    harga_jual NUMERIC(15, 2) NOT NULL DEFAULT 0,
    stok NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Akun Perkiraan / Chart of Accounts (COA per pabrik)
CREATE TABLE IF NOT EXISTS tabel_akun_perkiraan (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pabrik_id BIGINT NOT NULL REFERENCES tabel_pabrik(id) ON DELETE CASCADE,
    kode_akun VARCHAR(20) NOT NULL,
    nama_akun VARCHAR(100) NOT NULL,
    tipe_akun VARCHAR(30) NOT NULL, -- 'aset_lancar', 'aset_tetap', 'kewajiban', 'ekuitas', 'pendapatan', 'beban'
    saldo_normal VARCHAR(10) NOT NULL, -- 'debit', 'kredit'
    UNIQUE(pabrik_id, kode_akun)
);

-- 5. Tabel Jurnal Transaksi (Header Double-Entry)
CREATE TABLE IF NOT EXISTS tabel_jurnal_transaksi (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pabrik_id BIGINT NOT NULL REFERENCES tabel_pabrik(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    nomor_bukti VARCHAR(50) NOT NULL,
    tipe_transaksi VARCHAR(50) NOT NULL, -- 'MODAL_AWAL', 'BELI_PERALATAN', 'BELI_PERSEDIAAN', 'DISTRIBUSI_PENJUALAN', 'SETORAN_PIUTANG', 'BEBAN_OPERASIONAL'
    referensi TEXT,
    keterangan TEXT,
    total_nominal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Jurnal Detail (Debit / Kredit Baris Akun)
CREATE TABLE IF NOT EXISTS tabel_jurnal_detail (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    jurnal_id BIGINT NOT NULL REFERENCES tabel_jurnal_transaksi(id) ON DELETE CASCADE,
    akun_id BIGINT NOT NULL REFERENCES tabel_akun_perkiraan(id) ON DELETE RESTRICT,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    kredit NUMERIC(15, 2) NOT NULL DEFAULT 0,
    catatan TEXT
);

-- 7. Tabel Transaksi Pembelian (Aset / Persediaan)
CREATE TABLE IF NOT EXISTS tabel_transaksi_pembelian (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pabrik_id BIGINT NOT NULL REFERENCES tabel_pabrik(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jenis VARCHAR(20) NOT NULL, -- 'PERALATAN', 'PERSEDIAAN'
    nama_item TEXT NOT NULL,
    produk_id BIGINT REFERENCES tabel_produk(id) ON DELETE SET NULL,
    qty NUMERIC(15, 2) DEFAULT 1,
    harga_satuan NUMERIC(15, 2) NOT NULL,
    total NUMERIC(15, 2) NOT NULL,
    akun_kas_id BIGINT NOT NULL REFERENCES tabel_akun_perkiraan(id) ON DELETE RESTRICT,
    jurnal_id BIGINT REFERENCES tabel_jurnal_transaksi(id) ON DELETE CASCADE,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabel Transaksi Distribusi Barang ke Pedagang
CREATE TABLE IF NOT EXISTS tabel_transaksi_distribusi (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pabrik_id BIGINT NOT NULL REFERENCES tabel_pabrik(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    pedagang_id BIGINT NOT NULL REFERENCES tabel_pedagang(id) ON DELETE RESTRICT,
    produk_id BIGINT NOT NULL REFERENCES tabel_produk(id) ON DELETE RESTRICT,
    qty NUMERIC(15, 2) NOT NULL,
    harga_beli NUMERIC(15, 2) NOT NULL,
    harga_jual NUMERIC(15, 2) NOT NULL,
    total_jual NUMERIC(15, 2) NOT NULL,
    total_hpp NUMERIC(15, 2) NOT NULL,
    jurnal_id BIGINT REFERENCES tabel_jurnal_transaksi(id) ON DELETE CASCADE,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabel Transaksi Setoran Pembayaran Piutang
CREATE TABLE IF NOT EXISTS tabel_transaksi_setoran (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pabrik_id BIGINT NOT NULL REFERENCES tabel_pabrik(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    pedagang_id BIGINT NOT NULL REFERENCES tabel_pedagang(id) ON DELETE RESTRICT,
    nominal NUMERIC(15, 2) NOT NULL,
    akun_kas_id BIGINT NOT NULL REFERENCES tabel_akun_perkiraan(id) ON DELETE RESTRICT,
    jurnal_id BIGINT REFERENCES tabel_jurnal_transaksi(id) ON DELETE CASCADE,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk query multi-tenant yang cepat
CREATE INDEX IF NOT EXISTS idx_pedagang_pabrik ON tabel_pedagang(pabrik_id);
CREATE INDEX IF NOT EXISTS idx_produk_pabrik ON tabel_produk(pabrik_id);
CREATE INDEX IF NOT EXISTS idx_akun_pabrik ON tabel_akun_perkiraan(pabrik_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_pabrik ON tabel_jurnal_transaksi(pabrik_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_detail_jurnal ON tabel_jurnal_detail(jurnal_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_detail_akun ON tabel_jurnal_detail(akun_id);
CREATE INDEX IF NOT EXISTS idx_dist_pedagang ON tabel_transaksi_distribusi(pedagang_id);
CREATE INDEX IF NOT EXISTS idx_setor_pedagang ON tabel_transaksi_setoran(pedagang_id);
