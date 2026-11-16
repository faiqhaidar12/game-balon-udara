# 🎈 Balon Udara — Petualangan ke Rumah Awan

Game web petualangan untuk anak-anak. Antar **Boni si beruang** pulang ke **Rumah Awan** di puncak langit dengan balon udara.

Tidak ada skor atau kumpulkan bintang. Fokusnya adalah perjalanan: melewati 4 bab langit, menjelajahi pulau-pulau terapung, menghindari burung dan angin puting beliung, lalu sampai ke rumah Boni di ketinggian 1.500 m.

## Cara Menjalankan

**Paling mudah:** klik dua kali `index.html` — game langsung berjalan di browser.

Atau jalankan server lokal dari folder ini:

```bash
php -S localhost:8000
```

Lalu buka `http://localhost:8000` di browser.

## Kontrol

| Aksi | Komputer | HP / Tablet |
| --- | --- | --- |
| Terbang ke atas | Tahan **Spasi**, **W**, atau **↑** | Tahan layar |
| Belok kiri / kanan | **← →** atau **A D**, atau geser mouse saat menahan klik | Geser jari saat menahan layar |
| Jeda | **Esc** atau **P**, atau tombol ⏸ | Tombol ⏸ |

## Alur Petualangan

1. **Bab 1 — Padang Rumput.** Lepas landas dari panggung kayu di tengah lapangan.
2. **Bab 2 — Danau Pelangi.** Melewati pulau terapung dengan pelangi dan air terjun.
3. **Bab 3 — Awan Senja.** Langit berubah jingga, pulau musim gugur muncul.
4. **Bab 4 — Malam Berbintang.** Pulau lentera dan Rumah Awan sudah dekat.
5. **Sampai!** Capai ketinggian 1.500 m untuk melihat Boni berkumpul lagi dengan keluarganya.

## Yang Ada di Dalam Game

- 5 warna balon yang bisa dipilih, dengan Boni si beruang di keranjang.
- **Landasan peluncuran** lengkap dengan panggung kayu, penonton kecil, rumah, pohon, dan windsock.
- **Pulau-pulau terapung** yang berbeda di setiap bab: kincir angin, pelangi, musim gugur, dan lentera malam.
- **Kartu progres perjalanan** di HUD: bab saat ini dan sisa jarak ke Rumah Awan. Tanpa skor, tanpa bintang.
- **Angin puting beliung** 🌪️ yang berputar, menerbangkan serpihan, dan bisa menyeret balon. Ada peringatan saat angin mendekat.
- Hati ❤️ untuk memulihkan nyawa dan gelembung 🫧 untuk perlindungan sementara.
- 3 nyawa, efek getar, partikel, konfeti, dan suara yang dibuat langsung dengan Web Audio (tanpa file audio).
- Langit berubah siang → senja → malam seiring perjalanan.
- Layar penutup saat sampai di Rumah Awan, lengkap dengan adegan pulau dan keluarga Boni.
- Tampilan responsif untuk desktop, HP, dan tablet.

## Teknologi

HTML, CSS, dan JavaScript murni dengan Canvas 2D. Tidak perlu build tool atau dependensi.
