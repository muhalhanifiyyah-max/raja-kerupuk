# Raja Kerupuk — Multi-Tenant Accounting & POS System

Sistem pembukuan dan akuntansi multi-tenant berbasis Next.js dan Supabase PostgreSQL untuk mengelola banyak entitas pabrik kerupuk dengan isolasi data terjamin, pencatatan transaksi double-entry otomatis, dan antarmuka modern terinspirasi layout Shopify POS.

![Raja Kerupuk Logo](./public/logo.png)

---

## Fitur Utama

### 1. Multi-Tenant Architecture
- **Super Admin:** Memantau ringkasan seluruh pabrik di Indonesia (Total Omset Global, Posisi Kas Global, Piutang Mengendap Global, dan Nilai Persediaan), manajemen entitas pabrik (CRUD), serta manajemen hak akses pengguna.
- **Admin Pabrik:** Terisolasi khusus untuk data pabriknya sendiri (`pabrik_id`), mencatat transaksi modal, pembelian aset, persediaan, distribusi, dan setoran mitra pedagang.
- **Data Mitra Pedagang:** Pengelolaan limit kredit piutang barang titipan, status pembayaran (*Lancar*, *Mendekati Limit*, *Over Limit*, *Lunas*), serta buku pembantu (**Kartu Piutang**).

### 2. Logika Akuntansi Double-Entry Otomatis
Setiap aksi di frontend memicu mutasi Debit dan Kredit seimbang (*Balanced*) di Supabase:
- **Penyetoran Modal Awal:** Debit Kas & Bank | Kredit Modal Disetor.
- **Pembelian Peralatan (Aset Tetap):** Debit Peralatan Pabrik | Kredit Kas & Bank.
- **Pembelian Persediaan Barang (Aset Lancar):** Debit Persediaan Kerupuk | Kredit Kas & Bank + Update stok dan HPP rata-rata.
- **Distribusi Barang ke Pedagang (Penjualan Kredit):**
  - Jurnal 1: Debit Piutang Dagang (Harga Jual) | Kredit Pendapatan Penjualan.
  - Jurnal 2: Debit Harga Pokok Penjualan (HPP) | Kredit Persediaan Barang.
  - Validasi otomatis ketersediaan stok dan plafon limit piutang pedagang.
- **Setoran Pembayaran Pedagang:** Debit Kas & Bank | Kredit Piutang Dagang.
- **Fitur Ubah & Hapus Transaksi:** Pembatalan otomatis jurnal debit/kredit dan pemulihan saldo kas, piutang, serta stok secara akurat.

### 3. Output Laporan Real-Time
- **Neraca (Balance Sheet):** Menampilkan Aset Lancar (Kas, Piutang, Persediaan), Aset Tetap (Peralatan), Kewajiban (Utang), dan Ekuitas (Modal Disetor + Laba Periode Berjalan) dengan verifikasi keseimbangan (*Accuracy Score 100%*).
- **Laba Rugi (Income Statement):** Pendapatan Penjualan dikurangi HPP menghasilkan Laba Kotor, dikurangi Beban Operasional menghasilkan Laba Bersih.
- **Jurnal Umum (General Journal):** Audit trail lengkap seluruh mutasi debit dan kredit beserta nomor bukti transaksi.
- **Kartu Piutang Pedagang:** Riwayat drop barang vs cicilan setoran uang tunai atau transfer.

---

## Tech Stack & Konfigurasi

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons
- **Database:** Supabase PostgreSQL
- **Port:** `http://localhost:4000`

---

## Cara Menjalankan

### 1. Salin Environment Variable
```bash
cp .env.example .env
```
Sesuaikan konfigurasi koneksi Supabase Anda di dalam `.env`.

### 2. Jalankan Mode Produksi
```bash
npm run build
npm start
```
Buka di browser melalui `http://localhost:4000`.
