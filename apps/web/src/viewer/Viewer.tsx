import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'

// Avatar GLB'si gelene kadar kullanılan basit manken (ölçüler metre, +Y yukarı)
function YerTutucuManken() {
  const ten = '#d6b8a0'
  return (
    <group>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.11, 32, 32]} />
        <meshStandardMaterial color={ten} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <capsuleGeometry args={[0.17, 0.45, 8, 16]} />
        <meshStandardMaterial color={ten} />
      </mesh>
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]}>
          <capsuleGeometry args={[0.07, 0.75, 8, 16]} />
          <meshStandardMaterial color={ten} />
        </mesh>
      ))}
    </group>
  )
}

export default function Viewer() {
  return (
    <Canvas camera={{ position: [0, 1.1, 3], fov: 40 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 4, 3]} intensity={1.2} />
      
      <YerTutucuManken />
      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={3} blur={2} />
      {/* 360° döndürme: sadece yatayda dön, kamera vücudun ortasına baksın */}
      <OrbitControls
        target={[0, 0.9, 0]}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
        minDistance={1.5}
        maxDistance={5}
      />
    </Canvas>
  )
}