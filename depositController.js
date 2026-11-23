const db = require('../config/db');

// Helper membuat kode unik pendek agar mudah dibaca warga lansia/gaptek
const generateCode = (prefix) => {
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
};

// 1. Warga mengajukan setor minyak (Status: pending, Poin BELUM masuk)
exports.createDeposit = async (req, res) => {
  try {
    const { user_id, lokasi_pos, liter } = req.body;
    if (!user_id || !liter || liter <= 0) {
      return res.status(400).json({ message: 'Jumlah liter tidak valid.' });
    }

    const poin_estimasi = Math.round(liter * 10); // 1 Liter = 10 Poin
    const kode_tiket = generateCode('TRN');

    await db.query(
      `INSERT INTO deposits (kode_tiket, user_id, lokasi_pos, liter, poin_estimasi, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [kode_tiket, user_id, lokasi_pos, liter, poin_estimasi]
    );

    res.status(201).json({
      message: 'Tiket antrean berhasil dibuat. Tunjukkan kode ini ke petugas RT/RW.',
      kode_tiket,
      poin_estimasi,
      status: 'pending'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Admin RT/RW memverifikasi minyak fisik & mencairkan poin
exports.verifyDeposit = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { kode_tiket, admin_id, liter_aktual } = req.body;

    await conn.beginTransaction();

    // Kunci baris transaksi (FOR UPDATE) agar tidak bisa diverifikasi ganda (anti double-claim)
    const [rows] = await conn.query(
      `SELECT * FROM deposits WHERE kode_tiket = ? FOR UPDATE`,
      [kode_tiket]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Kode tiket tidak ditemukan.' });
    }

    const deposit = rows[0];
    if (deposit.status !== 'pending') {
      await conn.rollback();
      return res.status(400).json({ message: `Tiket ini sudah berstatus ${deposit.status}.` });
    }

    // Admin bisa menyesuaikan liter jika takaran fisik berbeda dari input warga
    const finalLiter = liter_aktual ? parseFloat(liter_aktual) : parseFloat(deposit.liter);
    const finalPoin = Math.round(finalLiter * 10);

    // Update status setoran menjadi verified
    await conn.query(
      `UPDATE deposits 
       SET status = 'verified', liter = ?, poin_estimasi = ?, verified_by = ?, verified_at = NOW()
       WHERE id = ?`,
      [finalLiter, finalPoin, admin_id, deposit.id]
    );

    // Tambahkan poin & akumulasi liter ke akun warga
    await conn.query(
      `UPDATE users 
       SET poin = poin + ?, total_liter_terverifikasi = total_liter_terverifikasi + ?
       WHERE id = ?`,
      [finalPoin, finalLiter, deposit.user_id]
    );

    await conn.commit();

    res.json({
      message: `Verifikasi berhasil! ${finalPoin} Poin telah ditambahkan ke saldo warga.`,
      kode_tiket,
      liter_terverifikasi: finalLiter,
      poin_ditambahkan: finalPoin
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

// 3. Dashboard Progres Target Kolektif 3 Bulan (75 Liter) RW Tembalang
exports.getCommunityProgress = async (req, res) => {
  try {
    const [result] = await db.query(
      `SELECT IFNULL(SUM(liter), 0) AS total_liter FROM deposits WHERE status = 'verified'`
    );
    const totalLiter = parseFloat(result[0].total_liter);
    const target3Bulan = 75.0; // 25 Liter/bulan x 3 bulan

    res.json({
      total_liter_terkumpul: totalLiter,
      target_3_bulan: target3Bulan,
      persentase: Math.min(100, Math.round((totalLiter / target3Bulan) * 100))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};