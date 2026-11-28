// MediaPipe Tasks Vision ortak ayarları. Yüz (gözlük) ve el (yüzük) aynı wasm dosyalarını kullanır;
// dosyalar bir kez indirilip paylaşılır.
//
// Sürüm package.json'daki @mediapipe/tasks-vision ile birebir aynı olmalı (1.2.0): wasm ile
// paket uyuşmazsa "ASM_CONSTS[code] is not a function" hatası çıkıyor.

import { FilesetResolver } from '@mediapipe/tasks-vision'

export const WASM_ADRESI = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm'

export const EL_MODELI =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

let dosyalar: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null

export function visionDosyalari() {
  dosyalar ??= FilesetResolver.forVisionTasks(WASM_ADRESI)
  return dosyalar
}
