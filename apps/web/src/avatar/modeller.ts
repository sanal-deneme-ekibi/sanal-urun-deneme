// GLB dosyalarının adresleri. Dosyalar repo kökündeki assets/models içinde (Git LFS).
import avatarKadin from '../../../../assets/models/avatar_kadin.glb?url'
import avatarErkek from '../../../../assets/models/avatar_erkek.glb?url'
import tisortKadin from '../../../../assets/models/sablon_tisort_kadin.glb?url'
import tisortErkek from '../../../../assets/models/sablon_tisort_erkek.glb?url'
import type { Model } from '../olcu/kalibrasyon'

export const AVATAR_URL: Record<Model, string> = { kadin: avatarKadin, erkek: avatarErkek }
export const TISORT_URL: Record<Model, string> = { kadin: tisortKadin, erkek: tisortErkek }

// Draco çözücüsü uygulamanın içinden (public/draco) yüklenir; internetten indirilmez.
export const DRACO_YOLU = '/draco/'
