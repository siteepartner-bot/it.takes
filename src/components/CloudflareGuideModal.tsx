import React from 'react';
import { GeminiActivationModal } from './GeminiActivationModal.tsx';

interface CloudflareGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudflareGuideModal: React.FC<CloudflareGuideModalProps> = (props) => {
  return <GeminiActivationModal {...props} />;
};
