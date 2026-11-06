# blender – 3B kaynak dosyalar (Sorumlu: A)

- `.blend` dosyaları (Git LFS, kilitlenebilir)
- `scripts/` – Blender Python betikleri (ölçüm, kalibrasyon, dışa aktarma)

## Avatarı üretmek

Gerekenler: Blender 5.2, MPFB eklentisi (Get Extensions → "MPFB") ve MakeHuman sistem
varlık paketi (MPFB paneli → Load pack from zip).

```bash
blender --background --python blender/scripts/avatar_olustur.py
```

Yaklaşık 10 saniyede `assets/models/avatar_kadin.glb` ve `avatar_kadin.calib.json` üretilir.
Vücut aralıkları betiğin başındaki `TABAN` ve `KEYLER` ayarlarındadır; değiştirince yeniden
çalıştırmak yeterli. Ölçüm (boy, göğüs, bel, kalça) `scripts/olcum.py` içindedir.

## Kural

Bir `.blend` dosyasında çalışmaya başlamadan önce kilitleyin:

```bash
git lfs lock blender/avatar_kadin.blend
```

İşiniz bitince `git lfs unlock ...`. Dışa aktarılan GLB'ler `assets/models/` klasörüne konur; kurallar `docs/glb-sozlesmesi.md` içinde.
