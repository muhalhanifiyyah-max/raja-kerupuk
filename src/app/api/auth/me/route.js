import { NextResponse } from 'next/server';
import { queryOne } from '@/supabase';

export async function GET(request) {
  try {
    const sessionCookie = request.cookies.get('rk_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ success: false, user: null });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(sessionCookie);
    } catch {
      return NextResponse.json({ success: false, user: null });
    }

    if (!sessionData?.id) {
      return NextResponse.json({ success: false, user: null });
    }

    // Refresh user state from database by username or ID
    const userQuery = sessionData.username
      ? 'SELECT u.id, u.nama, u.email, u.username, u.role, u.pabrik_id, u.pedagang_id, u.status, p.nama_pabrik, ped.nama_pedagang FROM tabel_pengguna u LEFT JOIN tabel_pabrik p ON u.pabrik_id = p.id LEFT JOIN tabel_pedagang ped ON u.pedagang_id = ped.id WHERE LOWER(u.username) = ?'
      : 'SELECT u.id, u.nama, u.email, u.username, u.role, u.pabrik_id, u.pedagang_id, u.status, p.nama_pabrik, ped.nama_pedagang FROM tabel_pengguna u LEFT JOIN tabel_pabrik p ON u.pabrik_id = p.id LEFT JOIN tabel_pedagang ped ON u.pedagang_id = ped.id WHERE u.id = ?';
    const queryParam = sessionData.username ? sessionData.username.toLowerCase() : sessionData.id;

    const user = await queryOne(userQuery, [queryParam]);

    if (!user || user.status === 'nonaktif') {
      const response = NextResponse.json({ success: false, user: null });
      response.cookies.delete('rk_session');
      return response;
    }

    // Refresh and sync session cookie if role or details were outdated
    const response = NextResponse.json({ success: true, user });
    if (sessionData.role !== user.role || sessionData.pabrik_id !== user.pabrik_id) {
      response.cookies.set('rk_session', JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7
      });
    }
    return response;
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ success: false, user: null, error: error.message });
  }
}
