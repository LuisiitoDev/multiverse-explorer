import { OrbitControls, Stars } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { BackSide, SRGBColorSpace, TextureLoader } from 'three'
import type { Texture } from 'three'
import type { Location } from '../types/location'
import { latLonToVector3, locationToGlobePoint } from '../utils/globeLayout'

export const EARTH_TEXTURE_URL = '/textures/earth-blue-marble.jpg'

type MultiverseGlobeProps = Readonly<{
  locations: Location[]
  activeLocationId: number | null
  onSelectLocation: (location: Location) => void
}>

/** Loads the texture without suspending; a missing file keeps the fallback material. */
function useEarthTexture(): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null)

  useEffect(() => {
    let cancelled = false
    let loaded: Texture | null = null

    new TextureLoader().load(
      EARTH_TEXTURE_URL,
      (value) => {
        value.colorSpace = SRGBColorSpace
        loaded = value

        if (cancelled) {
          value.dispose()
          return
        }

        setTexture(value)
      },
      undefined,
      () => undefined,
    )

    return () => {
      cancelled = true
      loaded?.dispose()
    }
  }, [])

  return texture
}

function Earth() {
  const texture = useEarthTexture()

  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      {texture ? (
        <meshStandardMaterial map={texture} />
      ) : (
        <meshStandardMaterial color="#1d4f91" roughness={0.9} />
      )}
    </mesh>
  )
}

function Atmosphere() {
  return (
    <mesh scale={1.08}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshBasicMaterial color="#5aa9ff" transparent opacity={0.18} side={BackSide} />
    </mesh>
  )
}

type MarkerProps = Readonly<{
  location: Location
  active: boolean
  onSelect: (location: Location) => void
}>

function Marker({ location, active, onSelect }: MarkerProps) {
  const position = useMemo(() => {
    const { lat, lon } = locationToGlobePoint(location.id)
    return latLonToVector3(lat, lon, 1.02)
  }, [location.id])

  return (
    <mesh
      position={position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(location)
      }}
    >
      <sphereGeometry args={[active ? 0.032 : 0.022, 16, 16]} />
      <meshBasicMaterial color={active ? '#9cff38' : '#ffb347'} />
    </mesh>
  )
}

function prefersReducedMotion(): boolean {
  return (
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function MultiverseGlobe({ locations, activeLocationId, onSelectLocation }: MultiverseGlobeProps) {
  const reducedMotion = useMemo(() => prefersReducedMotion(), [])

  return (
    <div className="multiverse-globe" role="group" aria-label="3D multiverse globe">
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }} style={{ touchAction: 'none' }}>
        <color attach="background" args={['#02040a']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 3, 5]} intensity={1.6} />
        <Stars radius={50} depth={30} count={2000} factor={3} fade />
        <Earth />
        <Atmosphere />
        {locations.map((location) => (
          <Marker
            key={location.id}
            location={location}
            active={location.id === activeLocationId}
            onSelect={onSelectLocation}
          />
        ))}
        <OrbitControls
          enablePan={false}
          enableDamping
          minDistance={1.6}
          maxDistance={6}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI - 0.2}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.4}
        />
      </Canvas>
      <ul className="multiverse-globe__list">
        {locations.map((location) => (
          <li key={location.id}>
            <button
              type="button"
              className="multiverse-globe__item"
              aria-pressed={location.id === activeLocationId}
              onClick={() => onSelectLocation(location)}
            >
              {location.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MultiverseGlobe
