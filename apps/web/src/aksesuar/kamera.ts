// Kamera açma. Tarayıcı kamerayı yalnızca https ya da localhost'ta verir.
export type KameraYonu = 'on' | 'arka'

export async function kameraAc(video: HTMLVideoElement, yon: KameraYonu): Promise<MediaStream> {
  const akis = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: yon === 'on' ? 'user' : 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  })
  video.srcObject = akis
  await video.play()
  return akis
}

/** Kamera hatasını kullanıcıya gösterilecek cümleye çevirir */
export function kameraHatasi(h: unknown): string {
  const ad = (h as { name?: string })?.name
  if (ad === 'NotAllowedError') return 'Kamera izni verilmedi. Adres çubuğundaki kamera simgesinden izin verebilirsin.'
  if (ad === 'NotFoundError' || ad === 'OverconstrainedError') return 'Bu cihazda uygun kamera bulunamadı.'
  if (ad === 'NotReadableError') return 'Kamera başka bir uygulamada açık olabilir.'
  return 'Bir sorun çıktı: ' + ((h as Error)?.message ?? String(h))
}
