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
  z-index: 5;
`;

// Container for comets behind the globe
const BackContainer = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
`;

const createCometConfig = (delay: number): ISourceOptions => ({
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
      blur: 10,
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
        value: 2,
      },
      count: 1,
    },
  },
  emitters: {
    direction: 'right',
    position: {
      x: 0,
      y: { min: 10, max: 90 },
    },
    rate: {
      quantity: 1,
      delay: 0.02,
    },
    size: {
      width: 0,
      height: 0,
    },
    life: {
      duration: 0.5,
      count: 0,
      delay: delay,
      wait: true,
    },
  },
  detectRetina: true,
});

// Front comets - appear every 20-30 seconds
const frontConfig = createCometConfig(25);

// Back comets - appear every 30-40 seconds
const backConfig = createCometConfig(35);

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
      <BackContainer>
        <Particles
          id="space-particles-back"
          options={backConfig}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
        />
      </BackContainer>
      <FrontContainer>
        <Particles
          id="space-particles-front"
          options={frontConfig}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
        />
      </FrontContainer>
    </>
  );
}
