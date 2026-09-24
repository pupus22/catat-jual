# Cangkang Mas — Web App GitHub Pages + Firebase

Aplikasi satu pengguna, mobile-first. File: `index.html`, `style.css`, `app.js`, `firebase-config.js`, `firestore.rules`, dan `assets/logo.png`.

## Pasang Firebase

1. Buka https://console.firebase.google.com/ lalu buat proyek (atau pilih proyek Anda).
2. Pada **Build > Authentication > Sign-in method**, aktifkan **Email/Password**. Pada **Users**, tambahkan akun email/password Anda sendiri. Aplikasi **tidak** menyediakan halaman pendaftaran publik.
3. Pada **Build > Firestore Database**, buat database. Mulai dengan mode production (aturan awal akan menolak akses sampai rules dipasang).
4. Dari **Project settings > Your apps**, daftarkan **Web App** dan salin isi `firebaseConfig` ke `firebase-config.js` (ganti semua `ISI_...`). Jangan pernah menaruh password akun Firebase di file ini.
5. Di **Authentication > Users**, salin **User UID** akun Anda. Buka `firestore.rules`, ganti `UID_PEMILIK` dengan UID tersebut, lalu tempel dan **Publish** di tab Firestore Database > Rules. Aturan tersebut membuat database hanya dapat dibaca/ditulis oleh akun pemilik. Buat UID aturan berbeda bila Anda memang ingin mengganti pemilik.
6. Pada Firebase Authentication > Settings > Authorized domains, tambahkan domain GitHub Pages Anda, misalnya `namaakun.github.io` jika belum ada.

## Unggah ke GitHub Pages

1. Buat repository baru, misalnya `cangkang-mas`. Unggah **seluruh isi folder** `cangkang-mas` ke root repository; pastikan `index.html` ada pada root. Folder `assets` harus ikut diunggah.
2. Repository > **Settings > Pages > Build and deployment**: pilih **Deploy from a branch**, branch `main`, folder `/(root)`, lalu Save.
3. Tunggu hingga alamat `https://namaakun.github.io/cangkang-mas/` aktif. Buka via HP, masuk dengan akun email/password Firebase yang dibuat pada langkah 2.
4. Konfigurasi Web Firebase boleh terlihat di source code; keamanan database bergantung pada Authentication, Rules, dan akses akun Anda. Jangan unggah file service-account/private key ke GitHub.

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
