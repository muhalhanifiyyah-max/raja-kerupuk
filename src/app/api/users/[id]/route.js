import { NextResponse } from 'next/server';
import { query, queryOne } from '@/supabase';
import { hashPassword } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await queryOne(`
      SELECT id, nama, email, username, role, pabrik_id, pedagang_id, status, created_at 
      FROM tabel_pengguna 
      WHERE id = ?
    `, [Number(id)]);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nama, email, username, password, role, pabrik_id, pedagang_id, status } = body;

    if (!nama || !email || !username || !role) {
      return NextResponse.json({ success: false, error: 'Data pengguna tidak lengkap' }, { status: 400 });
    }

    let sql = `
      UPDATE tabel_pengguna 
      SET nama = ?, email = ?, username = ?, role = ?, pabrik_id = ?, pedagang_id = ?, status = ?
    `;
    const paramsList = [
      nama, 
      email, 
      username.toLowerCase().trim(), 
      role, 
      pabrik_id ? Number(pabrik_id) : null, 
      pedagang_id ? Number(pedagang_id) : null, 
      status || 'aktif'
    ];

    if (password && password.trim().length > 0) {
      sql += `, password = ?`;
      paramsList.push(hashPassword(password));
    }

    sql += ` WHERE id = ? RETURNING id, nama, email, username, role, pabrik_id, pedagang_id, status, created_at;`;
    paramsList.push(Number(id));

    const updated = await query(sql, paramsList);

    if (!updated || updated.length === 0) {
      return NextResponse.json({ success: false, error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const userId = Number(id);

    // Cek apakah user adalah super admin terakhir
    const user = await queryOne(`SELECT id, role, username FROM tabel_pengguna WHERE id = ?`, [userId]);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    if (user.role === 'super_admin') {
      const superAdminCount = await queryOne(`SELECT COUNT(*) as count FROM tabel_pengguna WHERE role = 'super_admin'`);
      if (Number(superAdminCount.count) <= 1) {
        return NextResponse.json({ 
          success: false, 
          error: 'Tidak dapat menghapus Super Admin terakhir di sistem!' 
        }, { status: 400 });
      }
    }

    await query(`DELETE FROM tabel_pengguna WHERE id = ?`, [userId]);

    return NextResponse.json({ 
      success: true, 
      message: `Pengguna "${user.username}" berhasil dihapus.` 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
