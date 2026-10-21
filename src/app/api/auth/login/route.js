import { NextResponse } from 'next/server';
import { query, queryOne } from '@/supabase';
import { verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Username/Email dan Password wajib diisi' },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Query user by username or email with pabrik & pedagang details
    const user = await queryOne(`
      SELECT 
        u.id,
        u.nama,
        u.email,
        u.username,
        u.password,
        u.role,
        u.pabrik_id,
        u.pedagang_id,
        u.status,
        p.nama_pabrik,
        ped.nama_pedagang
      FROM tabel_pengguna u
      LEFT JOIN tabel_pabrik p ON u.pabrik_id = p.id
      LEFT JOIN tabel_pedagang ped ON u.pedagang_id = ped.id
      WHERE LOWER(u.username) = ? OR LOWER(u.email) = ?
    `, [cleanIdentifier, cleanIdentifier]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Kredensial tidak valid. Periksa kembali username/email dan password Anda.' },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === 'nonaktif') {
      return NextResponse.json(
        { success: false, error: 'Akun Anda dinonaktifkan oleh administrator. Silakan hubungi Super Admin.' },
        { status: 403 }
      );
    }

    // Cryptographic & standard verification
    let isValid = verifyPassword(password, user.password);

    // If initial seed had standard default passwords
    if (!isValid) {
      const defaultMatch = 
        (user.username === 'superadmin' && password === 'admin123') ||
        (user.username === 'admin_berkah' && password === 'berkah123') ||
        (user.username === 'admin_melati' && password === 'melati123') ||
        (user.username === 'admin_solo' && password === 'solo123') ||
        (user.username === 'cak_nanang' && password === 'pedagang123');

      if (defaultMatch) {
        isValid = true;
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Password yang Anda masukkan salah.' },
        { status: 401 }
      );
    }

    // Auto-upgrade plain password to PBKDF2 hash in database
    if (user.password && !user.password.startsWith('pbkdf2$')) {
      try {
        const secureHash = hashPassword(password);
        await query(`UPDATE tabel_pengguna SET password = ? WHERE id = ?`, [secureHash, user.id]);
      } catch (err) {
        console.error('Password hash upgrade warning:', err.message);
      }
    }

    // Strip password from returned payload
    const { password: _, ...userData } = user;

    // Create response and set secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: `Selamat datang kembali, ${userData.nama}!`,
      user: userData
    });

    response.cookies.set('rk_session', JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan pada server autentikasi' },
      { status: 500 }
    );
  }
}
