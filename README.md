# Cangkang Mas — paket perbaikan fondasi (BELUM RILIS PRODUKSI)

Paket ini merupakan **revisi parsial yang diuji dengan simulasi lokal**, bukan pernyataan bahwa semua fitur dan koreksi historis telah selesai. Jangan langsung mengganti aplikasi aktif yang sudah berisi transaksi asli dengan paket ini sebelum backup dan uji di proyek Firebase terpisah.

## Perbaikan yang DIIMPLEMENTASIKAN

- Sesi login Email/Password tetap dipertahankan; akun anonim tidak dibuat.
- Simpan ganda akibat dua kali menekan Simpan dicegah di antarmuka; kulak dan penjualan memakai ID operasi stabil selama form yang sama masih terbuka, sehingga pengulangan setelah respons jaringan tidak pasti tidak membuat transaksi baru. Pembayaran bon juga memakai ID operasi stabil.
- Pembayaran bon memilih **nota tertentu**, mengurangi sisa bon nota dan saldo customer dalam satu transaksi Firestore. Nota cetak ulang menampilkan nilai pembayaran terbaru. Bon lama yang pernah dicicil tanpa alokasi per nota harus direkonsiliasi terlebih dahulu; aplikasi menolak pembayaran baru jika saldo total tidak cocok dengan jumlah saldo nota.
- Ringkasan Shopee memperhitungkan tray dibeli sekali; nota Shopee tidak mengulang baris penerimaan bersih dua kali.
- Form penjualan tidak dihapus oleh update data real-time saat sedang diisi.
- Kesalahan stok tray saat tukar menampilkan saldo dan cara mencatat stok awal/opname.
- Format angka tetap titik sebagai pemisah ribuan; gram dan rupiah ditampilkan bulat. Logo serta desain nota tetap.
- Firestore Rules pada paket hanya mengizinkan UID akun Email/Password pemilik yang sebelumnya diberikan, pada ruang data UID sendiri. Jangan menimpa Rules yang telah dipersonalisasi tanpa memeriksa UID-nya.

## MASIH BELUM SELESAI — jangan gunakan fitur ini pada data penting

1. Edit/Hapus **seluruh kategori** belum diimplementasikan: menu Kelola Data masih memiliki batasan lama.
2. Rekalkulasi FIFO historis setelah mengedit berat/harga/tanggal kulak lama atau menghapus transaksi yang sudah memiliki transaksi lanjutan **belum selesai**.
3. Pencatatan tray kosong vs tray yang sedang berisi telur belum dipisahkan sepenuhnya. Stok awal fisik harus dicatat sesuai kenyataan.
4. Retur customer ↔ supplier, penggantian, dan pembalikan kas ketika membatalkan penjualan lunas belum direkonsiliasi penuh.
5. Laporan laba lintas bulan dan alokasi biaya bersama belum diaudit tuntas.
6. Belum diuji pada Firebase produksi/HP Anda; simulasi lokal tidak membuktikan kondisi jaringan, Rules, atau kompatibilitas data lama.

## Menguji tanpa mengubah transaksi asli

1. Ekspor cadangan JSON dari aplikasi aktif. Simpan juga cadangan Firestore yang dapat dipulihkan; JSON browser hanya ekspor isi tampilan saat itu, bukan backup database terverifikasi.
2. Buat **proyek Firebase terpisah untuk pengujian**; ganti hanya `firebase-config.js` dan sesuaikan `firestore.rules` dengan UID akun pengujian.
3. Unggah isi folder `cangkang-mas` ke GitHub Pages repo uji. Jangan campur file lama dan baru.
4. Uji kulak → jual → tukar tray → cicil bon → cetak ulang nota, lalu bandingkan stok, bon, dan laba dengan perhitungan manual.
5. Jangan memindahkan aplikasi aktif sebelum semua skenario pada bagian 'MASIH BELUM SELESAI' diperbaiki dan diverifikasi dengan salinan data sesungguhnya.

## Pengujian otomatis lokal

Skrip `tests/smoke.cjs` menguji simulasi perhitungan dan penyimpanan atomik tiruan. Jalankan `node tests/smoke.cjs`. Simulasi ini **bukan** pengujian Firestore sebenarnya.

Gambar nota PNG dihasilkan di browser dan **tidak disimpan ke Firebase**.
