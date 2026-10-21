import { NextResponse } from 'next/server';
import { setorPembayaranPedagang } from '@/accounting';

export async function POST(request) {
  try {
    const body = await request.json();
    const { pabrik_id, pedagang_id, nominal, tanggal, keterangan } = body;

    if (!pabrik_id || !pedagang_id || !nominal) {
      return NextResponse.json({ success: false, error: 'Data pembayaran setoran pedagang belum lengkap' }, { status: 400 });
    }

    const result = await setorPembayaranPedagang(Number(pabrik_id), {
      pedagangId: Number(pedagang_id),
      nominal: Number(nominal),
      tanggal,
      keterangan
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
