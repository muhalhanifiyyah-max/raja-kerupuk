import { NextResponse } from 'next/server';
import { getKartuPiutangPedagang } from '@/accounting';
import { queryOne } from '@/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with'
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pabrikIdParam = searchParams.get('pabrik_id');
    const pedagangIdParam = searchParams.get('pedagang_id');

    if (!pedagangIdParam) {
      return NextResponse.json({ success: false, error: 'Parameter pedagang_id diperlukan' }, { status: 400, headers: corsHeaders });
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
    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
