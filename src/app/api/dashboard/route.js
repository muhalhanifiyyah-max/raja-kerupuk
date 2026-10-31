import { NextResponse } from 'next/server';
import { query, queryOne, queryAll, postgrestRequest } from '@/supabase';
import { getNeraca, getLabaRugi, getGlobalConsolidation, getJurnalUmum } from '@/accounting';

async function getMonthlySales(pabrikId) {
  try {
    let endpoint = `tabel_jurnal_detail?select=debit,kredit,tabel_jurnal_transaksi(id,pabrik_id,tanggal),tabel_akun_perkiraan!inner(kode_akun)&tabel_akun_perkiraan.kode_akun=eq.4001`;
    const details = await postgrestRequest(endpoint);
    const monthsMap = new Map();
    for (const d of (details || [])) {
      const j = d.tabel_jurnal_transaksi;
      if (!j || !j.tanggal) continue;
      if (pabrikId && pabrikId !== 'all' && Number(j.pabrik_id) !== Number(pabrikId)) continue;

      const t = new Date(j.tanggal);
      const yearMonth = j.tanggal.slice(0, 7);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const bulan = `${monthNames[t.getUTCMonth()]}-${t.getUTCFullYear()}`;
      const sales = (Number(d.kredit) || 0) - (Number(d.debit) || 0);

      if (!monthsMap.has(yearMonth)) {
        monthsMap.set(yearMonth, { bulan, bulan_date: `${yearMonth}-01`, total_penjualan: 0 });
      }
      monthsMap.get(yearMonth).total_penjualan += sales;
    }
    return Array.from(monthsMap.values()).sort((a, b) => a.bulan_date.localeCompare(b.bulan_date));
  } catch (err) {
    console.warn('Fallback monthlySales:', err.message);
    return [];
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pabrikIdParam = searchParams.get('pabrik_id');

    // Jika mode Super Admin (pabrik_id=all)
    if (pabrikIdParam === 'all' || !pabrikIdParam) {
      const [globalData, neraca, labaRugi, pedagangList, produkList, recentJournals, monthlySales] = await Promise.all([
        getGlobalConsolidation(),
        getNeraca('all'),
        getLabaRugi('all'),
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
        getMonthlySales('all')
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
        neracaSummary: neraca,
        labaRugiSummary: labaRugi,
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
        WHERE ped.pabrik_id = ?
        ORDER BY ped.saldo_piutang DESC
        LIMIT 10
      `, [pabrikId]),
      queryAll(`
        SELECT prod.*, pab.nama_pabrik 
        FROM tabel_produk prod 
        LEFT JOIN tabel_pabrik pab ON prod.pabrik_id = pab.id
        WHERE prod.pabrik_id = ? 
        ORDER BY prod.nama_produk ASC
      `, [pabrikId]),
      getJurnalUmum(pabrikId, { limit: 25 }),
      getMonthlySales(pabrikId)
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
