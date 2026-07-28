'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';

/**
 * Wraps a server action in a client-side confirm() prompt before it submits,
 * and shows a pending state on its submit button while the action runs.
 * Destructive admin actions (suspend, reject, delete) all go through this so
 * a mis-click can't silently remove or lock out a merchant account.
 */
export function ConfirmForm({
  action,
  confirmMessage,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (pendingLabel ?? 'Working…') : children}
    </button>
  );
}
