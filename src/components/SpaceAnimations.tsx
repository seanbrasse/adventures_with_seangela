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

const createParticlesConfig = (yRange: { min: number; max: number }, delayRange: { min: number; max: number }): ISourceOptions => ({
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
        speed: 0.3,
        startValue: 'max',
        destroy: 'min',
      },
    },
    size: {
      value: { min: 1, max: 2 },
    },
    shadow: {
      enable: true,
      color: '#aaccff',
      blur: 15,
    },
    move: {
      enable: true,
      speed: 10,
      direction: 'left',
      straight: true,
      outModes: {
        default: 'destroy',
      },
    },
    life: {
      duration: {
        value: 10,
      },
      count: 1,
    },
  },
  emitters: [
    {
      direction: 'left',
      position: {
        x: 100,
        y: yRange,
      },
      rate: {
        quantity: 8, // Emit multiple particles to create trail
        delay: delayRange,
      },
      size: {
        width: 0,
        height: 0,
      },
      particles: {
        size: {
          value: { min: 0.5, max: 2 },
        },
        opacity: {
          value: { min: 0.3, max: 1 },
        },
        move: {
          speed: { min: 8, max: 12 },
        },
      },
    },
  ],
  detectRetina: true,
});

// Config for front comets
const frontConfig = createParticlesConfig(
  { min: 5, max: 45 },
  { min: 25, max: 40 }
);

// Config for back comets (different height range)
const backConfig = createParticlesConfig(
  { min: 55, max: 95 },
  { min: 30, max: 50 }
);

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
