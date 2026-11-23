const db = require('../config/db');

exports.redeemSoap = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { user_id } = req.body;
    const HARGA_POIN_SABUN = 50;

    await conn.beginTransaction();

    const [users] = await conn.query(`SELECT poin FROM users WHERE id = ? FOR UPDATE`, [user_id]);
    if (users.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Warga tidak ditemukan.' });
    }

    if (users[0].poin < HARGA_POIN_SABUN) {
      await conn.rollback();
      return res.status(400).json({ message: 'Poin belum cukup (Minimal 50 Poin).' });
    }

    const kode_voucher = `SBN-${Math.floor(1000 + Math.random() * 9000)}`;

    // Potong 50 poin warga
    await conn.query(`UPDATE users SET poin = poin - ? WHERE id = ?`, [HARGA_POIN_SABUN, user_id]);

    // Terbitkan voucher pengambilan sabun di Pos RT/RW
    await conn.query(
      `INSERT INTO redemptions (kode_voucher, user_id, poin_dipakai) VALUES (?, ?, ?)`,
      [kode_voucher, user_id, HARGA_POIN_SABUN]
    );

    await conn.commit();

    res.status(201).json({
      message: 'Penukaran berhasil! Tunjukkan kode voucher ini untuk mengambil Sabun Cuci Piring.',
      kode_voucher
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};