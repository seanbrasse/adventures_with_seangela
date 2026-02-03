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
        speed: 1,
        startValue: 'max',
        destroy: 'min',
      },
    },
    size: {
      value: 2,
      animation: {
        enable: true,
        speed: 2,
        startValue: 'max',
        destroy: 'min',
        minimumValue: 0.1,
      },
    },
    shadow: {
      enable: true,
      color: '#aaddff',
      blur: 8,
    },
    move: {
      enable: true,
      speed: 15,
      direction: 'left',
      straight: true,
      outModes: {
        default: 'destroy',
      },
    },
    life: {
      duration: {
        value: 1.5,
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
        quantity: 1,
        delay: 0.015, // Very rapid emission for continuous tail
      },
      size: {
        width: 0,
        height: 0,
      },
      life: {
        duration: 0.8, // Emitter only active briefly
        count: 1,
        delay: delayRange.min,
        wait: true,
      },
      startCount: 0,
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
