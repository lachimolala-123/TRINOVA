CREATE DATABASE IF NOT EXISTS trinova_tembalang;
USE trinova_tembalang;

-- 1. Tabel Pengguna (Warga & Admin RT/RW)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    no_hp VARCHAR(20) UNIQUE NOT NULL,
    rt_rw VARCHAR(20) NOT NULL,
    role ENUM('warga', 'admin') DEFAULT 'warga',
    poin INT DEFAULT 0 CHECK (poin >= 0),
    total_liter_terverifikasi DECIMAL(6,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Setoran Minyak Jelantah (Anti-Kecurangan Dua Arah)
CREATE TABLE deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_tiket VARCHAR(15) UNIQUE NOT NULL, -- Contoh: TRN-842
    user_id INT NOT NULL,
    lokasi_pos VARCHAR(100) NOT NULL,
    liter DECIMAL(5,2) NOT NULL CHECK (liter > 0),
    poin_estimasi INT NOT NULL,
    status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- 3. Tabel Penukaran Hadiah Sabun Cuci Piring
CREATE TABLE redemptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_voucher VARCHAR(15) UNIQUE NOT NULL, -- Contoh: SBN-4910
    user_id INT NOT NULL,
    poin_dipakai INT DEFAULT 50,
    nama_hadiah VARCHAR(100) DEFAULT 'Sabun Cuci Piring 450ml',
    status ENUM('ready', 'claimed') DEFAULT 'ready',
    claimed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. Tabel Produk Lilin Aromaterapi
CREATE TABLE candle_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_varian VARCHAR(100) NOT NULL,
    aroma VARCHAR(100) NOT NULL,
    harga INT NOT NULL,
    stok INT DEFAULT 50
);

-- 5. Tabel Pembelian Lilin + E-Tiket Seminar Otomatis
CREATE TABLE candle_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode_tiket_seminar VARCHAR(15) UNIQUE NOT NULL, -- Contoh: KLS-7731
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    jumlah INT NOT NULL DEFAULT 1,
    total_harga INT NOT NULL,
    jadwal_seminar VARCHAR(100) DEFAULT 'Sabtu, 09.00 WIB - Balai RW Tembalang',
    status_pembayaran ENUM('pending', 'paid') DEFAULT 'paid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES candle_products(id)
);

-- Data Awal (Seed Data)
INSERT INTO users (nama, no_hp, rt_rw, role, poin, total_liter_terverifikasi) VALUES
('Ibu Siti Aminah', '081234567801', 'RT 02 / RW 04 Tembalang', 'warga', 40, 4.00),
('Ibu Rina Kusuma', '081234567802', 'RT 01 / RW 04 Tembalang', 'warga', 55, 5.50),
('Pak Hendra (Ketua RW)', '081234567899', 'RW 04 Tembalang', 'admin', 0, 0.00);

INSERT INTO candle_products (nama_varian, aroma, harga, stok) VALUES
('Lilin Sereh Wangi + Tiket Kelas', 'Lemongrass Anti-Nyamuk', 25000, 40),
('Lilin Kopi Tembalang + Tiket Kelas', 'Roasted Coffee', 28000, 35),
('Lilin Lavender Tenang + Tiket Kelas', 'Calming Lavender', 30000, 30);