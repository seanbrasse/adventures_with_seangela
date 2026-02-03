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
      value: { min: 0.7, max: 1 },
    },
    size: {
      value: { min: 1, max: 2 },
    },
    shadow: {
      enable: true,
      color: '#aaccff',
      blur: 12,
    },
    move: {
      enable: true,
      speed: 8,
      direction: 'left',
      straight: true,
      outModes: {
        default: 'destroy',
      },
    },
    life: {
      duration: {
        value: 12,
      },
      count: 1,
    },
  },
  emitters: [
    {
      direction: 'left',
      position: {
        x: 100,
        y: { min: 5, max: 95 },
      },
      rate: {
        quantity: 1,
        delay: { min: 20, max: 35 },
      },
      size: {
        width: 0,
        height: 0,
      },
    },
  ],
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
