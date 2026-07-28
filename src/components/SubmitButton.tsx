'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';

// For buttons inside a plain <form action={serverAction}> — reads the
// nearest parent form's pending state via useFormStatus so the button
// disables itself and shows a pending label automatically while the action
// is in flight, without every call site having to wire up its own state.
// (Forms driven by useActionState, e.g. login/signup, track pending
// themselves instead — this is for the simpler "fire an action, no return
// value" forms like Sign Out.)
type SubmitButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  pendingLabel?: React.ReactNode;
};

export default function SubmitButton({ children, pendingLabel, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? (pendingLabel ?? 'Working…') : children}
    </button>
  );
}
