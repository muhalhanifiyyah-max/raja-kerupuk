import { NextResponse } from 'next/server';
import { query, queryOne, queryAll } from '@/supabase';
import { getNeraca, getLabaRugi, getGlobalConsolidation, getJurnalUmum } from '@/accounting';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pabrikIdParam = searchParams.get('pabrik_id');

    // Jika mode Super Admin (pabrik_id=all)
    if (pabrikIdParam === 'all' || !pabrikIdParam) {
      const [globalData, pedagangList, produkList, recentJournals, monthlySales] = await Promise.all([
        getGlobalConsolidation(),
        queryAll(`
          SELECT 
            ped.id, 
            ped.pabrik_id,
            pab.nama_pabrik,
            ped.nama_pedagang, 
            ped.no_telepon, 
            ped.alamat, 
            ped.limit_piutang, 
            ped.saldo_piutang,
            CASE 
              WHEN ped.limit_piutang > 0 AND ped.saldo_piutang >= ped.limit_piutang THEN 'Over Limit'
              WHEN ped.limit_piutang > 0 AND (ped.saldo_piutang / ped.limit_piutang) >= 0.8 THEN 'Mendekati Limit'
              WHEN ped.saldo_piutang > 0 THEN 'Lancar'
              ELSE 'Lunas'
            END AS status_piutang
          FROM tabel_pedagang ped
          LEFT JOIN tabel_pabrik pab ON ped.pabrik_id = pab.id
          ORDER BY ped.saldo_piutang DESC
          LIMIT 20
        `),
        queryAll(`
          SELECT 
            prod.*,
            pab.nama_pabrik
          FROM tabel_produk prod
          LEFT JOIN tabel_pabrik pab ON prod.pabrik_id = pab.id
          ORDER BY prod.nama_produk ASC
        `),
        getJurnalUmum('all', { limit: 25 }),
        queryAll(`
          SELECT 
            TO_CHAR(j.tanggal, 'Mon-YYYY') as bulan,
            DATE_TRUNC('month', j.tanggal) as bulan_date,
            COALESCE(SUM(d.kredit - d.debit), 0)::numeric as total_penjualan
          FROM tabel_jurnal_transaksi j
          JOIN tabel_jurnal_detail d ON j.id = d.jurnal_id
          JOIN tabel_akun_perkiraan a ON d.akun_id = a.id
          WHERE a.kode_akun = '4001'
          GROUP BY bulan, bulan_date
          ORDER BY bulan_date ASC
          LIMIT 12
        `)
      ]);

      const totals = globalData.totals || {};
      const isBalanced = globalData.factories && globalData.factories.length > 0
        ? globalData.factories.every(f => f.isBalanced !== false)
        : true;

      return NextResponse.json({
        success: true,
        isGlobal: true,
        pabrik: {
          id: 'all',
          nama_pabrik: 'Semua Pabrik',
          lokasi: 'Semua Cabang',
          status: 'active'
        },
        metrics: {
          kas: totals.kas || 0,
          piutang: totals.piutang || 0,
          persediaan: totals.persediaan || 0,
          peralatan: totals.asetTetap || 0,
          totalAset: totals.totalAset || 0,
          penjualan: totals.omset || 0,
          hpp: totals.hpp || 0,
          labaKotor: totals.labaKotor || 0,
          bebanOperasional: totals.bebanOperasional || 0,
          labaBersih: totals.labaBersih || 0,
          isBalanced,
          accuracyScore: isBalanced ? 100 : 92.4
        },
        monthlySales,
        pedagangList,
        produkList,
        recentJournals,
        data: globalData
      });
    }

    const pabrikId = Number(pabrikIdParam);

    // Ambil semua data pabrik secara paralel (Promise.all) untuk performa instan
    const [pabrik, neraca, labaRugi, pedagangList, produkList, recentJournals, monthlySales] = await Promise.all([
      queryOne(`SELECT * FROM tabel_pabrik WHERE id = ?`, [pabrikId]),
      getNeraca(pabrikId),
      getLabaRugi(pabrikId),
      queryAll(`
        SELECT 
          id, 
          nama_pedagang, 
          no_telepon, 
          alamat, 
          limit_piutang, 
          saldo_piutang,
          CASE 
            WHEN limit_piutang > 0 AND saldo_piutang >= limit_piutang THEN 'Over Limit'
            WHEN limit_piutang > 0 AND (saldo_piutang / limit_piutang) >= 0.8 THEN 'Mendekati Limit'
            WHEN saldo_piutang > 0 THEN 'Lancar'
            ELSE 'Lunas'
          END AS status_piutang
        FROM tabel_pedagang 
        WHERE pabrik_id = ?
        ORDER BY saldo_piutang DESC
        LIMIT 10
      `, [pabrikId]),
      queryAll(`
        SELECT * FROM tabel_produk WHERE pabrik_id = ? ORDER BY nama_produk ASC
      `, [pabrikId]),
      getJurnalUmum(pabrikId, { limit: 25 }),
      queryAll(`
        SELECT 
          TO_CHAR(j.tanggal, 'Mon-YYYY') as bulan,
          DATE_TRUNC('month', j.tanggal) as bulan_date,
          COALESCE(SUM(d.kredit - d.debit), 0)::numeric as total_penjualan
        FROM tabel_jurnal_transaksi j
        JOIN tabel_jurnal_detail d ON j.id = d.jurnal_id
        JOIN tabel_akun_perkiraan a ON d.akun_id = a.id
        WHERE j.pabrik_id = ? AND a.kode_akun = '4001'
        GROUP BY bulan, bulan_date
        ORDER BY bulan_date ASC
        LIMIT 12
      `, [pabrikId])
    ]);

    if (!pabrik) {
      return NextResponse.json({ success: false, error: 'Pabrik tidak ditemukan' }, { status: 404 });
    }

    // Filter akun spesifik
    const kasItem = neraca.aset.lancar.items.find(i => i.kode_akun === '1001');
    const piutangItem = neraca.aset.lancar.items.find(i => i.kode_akun === '1002');
    const persediaanItem = neraca.aset.lancar.items.find(i => i.kode_akun === '1003');
    const peralatanItem = neraca.aset.tetap.items.find(i => i.kode_akun === '1501');

    const totalKas = kasItem ? kasItem.saldo : 0;
    const totalPiutang = piutangItem ? piutangItem.saldo : 0;
    const totalPersediaan = persediaanItem ? persediaanItem.saldo : 0;
    const totalPeralatan = peralatanItem ? peralatanItem.saldo : 0;

    return NextResponse.json({
      success: true,
      isGlobal: false,
      pabrik,
      metrics: {
        kas: totalKas,
        piutang: totalPiutang,
        persediaan: totalPersediaan,
        peralatan: totalPeralatan,
        totalAset: neraca.aset.totalAset,
        penjualan: labaRugi.pendapatan.total,
        hpp: labaRugi.hpp.total,
        labaKotor: labaRugi.labaKotor,
        bebanOperasional: labaRugi.bebanOperasional.total,
        labaBersih: labaRugi.labaBersih,
        isBalanced: neraca.isBalanced,
        accuracyScore: neraca.isBalanced ? 100 : 0
      },
      monthlySales,
      pedagangList,
      produkList,
      recentJournals,
      neracaSummary: neraca,
      labaRugiSummary: labaRugi
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
