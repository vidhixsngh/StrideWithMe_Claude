import { useEffect, useState } from 'react'

interface Petal {
  tx: string
  ty: string
  color: string
  delay: string
  size: string
}

const petals: Petal[] = [
  { tx: '-70px', ty: '-90px', color: '#3D7A5F', delay: '0ms',   size: '10px' },
  { tx: '70px',  ty: '-90px', color: '#F59E4A', delay: '40ms',  size: '12px' },
  { tx: '95px',  ty: '10px',  color: '#7AB5A0', delay: '80ms',  size: '8px'  },
  { tx: '65px',  ty: '90px',  color: '#FFD700', delay: '60ms',  size: '10px' },
  { tx: '-65px', ty: '90px',  color: '#B8D9CC', delay: '100ms', size: '14px' },
  { tx: '-95px', ty: '10px',  color: '#F59E4A', delay: '20ms',  size: '8px'  },
  { tx: '30px',  ty: '-110px',color: '#3D7A5F', delay: '50ms',  size: '9px'  },
  { tx: '-30px', ty: '-110px',color: '#FFD700', delay: '90ms',  size: '11px' },
  { tx: '110px', ty: '-40px', color: '#7AB5A0', delay: '30ms',  size: '8px'  },
  { tx: '-110px',ty: '-40px', color: '#F59E4A', delay: '70ms',  size: '10px' },
]

interface BloomOverlayProps {
  onComplete: () => void
}

export default function BloomOverlay({ onComplete }: BloomOverlayProps) {
  const [flowerVisible, setFlowerVisible] = useState(false)

  useEffect(() => {
    // Tiny delay so DOM is ready before animating
    const t1 = setTimeout(() => setFlowerVisible(true), 50)
    // Auto-complete after bloom duration
    const t2 = setTimeout(() => onComplete(), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onComplete])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Petal dots */}
      <div style={{ position: 'relative', width: 0, height: 0 }}>
        {petals.map((petal, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: petal.size,
              height: petal.size,
              borderRadius: '50%',
              backgroundColor: petal.color,
              top: '50%',
              left: '50%',
              transform: flowerVisible
                ? `translate(calc(-50% + ${petal.tx}), calc(-50% + ${petal.ty})) scale(0)`
                : 'translate(-50%, -50%) scale(1)',
              opacity: flowerVisible ? 0 : 1,
              transition: flowerVisible
                ? `transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${petal.delay}, opacity 0.8s ease ${petal.delay}`
                : 'none',
            }}
          />
        ))}

        {/* Central flower emoji */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            fontSize: '72px',
            lineHeight: 1,
            transform: flowerVisible
              ? 'translate(-50%, -50%) scale(1) rotate(0deg)'
              : 'translate(-50%, -50%) scale(0) rotate(-20deg)',
            transition: flowerVisible
              ? 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0ms'
              : 'none',
          }}
        >
          🌸
        </div>

        {/* "Verified!" text below flower */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: '52px',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            opacity: flowerVisible ? 1 : 0,
            transition: 'opacity 0.4s ease 0.4s',
            fontFamily: 'Lora, serif',
            fontSize: '18px',
            color: '#2D5A47',
            fontWeight: 600,
          }}
        >
          Day verified. ✓
        </div>
      </div>
    </div>
  )
}
