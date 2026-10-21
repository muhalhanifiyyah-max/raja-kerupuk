import { NextResponse } from 'next/server';
import { getNeraca } from '@/accounting';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pabrikId = searchParams.get('pabrik_id');
    const asOfDate = searchParams.get('as_of_date');

    if (!pabrikId) {
      return NextResponse.json({ success: false, error: 'Parameter pabrik_id diperlukan' }, { status: 400 });
    }

    const data = await getNeraca(Number(pabrikId), asOfDate);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
