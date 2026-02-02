import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import styled from 'styled-components';
import type { ISourceOptions } from '@tsparticles/engine';

const Container = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 5;
  /* Radial mask to hide particles in center (behind globe effect) */
  mask-image: radial-gradient(
    ellipse 55% 60% at 50% 50%,
    transparent 0%,
    transparent 50%,
    black 100%
  );
  -webkit-mask-image: radial-gradient(
    ellipse 55% 60% at 50% 50%,
    transparent 0%,
    transparent 50%,
    black 100%
  );
`;

const particlesConfig: ISourceOptions = {
  fullScreen: false,
  fpsLimit: 60,
  particles: {
    number: {
      value: 0, // Start with no particles, emit them over time
    },
    color: {
      value: ['#ffffff', '#b0c4ff', '#e0e8ff'],
    },
    shape: {
      type: 'circle',
    },
    opacity: {
      value: { min: 0.6, max: 1 },
      animation: {
        enable: true,
        speed: 0.5,
        startValue: 'max',
        destroy: 'min',
      },
    },
    size: {
      value: { min: 1, max: 3 },
    },
    trail: {
      enable: true,
      length: 30,
      fill: {
        color: '#000000',
      },
    },
    move: {
      enable: true,
      speed: { min: 15, max: 25 },
      direction: 'bottom-left' as const,
      straight: true,
      outModes: {
        default: 'destroy' as const,
      },
    },
    life: {
      duration: {
        value: 4,
      },
      count: 1,
    },
    shadow: {
      enable: true,
      color: '#a0b8ff',
      blur: 10,
    },
  },
  emitters: {
    direction: 'bottom-left' as const,
    position: {
      x: 100,
      y: { min: 5, max: 50 },
    },
    rate: {
      quantity: 1,
      delay: { min: 20, max: 40 }, // Emit every 20-40 seconds
    },
    size: {
      width: 0,
      height: 50,
    },
    life: {
      duration: -1, // Infinite
      count: 0,
    },
  },
  detectRetina: true,
};

export default function SpaceAnimations() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  if (!init) return null;

  return (
    <Container>
      <Particles
        id="space-particles"
        options={particlesConfig}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />
    </Container>
  );
}
