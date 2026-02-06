import { useState } from 'react';
import { X, Lock, Eye, EyeOff, Heart } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  animation: ${fadeIn} 0.2s ease;
`;

const Modal = styled.div`
  background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
  border-radius: 1.5rem;
  max-width: 420px;
  width: 100%;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
  animation: ${slideUp} 0.3s ease;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.75rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const IconWrapper = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 0.875rem;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 1.5rem;
    height: 1.5rem;
    color: #f472b6;
  }
`;

const Title = styled.h2`
  font-size: 1.375rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.01em;
`;

const CloseButton = styled.button`
  padding: 0.625rem;
  border-radius: 0.625rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: rgba(255, 255, 255, 0.5);
  }
`;

const Content = styled.div`
  padding: 2rem;
`;

const Description = styled.p`
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const InputGroup = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem 3rem 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.875rem;
  color: #ffffff;
  font-size: 1rem;
  transition: all 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  &:focus {
    outline: none;
    border-color: rgba(236, 72, 153, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const TogglePasswordButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  padding: 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 0.5rem;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 1.125rem;
    height: 1.125rem;
    color: rgba(255, 255, 255, 0.4);
  }
`;

const ErrorMessage = styled.p`
  font-size: 0.875rem;
  color: #f87171;
  text-align: center;
  margin-top: -0.5rem;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 1rem;
  border-radius: 0.875rem;
  background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%);
  border: none;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.25);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 28px rgba(236, 72, 153, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const SkipButton = styled.button`
  width: 100%;
  padding: 0.875rem;
  border-radius: 0.875rem;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.05);
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.5rem 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }

  span {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.35);
  }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.25rem 2rem;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  svg {
    width: 0.875rem;
    height: 0.875rem;
    color: #f472b6;
  }

  span {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.4);
  }
`;

export default function LoginModal() {
  const { login, setShowLoginModal } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Please enter the password');
      return;
    }

    const success = login(password);
    if (!success) {
      setError('Incorrect password');
      setPassword('');
    }
  };

  const handleSkip = () => {
    setShowLoginModal(false);
  };

  return (
    <Overlay>
      <Modal>
        <Header>
          <HeaderContent>
            <IconWrapper>
              <Lock />
            </IconWrapper>
            <Title>Welcome</Title>
          </HeaderContent>
          <CloseButton onClick={handleSkip} title="Skip login">
            <X />
          </CloseButton>
        </Header>

        <Content>
          <Description>
            Sign in to add photos, edit trips, and manage our adventures together.
          </Description>

          <Form onSubmit={handleSubmit}>
            <InputGroup>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
              />
              <TogglePasswordButton
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </TogglePasswordButton>
            </InputGroup>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <SubmitButton type="submit">Sign In</SubmitButton>
          </Form>

          <Divider>
            <span>or</span>
          </Divider>

          <SkipButton onClick={handleSkip}>
            Continue as guest
          </SkipButton>
        </Content>

        <Footer>
          <Heart />
          <span>Sean & Angela's Adventures</span>
        </Footer>
      </Modal>
    </Overlay>
  );
}
