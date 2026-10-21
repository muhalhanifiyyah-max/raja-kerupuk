import { NextResponse } from 'next/server';
import { setorModalAwal } from '@/accounting';

export async function POST(request) {
  try {
    const body = await request.json();
    const { pabrik_id, nominal, tanggal, keterangan } = body;

    if (!pabrik_id || !nominal) {
      return NextResponse.json({ success: false, error: 'Pabrik dan Nominal harus diisi' }, { status: 400 });
    }

    const result = await setorModalAwal(Number(pabrik_id), {
      nominal: Number(nominal),
      tanggal,
      keterangan
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
