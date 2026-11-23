const db = require('../config/db');

exports.buyCandleWithSeminar = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { user_id, product_id, jumlah = 1 } = req.body;

    await conn.beginTransaction();

    const [products] = await conn.query(
      `SELECT * FROM candle_products WHERE id = ? FOR UPDATE`,
      [product_id]
    );

    if (products.length === 0 || products[0].stok < jumlah) {
      await conn.rollback();
      return res.status(400).json({ message: 'Produk tidak tersedia atau stok habis.' });
    }

    const total_harga = products[0].harga * jumlah;
    const kode_tiket_seminar = `KLS-${Math.floor(1000 + Math.random() * 9000)}`;

    // Kurangi stok lilin
    await conn.query(`UPDATE candle_products SET stok = stok - ? WHERE id = ?`, [jumlah, product_id]);

    // Simpan pesanan sekaligus terbitkan E-Tiket Pelatihan Pembuatan Lilin
    await conn.query(
      `INSERT INTO candle_orders (kode_tiket_seminar, user_id, product_id, jumlah, total_harga)
       VALUES (?, ?, ?, ?, ?)`,
      [kode_tiket_seminar, user_id, product_id, jumlah, total_harga]
    );

    await conn.commit();

    res.status(201).json({
      message: 'Pembelian lilin berhasil! Anda otomatis terdaftar di kelas pelatihan.',
      produk: products[0].nama_varian,
      total_harga,
      kode_tiket_seminar,
      jadwal: 'Sabtu, 09.00 WIB - Balai RW Tembalang'
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};