import { useEffect, useState, useCallback } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { loadEmittersPlugin } from '@tsparticles/plugin-emitters';
import styled from 'styled-components';
import type { Container, ISourceOptions } from '@tsparticles/engine';

// Single container for all comets
const ParticlesContainer = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 100;
`;

const particlesConfig: ISourceOptions = {
  fullScreen: false,
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
      value: 4,
    },
    move: {
      enable: true,
      speed: 15,
      direction: 'right',
      straight: true,
      outModes: {
        default: 'destroy',
      },
    },
  },
  emitters: {
    direction: 'right',
    position: {
      x: 0,
      y: 50,
    },
    rate: {
      quantity: 1,
      delay: 1,
    },
    size: {
      width: 0,
      height: 50,
    },
  },
};

export default function SpaceAnimations() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
      await loadEmittersPlugin(engine);
    }).then(() => {
      setInit(true);
      console.log('tsParticles initialized successfully');
    }).catch((err) => {
      console.error('tsParticles init error:', err);
    });
  }, []);

  const particlesLoaded = useCallback(async (container?: Container) => {
    console.log('Particles container loaded:', container);
  }, []);

  if (!init) {
    console.log('Waiting for init...');
    return null;
  }

  return (
    <ParticlesContainer>
      <Particles
        id="comet-particles"
        options={particlesConfig}
        particlesLoaded={particlesLoaded}
      />
    </ParticlesContainer>
  );
}
