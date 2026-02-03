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

// Simple config that should definitely work
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
      value: 3,
    },
    shadow: {
      enable: true,
      color: '#ffffff',
      blur: 10,
    },
    move: {
      enable: true,
      speed: 20,
      direction: 'left',
      straight: true,
      outModes: {
        default: 'destroy',
      },
    },
  },
  emitters: {
    direction: 'left',
    position: {
      x: 100,
      y: 50,
    },
    rate: {
      quantity: 1,
      delay: 2,
    },
    size: {
      width: 0,
      height: 50,
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
      console.log('Particles engine initialized');
    });
  }, []);

  console.log('SpaceAnimations render, init:', init);

  if (!init) return null;

  return (
    <FrontContainer>
      <Particles
        id="space-particles"
        options={particlesConfig}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />
    </FrontContainer>
  );
}
