import { useState } from 'react';
import { format } from 'date-fns';
import { X, Settings, Trash2, AlertTriangle, Calendar, MapPin, FileText } from 'lucide-react';
import styled from 'styled-components';
import type { Trip } from '../types/photo';

interface TripSettingsModalProps {
  trip: Trip;
  photoCount: number;
  onClose: () => void;
  onUpdateTrip: (id: string, updates: Partial<Trip>) => void;
  onDeleteTrip: (tripId: string, deletePhotos: boolean) => void;
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const Modal = styled.div`
  background: linear-gradient(180deg, #16162a 0%, #111120 100%);
  border-radius: 1.5rem;
  max-width: 32rem;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderIcon = styled.div`
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

const HeaderTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
`;

const CloseButton = styled.button`
  padding: 0.625rem;
  border-radius: 0.625rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const Content = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);

  svg {
    width: 1rem;
    height: 1rem;
    color: rgba(255, 255, 255, 0.5);
  }
`;

const Input = styled.input`
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  color: #ffffff;
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(236, 72, 153, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const Textarea = styled.textarea`
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  color: #ffffff;
  font-size: 1rem;
  font-family: inherit;
  min-height: 100px;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(236, 72, 153, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const DateRow = styled.div`
  display: flex;
  gap: 1rem;
`;

const DateField = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const DateDisplay = styled.div`
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9375rem;
`;

const Divider = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0.5rem 0;
`;

const DangerZone = styled.div`
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 0.875rem;
  padding: 1.25rem;
`;

const DangerTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #ef4444;
  margin-bottom: 0.75rem;

  svg {
    width: 1.125rem;
    height: 1.125rem;
  }
`;

const DangerText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  margin-bottom: 1rem;
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.625rem;
  color: #ef4444;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.5);
  }

  svg {
    width: 1.125rem;
    height: 1.125rem;
  }
`;

const ConfirmDialog = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-top: 1rem;
`;

const ConfirmText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1rem;
  line-height: 1.5;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const ConfirmButton = styled.button<{ $variant?: 'danger' | 'cancel' }>`
  flex: 1;
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant }) =>
    $variant === 'danger'
      ? `
    background: #ef4444;
    border: none;
    color: #ffffff;

    &:hover {
      background: #dc2626;
    }
  `
      : `
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.8);

    &:hover {
      background: rgba(255, 255, 255, 0.12);
    }
  `}
`;

const Footer = styled.div`
  padding: 1.25rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`;

const SaveButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  border: none;
  color: #ffffff;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.25);

  &:hover {
    background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default function TripSettingsModal({
  trip,
  photoCount,
  onClose,
  onUpdateTrip,
  onDeleteTrip,
}: TripSettingsModalProps) {
  const [name, setName] = useState(trip.name);
  const [description, setDescription] = useState(trip.description || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasChanges = name !== trip.name || description !== (trip.description || '');

  const handleSave = () => {
    if (hasChanges) {
      onUpdateTrip(trip.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
    }
    onClose();
  };

  const handleDelete = (deletePhotos: boolean) => {
    onDeleteTrip(trip.id, deletePhotos);
    onClose();
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <HeaderLeft>
            <HeaderIcon>
              <Settings />
            </HeaderIcon>
            <HeaderTitle>Trip Settings</HeaderTitle>
          </HeaderLeft>
          <CloseButton onClick={onClose}>
            <X />
          </CloseButton>
        </Header>

        <Content>
          <FormGroup>
            <Label>
              <MapPin />
              Trip Name
            </Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter trip name..."
            />
          </FormGroup>

          <DateRow>
            <DateField>
              <Label>
                <Calendar />
                Start Date
              </Label>
              <DateDisplay>
                {format(trip.startDate, 'MMM d, yyyy')}
              </DateDisplay>
            </DateField>
            <DateField>
              <Label>
                <Calendar />
                End Date
              </Label>
              <DateDisplay>
                {format(trip.endDate, 'MMM d, yyyy')}
              </DateDisplay>
            </DateField>
          </DateRow>

          <FormGroup>
            <Label>
              <FileText />
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this trip..."
            />
          </FormGroup>

          <Divider />

          <DangerZone>
            <DangerTitle>
              <AlertTriangle />
              Danger Zone
            </DangerTitle>
            <DangerText>
              Delete this trip and optionally remove all {photoCount} associated photo{photoCount !== 1 ? 's' : ''}.
              This action cannot be undone.
            </DangerText>

            {!showDeleteConfirm ? (
              <DeleteButton onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 />
                Delete Trip
              </DeleteButton>
            ) : (
              <ConfirmDialog>
                <ConfirmText>
                  Are you sure? Choose whether to also delete the {photoCount} photo{photoCount !== 1 ? 's' : ''} in this trip.
                </ConfirmText>
                <ConfirmButtons>
                  <ConfirmButton onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </ConfirmButton>
                  <ConfirmButton $variant="danger" onClick={() => handleDelete(false)}>
                    Keep Photos
                  </ConfirmButton>
                  <ConfirmButton $variant="danger" onClick={() => handleDelete(true)}>
                    Delete All
                  </ConfirmButton>
                </ConfirmButtons>
              </ConfirmDialog>
            )}
          </DangerZone>
        </Content>

        <Footer>
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <SaveButton onClick={handleSave} disabled={!name.trim()}>
            Save Changes
          </SaveButton>
        </Footer>
      </Modal>
    </Overlay>
  );
}
