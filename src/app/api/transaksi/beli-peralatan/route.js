import { NextResponse } from 'next/server';
import { beliPeralatan } from '@/accounting';

export async function POST(request) {
  try {
    const body = await request.json();
    const { pabrik_id, nama_item, harga, qty, tanggal, keterangan } = body;

    if (!pabrik_id || !nama_item || !harga) {
      return NextResponse.json({ success: false, error: 'Data pembelian peralatan belum lengkap' }, { status: 400 });
    }

    const result = await beliPeralatan(Number(pabrik_id), {
      namaItem: nama_item,
      harga: Number(harga),
      qty: Number(qty) || 1,
      tanggal,
      keterangan
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
