import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { loadEmittersPlugin } from '@tsparticles/plugin-emitters';
import styled from 'styled-components';
import type { ISourceOptions } from '@tsparticles/engine';

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
      animation: {
        enable: true,
        speed: 0.6,
        startValue: 'max',
        destroy: 'min',
      },
    },
    size: {
      value: { min: 1, max: 3 },
      animation: {
        enable: true,
        speed: 1,
        startValue: 'max',
        destroy: 'min',
      },
    },
    shadow: {
      enable: true,
      color: '#aaddff',
      blur: 8,
    },
    move: {
      enable: true,
      speed: 12,
      direction: 'right',
      straight: true,
      outModes: {
        default: 'destroy',
      },
    },
    life: {
      duration: {
        value: 3,
      },
      count: 1,
    },
  },
  emitters: [
    {
      direction: 'right',
      position: {
        x: 0,
        y: { min: 10, max: 40 },
      },
      rate: {
        quantity: 3,
        delay: 8,
      },
      size: {
        width: 0,
        height: 0,
      },
    },
    {
      direction: 'right',
      position: {
        x: 0,
        y: { min: 60, max: 90 },
      },
      rate: {
        quantity: 3,
        delay: 12,
      },
      size: {
        width: 0,
        height: 0,
      },
    },
  ],
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
    <ParticlesContainer>
      <Particles
        id="comet-particles"
        options={particlesConfig}
      />
    </ParticlesContainer>
  );
}
