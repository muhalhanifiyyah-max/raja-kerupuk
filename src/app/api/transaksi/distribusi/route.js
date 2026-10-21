import { NextResponse } from 'next/server';
import { distribusiBarang } from '@/accounting';

export async function POST(request) {
  try {
    const body = await request.json();
    const { pabrik_id, pedagang_id, produk_id, qty, harga_jual, tanggal, keterangan } = body;

    if (!pabrik_id || !pedagang_id || !produk_id || !qty) {
      return NextResponse.json({ success: false, error: 'Data distribusi belum lengkap' }, { status: 400 });
    }

    const result = await distribusiBarang(Number(pabrik_id), {
      pedagangId: Number(pedagang_id),
      produkId: Number(produk_id),
      qty: Number(qty),
      hargaJual: harga_jual ? Number(harga_jual) : undefined,
      tanggal,
      keterangan
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
