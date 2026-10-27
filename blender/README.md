# blender – 3B kaynak dosyalar (Sorumlu: A)

- `.blend` dosyaları (Git LFS, kilitlenebilir)
- `scripts/` – Blender Python betikleri (ölçüm, kalibrasyon, dışa aktarma)

## Kural

Bir `.blend` dosyasında çalışmaya başlamadan önce kilitleyin:

```bash
git lfs lock blender/avatar_kadin.blend
```

İşiniz bitince `git lfs unlock ...`. Dışa aktarılan GLB'ler `assets/models/` klasörüne konur; kurallar `docs/glb-sozlesmesi.md` içinde.
