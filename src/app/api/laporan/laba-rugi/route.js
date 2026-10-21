import { NextResponse } from 'next/server';
import { getLabaRugi } from '@/accounting';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pabrikId = searchParams.get('pabrik_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!pabrikId) {
      return NextResponse.json({ success: false, error: 'Parameter pabrik_id diperlukan' }, { status: 400 });
    }

    const data = await getLabaRugi(Number(pabrikId), startDate, endDate);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
