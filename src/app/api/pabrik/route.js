import { NextResponse } from 'next/server';
import { query, queryAll } from '@/supabase';
import { initFactoryCOA, setorModalAwal, invalidateConsolidationCache } from '@/accounting';

export async function GET() {
  try {
    const factories = await queryAll(`SELECT * FROM tabel_pabrik ORDER BY id ASC`);
    return NextResponse.json({ success: true, data: factories });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nama_pabrik, alamat, telepon, penanggung_jawab, modal_awal } = body;

    if (!nama_pabrik) {
      return NextResponse.json({ success: false, error: 'Nama pabrik wajib diisi' }, { status: 400 });
    }

    const inserted = await query(
      `INSERT INTO tabel_pabrik (nama_pabrik, alamat, telepon, penanggung_jawab) 
       VALUES (?, ?, ?, ?) RETURNING *`,
      [nama_pabrik, alamat || '', telepon || '', penanggung_jawab || '']
    );

    const pabrik = inserted[0];

    // Inisialisasi COA Akun Perkiraan standar untuk pabrik baru
    await initFactoryCOA(pabrik.id);

    // Jika disertai modal awal, langsung catat jurnal modal
    if (modal_awal && Number(modal_awal) > 0) {
      await setorModalAwal(pabrik.id, {
        nominal: Number(modal_awal),
        keterangan: `Penyetoran Modal Awal Pabrik ${nama_pabrik}`
      });
    }

    invalidateConsolidationCache();

    return NextResponse.json({ success: true, data: pabrik });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
