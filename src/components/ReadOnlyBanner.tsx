'use client';

import { LockSimple } from '@phosphor-icons/react';
import styles from './ReadOnlyBanner.module.css';

// Shown at the top of any page with create/edit/delete actions, only when
// AppDataContext.isReadOnly is true (i.e. running inside the native mobile
// shell). Mobile is view-only by design — this explains why the buttons
// below it are missing rather than leaving someone to wonder.
export default function ReadOnlyBanner({ label = 'data' }: { label?: string }) {
  return (
    <div className={styles.banner} role="status">
      <LockSimple size={16} weight="bold" />
      <span>Viewing {label} on mobile is read-only. Make changes from the desktop or web app.</span>
    </div>
  );
}
