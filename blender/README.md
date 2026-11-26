# blender – 3B kaynak dosyalar (Sorumlu: A)

- `.blend` dosyaları (Git LFS, kilitlenebilir)
- `scripts/` – Blender Python betikleri (ölçüm, kalibrasyon, dışa aktarma)

## Avatarı üretmek

Gerekenler: Blender 5.2, MPFB eklentisi (Get Extensions → "MPFB") ve MakeHuman sistem
varlık paketi (MPFB paneli → Load pack from zip).

```bash
blender --background --python blender/scripts/avatar_olustur.py             # kadın
blender --background --python blender/scripts/avatar_olustur.py -- erkek    # erkek
```

Yaklaşık 20 saniyede `assets/models/avatar_<model>.glb` ve `avatar_<model>.calib.json` üretilir.
Vücut aralıkları betiğin başındaki `TABAN` ve `KEYLER` ayarlarındadır; değiştirince yeniden
çalıştırmak yeterli. Ölçüm (boy, göğüs, bel, kalça) `scripts/olcum.py` içindedir.

## Tişört şablonunu üretmek

Avatardan sonra çalıştırılır; `avatar_kadin.glb`'yi okur, MPFB gerekmez.

```bash
blender --background --python blender/scripts/sablon_tisort.py
```

Yaklaşık 30 saniyede `assets/models/sablon_tisort.glb`, `.calib.json` ve `.keypoints.json`
üretilir. Tişört, avatarın gövde ve kol kesitlerinden örülür; bu yüzden avatarla aynı 5 vücut
key'ini taşır. Ürün key'lerinin aralıkları (`length`, `width`, `sleeve`) betiğin başındaki
`URUN` ayarındadır.

## Kural

Bir `.blend` dosyasında çalışmaya başlamadan önce kilitleyin:

```bash
git lfs lock blender/avatar_kadin.blend
```

İşiniz bitince `git lfs unlock ...`. Dışa aktarılan GLB'ler `assets/models/` klasörüne konur; kurallar `docs/glb-sozlesmesi.md` içinde.
