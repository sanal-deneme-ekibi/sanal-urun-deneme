import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { acikKenarlar, omuzKutusu, omuzuIsaretle, ortuluKoseler } from './ortu'

describe('ortuluKoseler', () => {
  it('yalnızca kıyafetin örttüğü köşeleri işaretler', () => {
    // Avatar: 10 cm yarıçaplı küre. Kıyafet: 12 cm yarıçaplı, y 0..0,3 arası açık silindir (üst yarıyı örter).
    const kure = new THREE.SphereGeometry(0.1, 24, 16)
    const silindir = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 32, 4, true)
    silindir.translate(0, 0.15, 0)
    const ortu = ortuluKoseler(
      kure.attributes.position.array,
      kure.attributes.normal.array,
      silindir.attributes.position.array,
      silindir.index!.array,
    )
    const p = kure.attributes.position
    let dogru = 0, toplam = 0
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i)
      // Ekvatorun biraz üstündeki yan köşeler örtülü olmalı, alt yarı örtülü olmamalı
      if (y > 0.02 && y < 0.07) {
        toplam++
        if (ortu[i] === 1) dogru++
      }
      if (y < -0.02) expect(ortu[i]).toBe(0)
    }
    expect(dogru).toBe(toplam)
  })
})

describe('acikKenarlar ve kolIcUclari', () => {
  it('açık silindirin iki döngüsünü bulur', () => {
    const s = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 16, 2, true)
    const d = acikKenarlar(s.attributes.position.array, s.index!.array)
    expect(d).toHaveLength(2)
    expect(d[0]).toHaveLength(16)
  })
  it('omuz kutusunu yaka ve kol uçlarından çıkarır, kutudaki köşeleri işaretler', () => {
    const halka = (x: number, y: number, n: number, r = 0.03) =>
      Array.from({ length: n }, (_, i) => [x + r * Math.cos(i), y + r * Math.sin(i), 0] as [number, number, number])
    const donguler = [
      halka(0, 0.7, 64, 0.15), // etek
      halka(0, 1.1, 64, 0.08), // yaka
      halka(0.12, 1.05, 32), halka(-0.12, 1.05, 32), // kolların iç ucu
      halka(0.25, 0.95, 32), halka(-0.25, 0.95, 32), // manşetler
    ]
    const k = omuzKutusu(donguler)!
    expect(k.yAlt).toBeCloseTo(1.0)
    expect(k.yUst).toBeCloseTo(1.21)
    expect(k.xIc).toBeCloseTo(0.09)
    expect(k.xDis).toBeCloseTo(0.22)
    const ortu = omuzuIsaretle(new Float32Array(3), [0.15, 1.1, 0, 0, 1.1, 0, 0.3, 1.0, 0], k)
    expect(Array.from(ortu)).toEqual([2, 0, 0]) // omuz evet; boyun ve kolun manşet dışı hayır
  })
})
