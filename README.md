# Raja Kerupuk — Multi-Tenant Accounting, POS & Mobile Field System

Sistem pembukuan dan akuntansi multi-tenant terpadu berbasis Next.js 16, Supabase PostgreSQL, dan Capacitor Native (Android APK & iOS) untuk mengelola rantai pasok pabrik kerupuk, pencatatan transaksi double-entry otomatis, distribusi lapangan dengan koordinat GPS, serta pelaporan keuangan real-time.

![Raja Kerupuk Logo](./public/logo.png)

---

## Fitur Utama

### 1. Multi-Tenant Architecture & Manajemen Pabrik
- **Super Admin**: Memantau konsolidasi seluruh pabrik di Indonesia (Total Omset Global, Posisi Kas Global, Piutang Mengendap Global, dan Nilai Persediaan), manajemen entitas pabrik (CRUD), serta manajemen hak akses pengguna.
- **Pengguna Khusus Super Admin Pabrik (`mamat_rahmat`)**: Hak akses manajerial terfokus pada 4 menu inti: Dashboard, Laporan Keuangan, Cetak Laporan, dan Super Admin Pabrik.
- **Admin Pabrik**: Terisolasi khusus untuk data pabriknya sendiri (`pabrik_id`), mencatat transaksi modal, pembelian aset, persediaan, distribusi, dan setoran kas mitra pedagang.
- **Mitra Pedagang Lapangan**: Pengelolaan limit kredit piutang barang titipan, status kelancaran pembayaran, serta buku pembantu (**Kartu Piutang**).

### 2. Logika Akuntansi Double-Entry Otomatis
Setiap aksi transaksi di antarmuka web maupun aplikasi mobile memicu mutasi Debit dan Kredit seimbang (*Balanced*) di Supabase:
- **Penyetoran Modal Awal**: Debit Kas & Bank | Kredit Modal Disetor.
- **Pembelian Peralatan (Aset Tetap)**: Debit Peralatan Pabrik | Kredit Kas & Bank.
- **Pembelian Persediaan Barang**: Debit Persediaan Kerupuk | Kredit Kas & Bank + Update stok fisik dan HPP.
- **Distribusi Penjualan (Kredit/Bon)**:
  - Jurnal 1: Debit Piutang Dagang (Harga Jual) | Kredit Pendapatan Penjualan.
  - Jurnal 2: Debit HPP | Kredit Persediaan Barang.
- **Distribusi Penjualan (Tunai Lunas)**:
  - Jurnal 1 & 2: Pengurangan stok persediaan dan pencatatan pendapatan penjualan.
  - Jurnal 3: Debit Kas & Bank | Kredit Piutang Dagang (Pelunasan langsung saat drop).
- **Setoran Pembayaran Pedagang**: Debit Kas & Bank | Kredit Piutang Dagang.
- **Fitur Hapus & Koreksi Transaksi**: Pemulihan saldo kas, piutang, dan stok secara akurat dengan integritas pembukuan terjamin.

### 3. Output Laporan Real-Time & Cetak Laporan
- **Neraca (Balance Sheet)**: Menampilkan Aset Lancar (Kas, Piutang, Persediaan), Aset Tetap (Peralatan), Kewajiban (Utang), dan Ekuitas (Modal Disetor + Laba Periode Berjalan) dengan verifikasi keseimbangan.
- **Laba Rugi (Income Statement)**: Pendapatan Penjualan dikurangi HPP menghasilkan Laba Kotor, dikurangi Beban Operasional menghasilkan Laba Bersih.
- **Jurnal Umum (General Journal)**: Audit trail lengkap seluruh mutasi debit dan kredit beserta nomor bukti transaksi.
- **Kartu Piutang Pedagang**: Riwayat drop barang vs cicilan setoran uang tunai atau transfer per mitra.
- **Cetak Laporan**: Ekspor laporan keuangan resmi siap cetak ke format PDF atau printer.

### 4. Aplikasi Mobile Pedagang (Android APK & iOS)
- Dibangun dengan Capacitor Native yang langsung terhubung ke database **Supabase Cloud**.
- **Pencatatan Drop Lapangan**: Formulir pencatatan drop kerupuk ke warung rekanan.
- **Pelacakan Lokasi GPS**: Mengunci koordinat latitude dan longitude titik warung secara otomatis.
- **Kamera Bukti Fisik**: Unggah foto bukti fisik serah terima kerupuk langsung ke Supabase Storage bucket `drop-photos`.
- **UI Flat Modern & Status Bar Sync**: Penyesuaian otomatis warna status bar Android/iOS dengan navbar aplikasi (Light Mode & Dark Mode).

---

## Tech Stack

- **Frontend Web**: Next.js 16.4.2 (Turbopack), React 19.3.1, Tailwind CSS 3.4.1, Lucide React Icons
- **Mobile Runtime**: Capacitor CLI 8.5.3, `@capacitor/android`, `@capacitor/ios`, `@capacitor/camera`, `@capacitor/geolocation`
- **Database & Backend**: Supabase PostgreSQL dengan PostgREST API Engine dan Supabase Cloud Storage
- **Keamanan Sandi**: Password Hashing PBKDF2 (SHA-512, 1000 iterasi)

---

## Panduan Menjalankan Sistem

### 1. Web Dashboard

```bash
# Salin environment file
cp .env.example .env

# Jalankan mode pengembangan
npm run dev

# Atau build dan jalankan mode produksi
npm run build
npm start
```
Akses web dashboard melalui: `http://localhost:4000`.

### 2. Aplikasi Mobile (Build APK)

```bash
# 1. Salin aset web ke modul Android Capacitor
npx cap copy android

# 2. Kompilasi APK Debug dengan Gradle
cd android && ./gradlew assembleDebug && cd ..

# 3. Salin file hasil build ke folder publik
cp android/app/build/outputs/apk/debug/app-debug.apk public/apk/raja-kerupuk-pedagang.apk
```

File APK siap unduh tersedia di:
- Path lokal: `public/apk/raja-kerupuk-pedagang.apk`
- Browser: `http://localhost:4000/apk/raja-kerupuk-pedagang.apk`

---

## Daftar Akun Pengguna Bawaan

| Username / Identifier | Password | Peran (Role) | Lingkup Pabrik | Hak Akses Menu |
|---|---|---|---|---|
| `superadmin` | `admin123` | `super_admin` | Seluruh Pabrik | 9 Menu Lengkap |
| `mamat_rahmat` / `mamat rahmat` | `ssdd223344` | `super_admin` | Seluruh Pabrik | 4 Menu Khusus (Dashboard, Laporan Keuangan, Cetak Laporan, Super Admin Pabrik) |
| `admin_depok` | `depok123` | `admin_pabrik` | Pabrik Depok (ID: 1) | Menu Operasional Pabrik Depok |
| `pedagang_depok` | `password123` | `pedagang` | Pabrik Depok (ID: 1) | Portal Mobile Pedagang |

---

Untuk dokumentasi teknis dan skema basis data lebih mendalam, lihat file [`DOKUMENTASI.md`](./DOKUMENTASI.md).
