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

    // Refresh user state from database
    const user = await queryOne(`
      SELECT 
        u.id,
        u.nama,
        u.email,
        u.username,
        u.role,
        u.pabrik_id,
        u.pedagang_id,
        u.status,
        p.nama_pabrik,
        ped.nama_pedagang
      FROM tabel_pengguna u
      LEFT JOIN tabel_pabrik p ON u.pabrik_id = p.id
      LEFT JOIN tabel_pedagang ped ON u.pedagang_id = ped.id
      WHERE u.id = ?
    `, [sessionData.id]);

    if (!user || user.status === 'nonaktif') {
      const response = NextResponse.json({ success: false, user: null });
      response.cookies.delete('rk_session');
      return response;
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ success: false, user: null, error: error.message });
  }
}
