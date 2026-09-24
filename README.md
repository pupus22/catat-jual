# Cangkang Mas — Revisi fondasi V2 (GitHub Pages + Firebase)

## Penting sebelum memasang
Versi ini **menggunakan struktur data baru** `users/{uid}/events` dan menghitung ulang stok, FIFO, tray, bon, dan laba dari transaksi aktif. Struktur lama `users/{uid}/entries`, `products`, `contacts`, dan `meta/tray` **tidak dibaca/dimigrasikan otomatis**. Gunakan pada database usaha yang benar-benar kosong seperti yang disampaikan pemilik. Jika ternyata masih ada data versi lama, JANGAN ganti aplikasi aktif sebelum backup dan migrasi; tidak cukup hanya mengganti ZIP.

Akun Email/Password Firebase tetap digunakan dan sesi login disimpan di browser. ZIP mencakup konfigurasi Web Firebase untuk proyek `cangkang-mas` dan `firestore.rules` terbatas pada UID pemilik yang sebelumnya Anda berikan. API key Firebase Web bukan password; **jangan menaruh password Firebase di GitHub**.

## Cara memasang
1. Ekstrak ZIP. Upload **semua isi folder `cangkang-mas-v2`** (bukan folder luarnya) ke root repository GitHub Pages yang saat ini digunakan. File `index.html`, `app.js`, `engine.mjs`, `receipt.js`, `style.css`, `firebase-config.js`, `assets/logo.png`, `firestore.rules` harus tersedia sesuai struktur di ZIP.
2. Di Firebase Console pastikan Authentication → Sign-in method → Email/Password aktif dan akun pemilik masih ada. Firestore Rules gunakan isi file `firestore.rules` jika belum terpasang; tidak perlu mengganti UID jika akun belum berubah. Jangan buka database untuk semua akun Anonymous.
3. Setelah GitHub Pages selesai deploy, tutup tab aplikasi lama di HP dan laptop. Buka URL baru, refresh, login dengan akun yang sama. Pastikan **tidak ada transaksi baru yang diinput pada tab aplikasi versi lama**.
4. Sebelum transaksi asli, uji dengan data contoh: tambah jenis telur, supplier, customer, stok awal tray kosong 8 pcs, kulak telur 10 kg (tray terima 8, tukar 8), penjualan sebagian, bon, cicilan, edit dan pembatalan salah input, nota, laporan. Cocokkan hasil dengan kondisi fisik.

## Alur utama
- Beranda: tombol kulak, jual, tray, retur; ringkasan stok dan laba.
- Jual: satu jenis telur per transaksi, gram bulat; harga per kg bebas diubah. Shopee cukup input uang bersih yang diterima; potongan Shopee tidak dihitung ulang.
- Stok: jenis telur boleh ditambah tanpa harga wajib; stok awal telur/tray dan stok opname.
- Lainnya: supplier/customer, transaksi tray tukar/pinjam/beli/kembali/rusak, retur customer/supplier, bon per nota, penggantian, biaya, backup JSON.
- **Kelola Data** satu-satunya tempat tombol Edit dan Hapus input salah, untuk semua jenis data. Hapus = batalkan pengaruhnya, dokumen tetap untuk audit. Koreksi otomatis menghitung ulang seluruh catatan; jika stok/saldo di salah satu tanggal menjadi negatif atau nota yang terkait menjadi tidak valid, koreksi diblokir dengan notifikasi dan data awal tidak diubah. Jika membatalkan penjualan yang sudah ada cicilan, batalkan/koreksi cicilan terkait terlebih dahulu.
- Tray fisik layak menghitung total tray yang berada di usaha, baik kosong maupun berisi telur. Jumlah tray kosong yang diserahkan ke kandang harus sesuai fisik dan dicatat. Karena jumlah tray per ikat tidak tetap, aplikasi tidak menghitung tray otomatis dari berat.
- Riwayat/Customer → nota: buat PNG lokal memakai logo dan desain nota yang disepakati; gambar tidak diunggah ke Firebase. Cetak struk lebar 72 mm atau bagikan lewat menu Share ke WhatsApp jika browser mendukung.

## Cadangan dan pemulihan
- Lainnya → Ekspor backup JSON: mencakup event/transaksi dan riwayat edit/hapus (`audits`). Simpan file di tempat aman.
- Lainnya → Pulihkan backup: **hanya jika database events benar-benar kosong**, file V2 valid, dan maksimum 400 dokumen event+audit; dilakukan satu transaksi Firestore atomik. Backup lebih besar memerlukan prosedur migrasi terpisah; aplikasi menolak impor sebagian. Jangan mengunggah ulang backup ke database yang sudah berisi transaksi.

## Validasi dan batasan pengujian
`node tests.mjs` menjalankan pengujian logika lokal, termasuk FIFO, tukar tray, bon per nota, retur, biaya, perubahan tanggal, koreksi/hapus dan pembulatan. UI login dan rangkaian transaksi juga diuji di Chromium lokal **menggunakan Firebase tiruan**, bukan menggunakan akses akun atau Firestore pengguna secara langsung. Anda tetap harus melakukan uji singkat login, simpan dan sinkronisasi langsung pada HP/laptop di Firebase Anda sebelum digunakan untuk pembukuan usaha. Tidak ada pengujian cetak fisik pada printer Anda atau berbagi berkas langsung dari browser HP Anda.

## Struktur data
```
users/{ownerUid}/events/{eventId}   # kejadian/input aktif atau dibatalkan
users/{ownerUid}/audit/{auditId}    # riwayat before/after dan alasan koreksi
users/{ownerUid}/meta/revision     # pengaman urutan penyimpanan antarperangkat
```
Ringkasan stok, saldo dan laporan **diturunkan dari events**, bukan disimpan sebagai angka salinan yang rawan tidak sinkron. Browser membaca seluruh histori untuk perhitungan; untuk volume data sangat besar atau multiuser perlu arsitektur backend khusus. Konfigurasi ini ditujukan untuk satu pemilik usaha sebagaimana diminta.

## Revisi invoice tanpa ikon produk
Invoice PNG menggunakan template krem dengan logo Cangkang Mas, alamat KEBRAON INDAH PERMAI D.38 SURABAYA, nomor telepon 0857-3192-9628 / 0813-5857-8824, tabel **teks saja** (nama barang, qty, harga, jumlah), total dan status pembayaran. Tidak ada ilustrasi atau ikon telur/tray/dus/plastik pada nota. Kolom BON hanya tampil bila masih ada sisa tagihan. PNG dibuat lokal di browser dan tidak diunggah ke Firebase. Isi nota diambil hanya dari data transaksi aplikasi yang benar-benar tersimpan, bukan data contoh pada visualisasi.

## Revisi invoice ringkas + ikon aplikasi
- Header invoice krem dengan logo asli diperbesar, alamat dan nomor telepon persis sesuai permintaan.
- Tabel nama barang / QTY / harga / jumlah tanpa gambar produk. Hanya satu TOTAL; kolom DIBAYAR dan status LUNAS dihilangkan. SISA BON hanya muncul jika masih ada sisa tagihan. Tinggi PNG mengikuti jumlah baris; footer dekat total.
- Ikon SVG terpasang pada navigasi bawah, tombol menu transaksi, dan tombol aksi utama aplikasi; ikon tidak dimasukkan ke nota.
- Gambar invoice dibuat lokal di browser untuk cetak dan WhatsApp, tidak disimpan di Firebase.
- Kode transaksi dan Firestore Rules tidak diubah oleh revisi tampilan ini. Pengujian langsung cetak printer dan WhatsApp pada HP tetap harus dilakukan sebelum pemakaian rutin.

## Revisi invoice modern (desain disetujui)
- Template krem modern, huruf Arial/sans-serif konsisten, logo asli besar di header, alamat dan nomor telepon usaha, daftar barang tanpa ikon produk, dan kotak total merah.
- `DIBAYAR` dan `LUNAS` tidak ditampilkan; `SISA BON` hanya jika ada saldo tagihan.
- Footer Cangkang Mas dan tulisan `THANK YOU FOR YOUR BUSINESS!` dimuat sepenuhnya dalam ukuran gambar dinamis; gambar dibuat di browser saja dan tidak diunggah ke Firebase.
- Tidak ada perubahan pada proses login, skema Firestore, transaksi, FIFO, ataupun ikon aplikasi. Untuk menghindari cache versi lama, referensi aset HTML/JS/CSS diberi versi baru.

## Revisi invoice sesuai referensi (kolom presisi)
- Header besar, tabel lima kolom dengan nilai tepat di tengah kolom judul, kotak TOTAL merah, footer lengkap dan dekorasi lengkung krem-merah meniru referensi pengguna.
- Tidak ada ikon/gambar produk, label DIBAYAR atau LUNAS pada nota. SISA BON hanya tampil bila ada. Gambar dihasilkan saat diminta di browser, tidak disimpan di Firebase.
- Fitur aplikasi, sesi login, Firebase Rules, dan alur transaksi tidak diubah oleh revisi visual ini.
