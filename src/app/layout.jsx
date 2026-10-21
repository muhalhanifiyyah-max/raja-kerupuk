import './globals.css';

export const metadata = {
  title: 'Raja Kerupuk — Multi-Tenant Accounting POS',
  description: 'Sistem Pembukuan dan Akuntansi Otomatis Multi-Pabrik Kerupuk dengan Supabase PostgreSQL',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#f0f2f5] text-[#191a23] antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
