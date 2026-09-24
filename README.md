# Cangkang Mas — versi login tetap (GitHub Pages + Firebase)

## Sebelum memasang: data lama penting
Data yang sudah diinput saat Anonymous tetap berada di Firestore pada path `users/{UID_ANONIM}/...`. Versi login memakai `users/{UID_EMAIL}/...`: **data lama tidak otomatis berpindah dan tidak akan muncul sampai dimigrasikan**. Jangan hapus akun Anonymous, koleksi, cache browser, atau ganti Rules terlebih dahulu. Simpan salinan data lama melalui Firebase Console / ekspor ketika sesi anonim yang benar masih dapat membukanya. Bila ada data terpisah di HP dan laptop, keduanya harus diperiksa dan digabung tanpa menduplikasi transaksi.

## Pengaturan Firebase
1. Authentication > Sign-in method: aktifkan **Email/Password**. Anonymous boleh tetap aktif untuk pemulihan data lama; versi ini tidak membuat sesi Anonymous baru.
2. Authentication > Users > Add user: buat **satu akun email dan password** untuk pemilik. Jangan memasukkan password ke kode HTML/JavaScript atau repository GitHub.
3. Firestore > Rules: file `firestore.rules` ini hanya memberi akses ke dokumen `users/{UID_EMAIL}/...` untuk akun Email/Password pemilik UID tersebut. **JANGAN publish rules baru sebelum data Anonymous lama dicadangkan/dipulihkan**, karena aturan ini akan menolak akses dari sesi Anonymous lama.
4. Unggah isi folder aplikasi ke root repository GitHub Pages (bukan ZIP), lalu buka website dan login sekali di tiap browser. Firebase menyimpan sesi dengan `browserLocalPersistence`, sehingga reload atau tutup/buka browser biasa tidak meminta login ulang selama sesi masih berlaku. Browser incognito, hapus data situs, sign out, atau pencabutan sesi dapat memerlukan login ulang.
5. HP dan laptop harus login dengan **email yang sama** agar memakai path Firestore UID yang sama dan sinkron otomatis.

## Data dan keamanan
- File `firebase-config.js` memuat konfigurasi web publik, **bukan password akun**.
- Form login tidak memiliki tombol daftar publik; buat akun hanya melalui Firebase Console.
- Jangan membuat stok awal baru atau mengulang transaksi lama di akun baru sebelum pemulihan data dari kedua perangkat selesai.
- Login tidak memindahkan dokumen Anonymous lama. Pemulihan perlu ekspor/penyalinan terverifikasi beserta relasi transaksi, stok, saldo tray, dan cicilan.
- Format angka titik pemisah ribuan, berat gram bilangan bulat, FIFO dan fitur bisnis lainnya tidak diubah pada revisi login ini.

## Revisi harga harian
- Tambah/Edit Jenis Telur: cukup nama dan status, tidak wajib memasukkan harga, tidak mengubah modal atau harga transaksi lama.
- Kulak Telur: harga beli per kg wajib diisi setiap transaksi, batch FIFO tetap sesuai nilai kulak aktual.
- Jual Telur offline/online selain Shopee: harga jual terakhir per jenis otomatis diisikan hanya sebagai referensi dan dapat diganti pada transaksi apa pun. Jika belum pernah jual, kolom kosong dan wajib diisi ketika menyimpan. Harga aktual penjualan tersimpan di transaksi; berhasil menjual baru memperbarui harga terakhir.
- Shopee: uang bersih diisi manual; tidak mengubah harga jual terakhir.
- Perubahan ini hanya kode antarmuka dan transaksi. Tidak perlu mengganti Firebase config atau Firestore Rules dan tidak menghapus data lama.

## Nota penjualan final (PNG lokal)
- Buka Riwayat / Detail transaksi penjualan: aplikasi membuat ulang gambar nota secara lokal di browser menggunakan data transaksi Firestore dan logo `assets/logo.png`.
- Desain putih, logo di atas, judul NOTA PENJUALAN, detail customer, rincian telur/tray/ongkir, total, dibayar, status LUNAS berwarna hijau. Jika masih bon, tampil sisa bon dan status BON BELUM LUNAS merah; bila lunas, bagian BON sama sekali tidak muncul. Tidak ada bagian Catatan.
- Tombol **Kirim gambar WhatsApp** membuka menu berbagi Android jika browser mendukung file sharing; pilih WhatsApp dan penerima secara manual. Jika perangkat/browser tidak mendukung, PNG diunduh untuk dilampirkan manual ke WhatsApp. Tombol **Simpan PNG** menyimpan gambar ke perangkat.
- Gambar struk TIDAK diunggah atau disimpan sebagai berkas di Firebase Storage / Firestore. Hanya data transaksi (termasuk field catatan internal yang sudah ada) disimpan di Firestore. Nota dikonstruksi ulang setiap dibuka. Berkas hasil berbagi tunduk pada penyimpanan perangkat/WhatsApp.
- File `receipt.js` wajib diunggah bersamaan dengan `app.js`, `index.html`, `style.css` dan `assets/logo.png`. Tidak perlu mengubah Firestore Rules atau konfigurasi Firebase untuk fitur nota ini.
