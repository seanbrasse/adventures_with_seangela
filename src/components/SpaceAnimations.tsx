import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { loadEmittersPlugin } from '@tsparticles/plugin-emitters';
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
  background: {
    color: 'transparent',
  },
  particles: {
    number: {
      value: 0,
    },
    color: {
      value: '#ffffff',
    },
    shape: {
      type: 'circle',
    },
    opacity: {
      value: 1,
    },
    size: {
      value: 2,
    },
    move: {
      enable: true,
      speed: 25,
      direction: 'bottom-left',
      straight: true,
      outModes: {
        default: 'destroy',
      },
    },
    life: {
      duration: {
        value: 5,
      },
      count: 1,
    },
  },
  emitters: {
    direction: 'bottom-left',
    position: {
      x: 100,
      y: 20,
    },
    rate: {
      quantity: 1,
      delay: 3, // Every 3 seconds for testing
    },
    size: {
      width: 0,
      height: 30,
    },
  },
  detectRetina: true,
};

export default function SpaceAnimations() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
      await loadEmittersPlugin(engine);
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
