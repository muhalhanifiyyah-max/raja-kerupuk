import { NextResponse } from 'next/server';
import { deleteTransaction, updateTransaction } from '@/accounting';
import { queryOne, queryAll } from '@/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const journalId = Number(id);

    const journal = await queryOne(
      `SELECT * FROM tabel_jurnal_transaksi WHERE id = ?`,
      [journalId]
    );

    if (!journal) {
      return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    const details = await queryAll(`
      SELECT 
        d.id, d.akun_id, d.debit, d.kredit, d.catatan,
        a.kode_akun, a.nama_akun, a.tipe_akun
      FROM tabel_jurnal_detail d
      JOIN tabel_akun_perkiraan a ON d.akun_id = a.id
      WHERE d.jurnal_id = ?
      ORDER BY d.debit DESC, d.kredit DESC
    `, [journalId]);

    return NextResponse.json({ success: true, data: { ...journal, details } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const journalId = Number(id);
    const body = await request.json();
    const { tanggal, keterangan, referensi, pabrik_id } = body;

    const result = await updateTransaction(pabrik_id ? Number(pabrik_id) : null, journalId, {
      tanggal,
      keterangan,
      referensi
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const journalId = Number(id);
    const { searchParams } = new URL(request.url);
    const pabrikId = searchParams.get('pabrik_id');

    const result = await deleteTransaction(pabrikId ? Number(pabrikId) : null, journalId);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
