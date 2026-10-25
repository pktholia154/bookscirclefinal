'use client';

import React from 'react';

interface InstallSuccessModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLaunch?: () => void;
}

/**
 * Legacy post-install modal retired to eliminate unnecessary blocking modals
 * and misleading success messages. Standalone state & inline Open App controls
 * handle post-install transitions automatically.
 */
export const InstallSuccessModal: React.FC<InstallSuccessModalProps> = () => {
  return null;
};
