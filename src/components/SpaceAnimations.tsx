import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

const Container = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
`;

const ShootingStarElement = styled(motion.div)`
  position: absolute;
  width: 80px;
  height: 2px;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.9), transparent);
  border-radius: 50%;
  transform-origin: right center;

  &::before {
    content: '';
    position: absolute;
    right: 0;
    top: -2px;
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 0 8px 3px rgba(255, 255, 255, 0.7);
  }
`;

const FloatingEmoji = styled(motion.div)`
  position: absolute;
  font-size: 1.5rem;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.4));
`;

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  angle: number;
}

interface FloatingObject {
  id: number;
  emoji: string;
  startY: number;
}

export default function SpaceAnimations() {
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const [floatingObjects, setFloatingObjects] = useState<FloatingObject[]>([]);

  // Spawn a shooting star
  const spawnShootingStar = useCallback(() => {
    const id = Date.now();
    const star: ShootingStar = {
      id,
      startX: Math.random() * 60 + 20, // 20-80% from left
      startY: Math.random() * 30 + 5,  // 5-35% from top
      angle: -30 - Math.random() * 30, // -30 to -60 degrees
    };
    setShootingStars(prev => [...prev, star]);

    // Remove after animation completes
    setTimeout(() => {
      setShootingStars(prev => prev.filter(s => s.id !== id));
    }, 2000);
  }, []);

  // Spawn a floating object
  const spawnFloatingObject = useCallback(() => {
    const emojis = ['🚀', '🛸', '🌟', '💫'];
    const id = Date.now();
    const obj: FloatingObject = {
      id,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      startY: Math.random() * 40 + 10, // 10-50% from top
    };
    setFloatingObjects(prev => [...prev, obj]);

    // Remove after animation completes
    setTimeout(() => {
      setFloatingObjects(prev => prev.filter(o => o.id !== id));
    }, 35000);
  }, []);

  // Schedule shooting stars - every 20-40 seconds
  useEffect(() => {
    const scheduleNext = () => {
      const delay = 20000 + Math.random() * 20000; // 20-40 seconds
      return setTimeout(() => {
        spawnShootingStar();
        timerId = scheduleNext();
      }, delay);
    };

    // Initial delay before first star
    let timerId = setTimeout(() => {
      spawnShootingStar();
      timerId = scheduleNext();
    }, 5000 + Math.random() * 10000);

    return () => clearTimeout(timerId);
  }, [spawnShootingStar]);

  // Schedule floating objects - every 45-90 seconds
  useEffect(() => {
    const scheduleNext = () => {
      const delay = 45000 + Math.random() * 45000; // 45-90 seconds
      return setTimeout(() => {
        spawnFloatingObject();
        timerId = scheduleNext();
      }, delay);
    };

    // Initial delay before first object
    let timerId = setTimeout(() => {
      spawnFloatingObject();
      timerId = scheduleNext();
    }, 15000 + Math.random() * 15000);

    return () => clearTimeout(timerId);
  }, [spawnFloatingObject]);

  return (
    <Container>
      <AnimatePresence>
        {shootingStars.map(star => (
          <ShootingStarElement
            key={star.id}
            initial={{
              left: `${star.startX}%`,
              top: `${star.startY}%`,
              opacity: 0,
              rotate: star.angle,
              x: 0,
              y: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              x: -400,
              y: 400,
            }}
            transition={{
              duration: 1.5,
              ease: 'easeIn',
              opacity: {
                times: [0, 0.1, 0.7, 1],
              },
            }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {floatingObjects.map(obj => (
          <FloatingEmoji
            key={obj.id}
            initial={{
              right: -50,
              top: `${obj.startY}%`,
              opacity: 0,
            }}
            animate={{
              right: '110%',
              top: `${obj.startY + (Math.random() * 10 - 5)}%`,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 30,
              ease: 'linear',
              opacity: {
                times: [0, 0.05, 0.95, 1],
                duration: 30,
              },
            }}
          >
            {obj.emoji}
          </FloatingEmoji>
        ))}
      </AnimatePresence>
    </Container>
  );
}
