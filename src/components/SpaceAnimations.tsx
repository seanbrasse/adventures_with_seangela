import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

const Container = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 5;
  /* Radial mask to hide animations in center (behind globe effect) */
  mask-image: radial-gradient(
    ellipse 50% 55% at 50% 50%,
    transparent 0%,
    transparent 60%,
    black 100%
  );
  -webkit-mask-image: radial-gradient(
    ellipse 50% 55% at 50% 50%,
    transparent 0%,
    transparent 60%,
    black 100%
  );
`;

const Comet = styled(motion.div)<{ $size: 'small' | 'medium' | 'large' }>`
  position: absolute;
  transform-origin: right center;

  /* Comet head - bright glowing core */
  &::before {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: ${({ $size }) => ($size === 'large' ? '8px' : $size === 'medium' ? '6px' : '4px')};
    height: ${({ $size }) => ($size === 'large' ? '8px' : $size === 'medium' ? '6px' : '4px')};
    background: radial-gradient(circle, white 0%, rgba(200, 220, 255, 0.9) 40%, transparent 70%);
    border-radius: 50%;
    box-shadow:
      0 0 ${({ $size }) => ($size === 'large' ? '15px' : '10px')} ${({ $size }) => ($size === 'large' ? '8px' : '5px')} rgba(180, 200, 255, 0.8),
      0 0 ${({ $size }) => ($size === 'large' ? '30px' : '20px')} ${({ $size }) => ($size === 'large' ? '15px' : '10px')} rgba(140, 170, 255, 0.5),
      0 0 ${({ $size }) => ($size === 'large' ? '50px' : '30px')} ${({ $size }) => ($size === 'large' ? '25px' : '15px')} rgba(100, 140, 255, 0.3);
  }

  /* Comet tail - gradient streak */
  &::after {
    content: '';
    position: absolute;
    right: ${({ $size }) => ($size === 'large' ? '4px' : '3px')};
    top: 50%;
    transform: translateY(-50%);
    width: ${({ $size }) => ($size === 'large' ? '200px' : $size === 'medium' ? '150px' : '100px')};
    height: ${({ $size }) => ($size === 'large' ? '3px' : $size === 'medium' ? '2px' : '1.5px')};
    background: linear-gradient(
      to left,
      rgba(200, 220, 255, 0.9) 0%,
      rgba(160, 190, 255, 0.6) 10%,
      rgba(120, 160, 255, 0.3) 30%,
      rgba(100, 140, 255, 0.1) 60%,
      transparent 100%
    );
    border-radius: 100px;
    filter: blur(0.5px);
  }
`;

interface CometData {
  id: number;
  startX: number;
  startY: number;
  angle: number;
  size: 'small' | 'medium' | 'large';
  duration: number;
  distance: number;
}

export default function SpaceAnimations() {
  const [comets, setComets] = useState<CometData[]>([]);

  const spawnComet = useCallback(() => {
    const id = Date.now() + Math.random();
    const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'small', 'medium', 'medium', 'large'];
    const size = sizes[Math.floor(Math.random() * sizes.length)];

    // Randomize starting position - prefer top and right edges
    const edge = Math.random();
    let startX: number;
    let startY: number;

    if (edge < 0.6) {
      // Start from top edge
      startX = Math.random() * 80 + 10; // 10-90% from left
      startY = -5;
    } else {
      // Start from right edge
      startX = 105;
      startY = Math.random() * 50 + 5; // 5-55% from top
    }

    const comet: CometData = {
      id,
      startX,
      startY,
      angle: -25 - Math.random() * 35, // -25 to -60 degrees (diagonal down-left)
      size,
      duration: size === 'large' ? 4 : size === 'medium' ? 3.5 : 3,
      distance: size === 'large' ? 1200 : size === 'medium' ? 1000 : 800,
    };

    setComets(prev => [...prev, comet]);

    // Remove after animation completes
    setTimeout(() => {
      setComets(prev => prev.filter(c => c.id !== id));
    }, comet.duration * 1000 + 500);
  }, []);

  // Schedule comets - every 25-45 seconds
  useEffect(() => {
    const scheduleNext = () => {
      const delay = 25000 + Math.random() * 20000; // 25-45 seconds
      return setTimeout(() => {
        spawnComet();
        timerId = scheduleNext();
      }, delay);
    };

    // First comet after a short delay
    let timerId = setTimeout(() => {
      spawnComet();
      timerId = scheduleNext();
    }, 3000);

    return () => clearTimeout(timerId);
  }, [spawnComet]);

  return (
    <Container>
      <AnimatePresence>
        {comets.map(comet => (
          <Comet
            key={comet.id}
            $size={comet.size}
            initial={{
              left: `${comet.startX}%`,
              top: `${comet.startY}%`,
              rotate: comet.angle,
              opacity: 0,
              x: 0,
              y: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0.8, 0],
              x: -comet.distance * Math.cos(Math.abs(comet.angle) * Math.PI / 180),
              y: comet.distance * Math.sin(Math.abs(comet.angle) * Math.PI / 180),
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: comet.duration,
              ease: [0.25, 0.1, 0.25, 1],
              opacity: {
                times: [0, 0.05, 0.6, 0.85, 1],
                duration: comet.duration,
              },
            }}
          />
        ))}
      </AnimatePresence>
    </Container>
  );
}
