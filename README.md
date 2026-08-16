# Izin Kerja Web — versi produksi dasar

Aplikasi form IZIN KERJA responsif bergaya Android dengan **PDF 2 halaman memakai template PDF asli** sebagai background. Isi form ditempatkan di atas template; dokumen baku tidak digambar ulang.

## Fitur
- Form A–H responsif untuk HP, tablet, dan desktop.
- PDF 2 halaman dengan template asli.
- Tanda tangan via layar sentuh/mouse.
- Download dan pratinjau PDF.
- Notifikasi email + PDF attachment ke `stasiungombong2026@gmail.com`.
- Login admin.
- Nomor Permit otomatis: `IK-TAHUN-0001` dst.
- Riwayat permit tersimpan di `data/permits.json`.
- Dashboard admin: pencarian, filter status, ubah status, dan buka PDF.

## Menjalankan
1. Install Node.js 18+.
2. `npm install`
3. Salin `.env.example` menjadi `.env`.
4. Isi `ADMIN_USER`, `ADMIN_PASS`, `SESSION_SECRET`.
5. Isi SMTP pengirim. Untuk Gmail gunakan **App Password**, bukan password Gmail utama.
6. `npm start`
7. Buka `http://localhost:3000`.

## Catatan keamanan
Untuk internet publik, gunakan HTTPS/reverse proxy dan password admin yang kuat. Jangan commit `.env` atau App Password ke Git.

## Template baku
`public/templates/izin-kerja-1.pdf` dan `izin-kerja-2.pdf` adalah template yang diberikan. Koordinat overlay dapat diuji dan dikalibrasi sebelum operasional resmi.
