# 👑 Raja Kerupuk — Multi-Tenant Accounting & POS System

Sistem pembukuan dan akuntansi **multi-tenant** berbasis **Next.js** dan **Supabase PostgreSQL** untuk menaungi banyak pabrik kerupuk dengan isolasi data terjamin, pencatatan transaksi *double-entry* otomatis, dan antarmuka modern terinspirasi layout *Shopify POS*.

![Raja Kerupuk Logo](./public/logo.png)

---

## 🌟 Fitur Utama

### 1. Multi-Tenant Architecture
- **Super Admin:** Memantau ringkasan seluruh pabrik di Indonesia (Total Omset Global, Posisi Kas Global, Piutang Mengendap Global, dan Nilai Persediaan), menambah entitas pabrik baru beserta akun perkiraan otomatis.
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
  - Validasi otomatis ketersediaan stok & plafon limit piutang pedagang.
- **Setoran Pembayaran Pedagang:** Debit Kas & Bank | Kredit Piutang Dagang.

### 3. Output Laporan Real-Time
- **Neraca (Balance Sheet):** Menampilkan Aset Lancar (Kas, Piutang, Persediaan), Aset Tetap (Peralatan), Kewajiban (Utang), dan Ekuitas (Modal Disetor + Laba Periode Berjalan) dengan verifikasi keseimbangan (*Accuracy Score 100%*).
- **Laba Rugi (Income Statement):** Pendapatan Penjualan dikurangi HPP menghasilkan Laba Kotor, dikurangi Beban Operasional menghasilkan Laba Bersih.
- **Jurnal Umum (General Journal):** Audit trail lengkap seluruh mutasi debit & kredit beserta nomor bukti transaksi.
- **Kartu Piutang Pedagang:** Riwayat drop barang vs cicilan setoran uang tunai/transfer.

---

## 🛠️ Tech Stack & Konfigurasi

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons
- **Database:** Supabase PostgreSQL 17.11 (`https://lvkqfctwsgtjwrbxwgpu.supabase.co`)
- **Port:** `http://localhost:4000`

---

## 🚀 Cara Menjalankan

```bash
# 1. Jalankan development server
npm run dev

# 2. Buka di browser
open http://localhost:4000
```
