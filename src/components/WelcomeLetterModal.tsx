import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, Heart } from 'lucide-react';

interface WelcomeLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName?: string;
  message?: string;
}

// Animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const heartFloat = keyframes`
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.1); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled Components
const Overlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  visibility: ${({ $visible }) => $visible ? 'visible' : 'hidden'};
  transition: opacity 0.4s ease, visibility 0.4s ease;
  animation: ${({ $visible }) => $visible ? fadeIn : 'none'} 0.4s ease;
`;

const EnvelopeContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
  perspective: 1000px;
`;

const Envelope = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 70%;
  background: linear-gradient(145deg, #2d2d4a 0%, #1a1a2e 100%);
  border-radius: 0.5rem;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  overflow: visible;
`;

const EnvelopeFlap = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(145deg, #3d3d5c 0%, #2d2d4a 100%);
  border-radius: 0.5rem 0.5rem 0 0;
  transform-origin: top center;
  transform: ${({ $isOpen }) => $isOpen ? 'rotateX(180deg)' : 'rotateX(0deg)'};
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: ${({ $isOpen }) => $isOpen ? 0 : 2};

  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 50% solid transparent;
    border-right: 50% solid transparent;
    border-top: 60px solid #2d2d4a;
  }
`;

const EnvelopeFlapInner = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(145deg, #ec4899 0%, #db2777 100%);
  border-radius: 0.5rem 0.5rem 0 0;
  transform: rotateX(180deg);
  backface-visibility: hidden;
`;

const HeartSeal = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  opacity: ${({ $isOpen }) => $isOpen ? 0 : 1};
  transition: opacity 0.3s ease;

  svg {
    width: 3rem;
    height: 3rem;
    color: #ec4899;
    filter: drop-shadow(0 4px 12px rgba(236, 72, 153, 0.4));
    animation: ${heartFloat} 2s ease-in-out infinite;
  }
`;

const Card = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  top: 5%;
  left: 5%;
  right: 5%;
  bottom: 5%;
  background: linear-gradient(180deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%);
  border-radius: 0.75rem;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transform: ${({ $isVisible }) => $isVisible ? 'translateY(-30%)' : 'translateY(0)'};
  opacity: ${({ $isVisible }) => $isVisible ? 1 : 0};
  transition: transform 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s, opacity 0.6s ease 0.5s;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 1;

  @media (max-width: 640px) {
    padding: 1.5rem 1rem;
  }
`;

const CardHeartDecor = styled.div`
  margin-bottom: 1rem;

  svg {
    width: 2.5rem;
    height: 2.5rem;
    color: #ec4899;
  }
`;

const CardGreeting = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #831843;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;

  @media (max-width: 640px) {
    font-size: 1.25rem;
  }
`;

const CardRecipient = styled.p`
  font-size: 1.125rem;
  color: #9d174d;
  margin-bottom: 1.5rem;
  font-weight: 500;

  @media (max-width: 640px) {
    font-size: 1rem;
    margin-bottom: 1rem;
  }
`;

const CardMessage = styled.p`
  font-size: 1rem;
  color: #6b7280;
  line-height: 1.7;
  max-width: 280px;

  @media (max-width: 640px) {
    font-size: 0.875rem;
    line-height: 1.6;
  }
`;

const CardSignature = styled.p`
  margin-top: 1.5rem;
  font-size: 0.875rem;
  color: #9d174d;
  font-style: italic;

  @media (max-width: 640px) {
    margin-top: 1rem;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: -3rem;
  right: 0;
  padding: 0.75rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 1.5rem;
    height: 1.5rem;
    color: rgba(255, 255, 255, 0.8);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
`;

const ContinueHint = styled.p<{ $visible: boolean }>`
  position: absolute;
  bottom: -2.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: opacity 0.5s ease 1.5s;
`;

export default function WelcomeLetterModal({
  isOpen,
  onClose,
  recipientName = 'Dear Traveler',
  message = 'Welcome to your journey! Every adventure begins with a single step. May your travels be filled with wonder, joy, and unforgettable memories.',
}: WelcomeLetterModalProps) {
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Open envelope after a short delay
      const timer = setTimeout(() => {
        setIsEnvelopeOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setIsEnvelopeOpen(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsEnvelopeOpen(false);
    setTimeout(onClose, 400);
  };

  if (!isOpen) return null;

  return (
    <Overlay $visible={isOpen} onClick={handleClose}>
      <EnvelopeContainer onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={handleClose} aria-label="Close">
          <X />
        </CloseButton>

        <Envelope>
          <EnvelopeFlap $isOpen={isEnvelopeOpen}>
            <EnvelopeFlapInner />
          </EnvelopeFlap>

          <HeartSeal $isOpen={isEnvelopeOpen}>
            <Heart fill="#ec4899" />
          </HeartSeal>

          <Card $isVisible={isEnvelopeOpen}>
            <CardHeartDecor>
              <Heart fill="#ec4899" />
            </CardHeartDecor>
            <CardGreeting>Happy Valentine's Day!</CardGreeting>
            <CardRecipient>{recipientName}</CardRecipient>
            <CardMessage>{message}</CardMessage>
            <CardSignature>With love, always</CardSignature>
          </Card>
        </Envelope>

        <ContinueHint $visible={isEnvelopeOpen}>
          Tap anywhere to continue
        </ContinueHint>
      </EnvelopeContainer>
    </Overlay>
  );
}
