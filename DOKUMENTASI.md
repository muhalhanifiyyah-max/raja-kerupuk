# Dokumentasi Sistem Terpadu Raja Kerupuk

Sistem Pembukuan, Akuntansi Multi-Tenant, dan Distribusi Lapangan Berbasis Next.js, Supabase Cloud, dan Capacitor Native (Android & iOS).

---

## 1. Ringkasan Sistem

Raja Kerupuk adalah platform terpadu yang dirancang untuk mengelola ekosistem rantai pasok pabrik kerupuk mulai dari pembelian bahan baku/peralatan, pencatatan persediaan, distribusi lapangan oleh pedagang keliling, hingga pelaporan akuntansi berstandar *double-entry* (neraca saldo, laba rugi berjalan, dan kartu piutang) secara otomatis dan *real-time*.

Platform ini mengintegrasikan dua antarmuka utama:
1. **Web Dashboard Manajemen**: Antarmuka berbasis Next.js untuk Super Admin dan Admin Pabrik guna memantau posisi keuangan, mengelola master data pabrik, pengguna, produk, dan mencetak laporan resmi.
2. **Aplikasi Mobile Native (Android & iOS)**: Aplikasi berbasis Capacitor untuk mitra pedagang keliling guna mencatat pengiriman (*drop*) kerupuk ke warung, mendokumentasikan koordinat GPS lapangan, mengunggah foto bukti fisik ke Supabase Storage, serta memantau saldo piutang secara mandiri.

---

## 2. Arsitektur Teknologi

- **Frontend Web**: Next.js 16.4.2 (Turbopack), React 19.3.1, Tailwind CSS 3.4.1, Lucide React Icons.
- **Mobile Runtime**: Capacitor CLI 8.5.3, `@capacitor/android`, `@capacitor/ios`, `@capacitor/camera`, `@capacitor/geolocation`.
- **Database & Backend**: Supabase PostgreSQL dengan PostgREST API Engine dan Supabase Storage.
- **Autentikasi & Keamanan**: Password Hashing PBKDF2 (SHA-512, 1000 iterasi) dengan dukungan Web Crypto API pada mobile client.

---

## 3. Skema Basis Data

Sistem menggunakan skema relasional terstruktur dengan isolasi multi-tenant berbasis `pabrik_id`:

- `tabel_pabrik`: Data entitas pabrik, penanggung jawab, alamat, dan modal awal.
- `tabel_pengguna`: Akun pengguna sistem dengan role (`super_admin`, `admin_pabrik`, `pedagang`), password PBKDF2 hash, serta status aktif/nonaktif.
- `tabel_pedagang`: Mitra pedagang keliling, limit plafon kredit, dan saldo piutang berjalan.
- `tabel_produk`: Katalog kerupuk, harga beli, harga jual, stok gudang, dan satuan bal.
- `tabel_akun_perkiraan`: Chart of Accounts (COA) per pabrik untuk Kas, Piutang, Persediaan, Peralatan, Utang, Modal, Penjualan, HPP, dan Beban Operasional.
- `tabel_jurnal_transaksi` & `tabel_jurnal_detail`: Buku jurnal umum double-entry mencatat mutasi debit dan kredit berimbang.
- `tabel_transaksi_distribusi`: Catatan drop barang ke warung, koordinat GPS, metode bayar (tunai/bon), serta link foto bukti di Supabase Storage.

---

## 4. Logika Akuntansi Double-Entry

Setiap transaksi operasional secara otomatis menjurnal pasangan akun berimbang:

| Tipe Transaksi | Akun Didebit | Akun Dikredit | Efek Tambahan |
|---|---|---|---|
| **Setoran Modal Awal** | Kas & Bank (1001) | Modal Disetor (3001) | Likuiditas kas bertambah, ekuitas pemilik bertambah |
| **Pembelian Peralatan (Aset Tetap)** | Peralatan Pabrik (1201) | Kas & Bank (1001) | Aset tetap bertambah, kas berkurang |
| **Pembelian Persediaan Bahan** | Persediaan Kerupuk (1003) | Kas & Bank (1001) | Stok fisik bertambah, HPP terhitung |
| **Distribusi Penjualan (Kredit/Bon)** | 1. Piutang Dagang (1002)<br/>2. HPP (5001) | 1. Pendapatan Penjualan (4001)<br/>2. Persediaan Kerupuk (1003) | Piutang pedagang bertambah, stok berkurang |
| **Pembayaran Tunai Lunas saat Drop** | 1. Piutang Dagang (1002)<br/>2. HPP (5001)<br/>3. Kas & Bank (1001) | 1. Pendapatan Penjualan (4001)<br/>2. Persediaan Kerupuk (1003)<br/>3. Piutang Dagang (1002) | Langsung menghasilkan kas lunas tanpa piutang mengendap |
| **Setoran Piutang Pedagang** | Kas & Bank (1001) | Piutang Dagang (1002) | Kas bertambah, saldo piutang mitra berkurang |
| **Pengeluaran Beban Operasional** | Beban Operasional (6001) | Kas & Bank (1001) | Biaya tercatat, kas berkurang |

### Formula Laporan Keuangan
- **Total Aset**: Kas + Piutang + Persediaan + Peralatan
- **Laba Kotor**: Pendapatan Penjualan - HPP
- **Laba Bersih**: Laba Kotor - Beban Operasional
- **Keseimbangan Neraca**: Total Aset = Total Kewajiban + Modal Disetor + Laba Bersih Berjalan

---

## 5. Hak Akses & Peran Pengguna (RBAC)

1. **Super Admin Utama (`superadmin`)**:
   - Memantau konsolidasi seluruh pabrik di Indonesia (*Semua Pabrik*).
   - Akses penuh ke 9 menu sistem: Dashboard, Distribusi & Piutang, Check-Point, Persediaan Stok, Kas & Perbankan, Peralatan & Aset, Laporan Keuangan, Cetak Laporan, dan Super Admin Pabrik.
2. **Pengguna Khusus Pemilik Modal (`mamat_rahmat`)**:
   - Berperan sebagai investor / pemilik modal dengan hak akses manajerial dan monitoring aset.
   - Hak akses UI dan rute aktif mencakup 5 menu utama:
     1. Dashboard
     2. Kas & Perbankan (Monitoring Modal Ditanam, Alokasi Penggunaan Modal, dan Fitur Tambah/Setor Modal)
     3. Laporan Keuangan
     4. Cetak Laporan
     5. Super Admin Pabrik
   - Dilengkapi kartu breakdown real-time mengenai berapa total modal yang ditanam (Akun 3001) serta alokasi modal tersebut digunakan untuk apa saja (Mesin Peralatan, Stok Persediaan, Piutang Toko Lapangan, dan Sisa Kas Likuid).
3. **Admin Pabrik (`admin_pabrik`)**:
   - Terisolasi khusus pada data pabrik yang bersangkutan (`pabrik_id`).
   - Mengelola operasional harian: Distribusi, Check-Point, Persediaan Stok, Kas Operasional, Laporan Keuangan, dan Cetak Laporan.
4. **Pedagang Keliling (`pedagang`)**:
   - Portal antarmuka mobile untuk mencatat drop warung, mengambil koordinat lokasi, mengunggah foto bukti, dan memantau limit kredit.

---

## 6. Aplikasi Mobile (Android APK & iOS)

Aplikasi mobile dibangun menggunakan Capacitor yang membungkus aset statis `out/index.html` dengan plugin native:
- **Koneksi Supabase Cloud Mandiri**: Berkomunikasi langsung ke REST API PostgREST tanpa bergantung pada server lokal pengembang.
- **Deteksi Geolocation**: Menangkap koordinat GPS latitude dan longitude saat drop dilakukan di warung rekanan.
- **Kamera & Galeri**: Mengunggah foto bukti fisik drop langsung ke Supabase Storage bucket `drop-photos`.
- **Sinkronisasi Status Bar**: Menyesuaikan latar belakang status bar native dengan navigasi antarmuka.

### Alur Kompilasi APK:
```bash
# 1. Salin aset web ke modul Android
npx cap copy android

# 2. Kompilasi APK Debug menggunakan Gradle
cd android && ./gradlew assembleDebug && cd ..

# 3. Salin paket APK ke folder publik web
cp android/app/build/outputs/apk/debug/app-debug.apk public/apk/raja-kerupuk-pedagang.apk
```

---

## 7. Daftar Akun Pengguna Bawaan

| Username / Identifier | Password | Peran (Role) | Lingkup Pabrik | Hak Akses Menu |
|---|---|---|---|---|
| `superadmin` | `admin123` | `super_admin` | Seluruh Pabrik | 9 Menu Lengkap |
| `mamat_rahmat` / `mamat rahmat` | `ssdd223344` | `super_admin` | Seluruh Pabrik | 5 Menu (Dashboard, Kas & Perbankan / Modal, Laporan Keuangan, Cetak Laporan, Super Admin Pabrik) |
| `admin_depok` | `depok123` | `admin_pabrik` | Pabrik Depok (ID: 1) | Menu Operasional Pabrik Depok |
| `pedagang_depok` | `password123` | `pedagang` | Pabrik Depok (ID: 1) | Portal Mobile Pedagang |
