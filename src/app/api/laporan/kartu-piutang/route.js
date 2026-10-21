import { NextResponse } from 'next/server';
import { getKartuPiutangPedagang } from '@/accounting';
import { queryOne } from '@/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pabrikIdParam = searchParams.get('pabrik_id');
    const pedagangIdParam = searchParams.get('pedagang_id');

    if (!pedagangIdParam) {
      return NextResponse.json({ success: false, error: 'Parameter pedagang_id diperlukan' }, { status: 400 });
    }

    let pabrikId = pabrikIdParam ? Number(pabrikIdParam) : null;
    if (!pabrikId) {
      const ped = await queryOne('SELECT pabrik_id FROM tabel_pedagang WHERE id = ?', [Number(pedagangIdParam)]);
      if (ped) {
        pabrikId = ped.pabrik_id;
      } else {
        pabrikId = 1;
      }
    }

    const data = await getKartuPiutangPedagang(pabrikId, Number(pedagangIdParam));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
