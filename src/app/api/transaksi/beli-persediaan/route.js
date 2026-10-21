import { NextResponse } from 'next/server';
import { beliPersediaan } from '@/accounting';

export async function POST(request) {
  try {
    const body = await request.json();
    const { pabrik_id, produk_id, qty, harga_beli, tanggal, keterangan } = body;

    if (!pabrik_id || !produk_id || !qty || !harga_beli) {
      return NextResponse.json({ success: false, error: 'Data pembelian persediaan belum lengkap' }, { status: 400 });
    }

    const result = await beliPersediaan(Number(pabrik_id), {
      produkId: Number(produk_id),
      qty: Number(qty),
      hargaBeli: Number(harga_beli),
      tanggal,
      keterangan
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
