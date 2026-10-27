# Çalışma kuralları

## Dallar (branch)

- `main` korumalıdır: doğrudan push yapılmaz, her değişiklik Pull Request ile gelir.
- Her iş kendi dalında yapılır. İsim: `<üye harfi>/<kısa-iş-adı>`
  - `a/avatar-shape-keys`
  - `b/glb-goruntuleyici`
  - `c/supabase-sema`

## Akış

1. `git checkout main` ve `git pull`
2. `git checkout -b a/yeni-is`
3. Çalış, küçük ve anlamlı commit'ler at
4. `git push -u origin a/yeni-is`
5. GitHub'da Pull Request aç, ilgili issue'yu bağla (`Closes #12`)
6. En az bir arkadaş inceler ve onaylar, sonra `main`'e birleştirilir

## Commit mesajları

Kısa ve Türkçe olabilir: `Avatar için chest shape key eklendi`

## Blender ve büyük dosyalar

- `.blend` ve `.zprj` dosyaları birleştirilemez. Çalışmaya başlamadan önce kilitleyin:
  ```bash
  git lfs lock blender/avatar_kadin.blend
  git lfs unlock blender/avatar_kadin.blend
  ```
- LFS kotası sınırlıdır: `.blend` dosyalarını her küçük değişiklikte değil, günde bir anlamlı kayıtla gönderin.

## Gizli bilgiler

- Şifre ve anahtarlar `.env` dosyasında durur, repoya girmez. Şablon: `.env.example`.

## Veri setleri

- Veri setleri (DeepFashion2, kendi topladığımız görseller) repoya **konmaz**. Google Drive / Kaggle'da tutulur.
- Repoda yalnızca indirme ve hazırlama betikleri bulunur.

## Toplantılar

- Haftada iki kısa toplantı. Notlar `docs/toplanti-notlari/` altına tarihli dosya olarak yazılır.
- Haftalık entegrasyon günü: A'nın yeni GLB'si B'nin görüntüleyicisinde ve C'nin çözücüsüyle denenir.
