'use client';

import React from 'react';

interface IOSInstallGuideModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Legacy modal wrapper retired in favor of the automatic, non-modal
 * browser-specific IOSSmartInstallPointer mounted in RootLayout.
 */
export const IOSInstallGuideModal: React.FC<IOSInstallGuideModalProps> = () => {
  return null;
};
