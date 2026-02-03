import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { loadEmittersPlugin } from '@tsparticles/plugin-emitters';
import styled from 'styled-components';
import type { ISourceOptions } from '@tsparticles/engine';

// Container for comets in front of the globe
const FrontContainer = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 100;
`;

// Container for comets behind the globe
const BackContainer = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
`;

const createCometConfig = (id: string, yMin: number, yMax: number, delaySeconds: number): ISourceOptions => ({
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
        speed: 0.8,
        startValue: 'max',
        destroy: 'min',
      },
    },
    size: {
      value: { min: 1, max: 3 },
      animation: {
        enable: true,
        speed: 1.5,
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
  emitters: {
    direction: 'right',
    position: {
      x: 0,
      y: { min: yMin, max: yMax },
    },
    rate: {
      quantity: 3,
      delay: delaySeconds,
    },
    size: {
      width: 0,
      height: 0,
    },
  },
});

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
    <>
      {/* Behind the globe */}
      <BackContainer>
        <Particles
          id="comet-particles-back"
          options={createCometConfig('back', 50, 90, 12)}
        />
      </BackContainer>
      {/* In front of the globe */}
      <FrontContainer>
        <Particles
          id="comet-particles-front"
          options={createCometConfig('front', 10, 50, 8)}
        />
      </FrontContainer>
    </>
  );
}
