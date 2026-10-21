import { NextResponse } from 'next/server';
import { catatBebanOperasional } from '@/accounting';

export async function POST(request) {
  try {
    const body = await request.json();
    const { pabrik_id, nama_beban, nominal, tanggal, keterangan } = body;

    if (!pabrik_id || !nama_beban || !nominal) {
      return NextResponse.json({ success: false, error: 'Data beban operasional belum lengkap' }, { status: 400 });
    }

    const result = await catatBebanOperasional(Number(pabrik_id), {
      namaBeban: nama_beban,
      nominal: Number(nominal),
      tanggal,
      keterangan
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
