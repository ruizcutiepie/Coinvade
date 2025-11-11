// src/app/components/Modal.tsx
'use client';

import React from 'react';

type ModalProps = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export default function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* backdrop */}
      <div
        className="modal-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* card */}
      <div
        className={`modal-card relative mx-auto w-[92%] max-w-2xl rounded-2xl bg-[var(--surface)] p-6 sm:p-7 ${className || ''}`}
        role="dialog"
        aria-modal="true"
      >
        {/* close */}
        <button
          aria-label="Close"
          className="close-x"
          onClick={onClose}
        >
          ✕
        </button>

        {title && (
          <h2 className="mb-5 text-center text-2xl font-semibold text-white [text-shadow:_0_0_16px_var(--neon-soft)]">
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>
  );
}
