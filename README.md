# Cangkang Mas — Web App GitHub Pages + Firebase

Aplikasi mobile-first, tanpa formulir login; identitas Firebase anonim per browser. File: `index.html`, `style.css`, `app.js`, `firebase-config.js`, `firestore.rules`, dan `assets/logo.png`.

## Pemasangan (tanpa halaman login) — perbaikan sesi anonim

1. Di Firebase Console proyek `cangkang-mas`, aktifkan **Authentication > Sign-in method > Anonymous** (sudah Anda lakukan).
2. Buat **Cloud Firestore** jika belum dibuat; pilih production mode. Buka tab **Rules**, ganti semua isinya dengan file `firestore.rules` dari paket ini, lalu klik **Publish**. Jangan gunakan `allow read, write: if true`.
3. Konfigurasi Firebase proyek `cangkang-mas` sudah dimasukkan ke `firebase-config.js` di paket ini.
4. Unggah **seluruh ISI folder** `cangkang-mas` ke root repository GitHub Anda, termasuk `index.html`, `app.js`, `firebase-config.js`, `firestore.rules`, `style.css`, dan folder `assets`. Jangan hanya mengunggah ZIP.
5. Buka **Settings > Pages**, pilih **Deploy from a branch**, `main`, `/(root)` lalu Save. Buka alamat GitHub Pages setelah deploy. Dashboard akan muncul tanpa form login.

**PENTING: BATASAN TANPA LOGIN**: Setiap browser/perangkat membuat identitas Firebase anonim yang berbeda dan data terpisah. Membuka di HP lain, browser lain, mode incognito, atau menghapus data browser dapat membuat akun anonim baru sehingga data lama tidak terlihat. Jangan gunakan paket ini untuk keuangan produksi bila Anda perlu satu database bersama antara HP dan laptop atau akses eksklusif hanya pemilik. Anonymous Authentication tidak membuktikan bahwa pengunjung adalah pemilik, dan orang lain yang membuka website juga dapat membuat ruang data mereka sendiri (tetapi rules ini mencegah membaca data identitas anonim Anda). Untuk satu database pribadi yang sinkron antarperangkat, diperlukan autentikasi pemilik atau layanan backend dengan pengamanan tersendiri.

## Mengapa akun Anonymous sebelumnya bisa banyak?

Versi ini menunggu Firebase memulihkan sesi dari browser (`authStateReady`) dan
menggunakan penyimpanan lokal (`browserLocalPersistence`) sebelum mencoba membuat akun.
Satu pemanggilan awal dijaga agar tidak berulang pada halaman yang sama. Jika browser
masih menyimpan UID lama tetapi sesi hilang, aplikasi **berhenti dengan pesan peringatan**
alih-alih diam-diam membuat UID baru. Jangan hapus penyimpanan situs, menggunakan incognito,
atau menghapus akun Anonymous yang masih dipakai. Tujuh akun lama di Console tidak otomatis
dihapus; pastikan dulu mana yang berisi transaksi sebelum melakukan pembersihan.

**Sinkronisasi HP dan laptop belum ada dalam versi ini**: `users/{uid}/...` memisahkan data
per identitas. Mengizinkan dua UID di Rules **tidak** menyatukan datanya. Tidak ada cara
aman untuk memastikan bahwa semua pengunjung anonim GitHub Pages adalah pemilik usaha;
untuk satu ruang data privat lintas perangkat perlu autentikasi pemilik atau backend
khusus dengan mekanisme akses/pairing yang aman.

## Cara menggunakan

1. Pada **Stok > + Jenis telur** tambahkan nama jenis telur dan harga normal per kg.
2. Bila sudah memiliki stok, gunakan **Stok > Koreksi stok**, masukkan berat awal serta modal per kg; untuk tray gunakan **Koreksi tray**.
3. Tambahkan customer/supplier melalui **Lainnya**. Gunakan nama customer untuk bon atau tray yang dipinjam.
4. Saat kulak, isi jumlah ikat 10/15 kg; centang **Berat aktual berbeda** jika hasil timbang berbeda. Isi tray diterima/ditukar/dibeli sesuai kenyataan.
5. Saat menjual, isi satu jenis telur per transaksi. Berat gram adalah bilangan bulat. Shopee: pilih saluran Shopee dan isi uang bersih yang Anda terima; tidak ada perhitungan potongan marketplace kedua kali.
6. Laporan memakai tanggal transaksi dan menampilkan laba = penerimaan − HPP FIFO − biaya yang dicatat. Pengeluaran bersama masuk gabungan dan tidak otomatis dibagi ke offline/online.
7. Gunakan tombol detail pada riwayat untuk nota dan berbagi teks nota lewat WhatsApp. **Lainnya > Ekspor data** membuat salinan JSON, laporan dapat diekspor CSV (dibuka Excel).

## Format angka dan keamanan

Input angka bulat, titik pemisah ribuan: `1.500` gram, `Rp30.000`. Jangan mengetik koma atau angka di belakang desimal. Angka uang dihitung dalam rupiah bulat; bila hasil hitung perkalian berat dalam gram menghasilkan pecahan rupiah, sistem membulatkannya ke rupiah terdekat. Tray selalu satuan pcs.

Transaksi stok dan bon dijalankan dengan Firestore transaction: gagal jaringan tidak dianggap tersimpan dan perubahan terkait bersifat atomik. Saat offline, operasi tulis perlu koneksi; jangan ulangi klik sebelum mengetahui hasil. Ekspor JSON merupakan **backup unduhan manual**, bukan pemulihan satu-klik. Atur ekspor rutin dan simpan di tempat aman.

## Batasan versi awal yang perlu diketahui

- Retur customer: telur busuk **tidak ditambahkan** ke stok layak jual. Retur internal dan ke supplier: telur dikeluarkan melalui FIFO. Penggantian telur kepada customer menggunakan FIFO saat dikirim dan mengurangi saldo hak penggantian; biaya pengganti dicatat saat pengiriman.
- Penggantian telur supplier dapat diterima melalui Kulak Telur dengan modal Rp0; penutupan otomatis hak penggantian dari supplier belum tersedia, agar tidak membuat perubahan saldo keliru. Catat klaim supplier di riwayat dan rekonsiliasi saat fitur penutupan klaim siap.
- Tidak tersedia edit/hapus transaksi historis otomatis; bila salah input, gunakan koreksi stok dan transaksi penyesuaian yang terdokumentasi, atau minta implementasi fitur reversal yang terhubung. Jangan hapus dokumen transaksi dari Firestore secara manual karena tidak akan mengembalikan stok/bon.
- Pencatatan penjualan Shopee memakai nilai uang bersih yang Anda input sebagai pendapatan transaksi. Jika dana belum cair, catat hanya setelah nominal penerimaannya diketahui. Versi ini tidak melakukan rekonsiliasi saldo marketplace.
- Produk menyimpan lot FIFO aktif di satu dokumen per jenis; untuk usaha besar dengan ribuan pembelian/lot aktif, desain ini perlu dipindahkan ke lot per dokumen agar tidak mendekati batas ukuran dokumen Firestore.
- Pembayaran awal bon penjualan tercatat. Cicilan berikutnya dicatat di detail customer dan mengurangi bon. Laporan laba tidak menghitung cicilan sebagai omzet baru.

## Pengembangan berikutnya

Prioritas: penutupan hak penggantian supplier setelah lot pengganti masuk, tautan retur ke transaksi asal untuk atribusi laba per saluran, reversal transaksi, nota gambar/PDF dan restore backup. Jangan menganggap fungsi yang tercatat di bagian batasan sudah selesai.

## Perbaikan navigasi & pemeriksaan
Tombol Jual di navigasi bawah membuka form penjualan dan menggulir ke bagian atas. Semua halaman navigasi disetel demikian agar setelah menggulir Dashboard, halaman Jual tidak terlihat kosong di area bawah. Ruang bagian akhir konten ditambah agar tombol Simpan tidak tertutup navigasi HP. Validasi transaksi tetap dijalankan Firestore; tanpa koneksi ke proyek Firebase pribadi, tes lokal tidak mengonfirmasi transaksi benar-benar tersimpan.
