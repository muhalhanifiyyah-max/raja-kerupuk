import { NextResponse } from 'next/server';
import { getJurnalUmum } from '@/accounting';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pabrikId = searchParams.get('pabrik_id');
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!pabrikId) {
      return NextResponse.json({ success: false, error: 'Parameter pabrik_id diperlukan' }, { status: 400 });
    }

    const data = await getJurnalUmum(Number(pabrikId), { limit, startDate, endDate });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
