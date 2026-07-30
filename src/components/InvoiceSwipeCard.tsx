'use client';

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Trash, ShareNetwork } from '@phosphor-icons/react';
import styles from './InvoiceSwipeCard.module.css';

interface InvoiceSwipeCardProps {
  number: string;
  clientName: string;
  issueDate: string;
  status: string;
  statusClassName: string;
  amountLabel: string;
  onDelete: () => void;
  // When true (read-only/mobile-view-only mode), the row renders as a
  // plain static card — no drag, no reveal, no delete action.
  disableSwipe?: boolean;
  // Share is a persistent tap target (top-right of the card), not part of
  // the swipe-to-reveal gesture — sharing isn't a destructive action, so it
  // doesn't need the same "reveal then confirm" friction as delete, and
  // it's available even when disableSwipe/read-only hides delete.
  onShare?: () => void;
  isSharing?: boolean;
}

// Mobile-only "iOS Mail" style swipe-to-delete row. Desktop keeps the data
// table (tables don't reflow into cards nicely and mouse users already have
// a dedicated delete icon button); this is the touch-first equivalent for
// phone-sized viewports, shown/hidden purely via CSS media query so both
// versions can co-exist without duplicating data-fetching logic.
const DELETE_THRESHOLD = -72;

export default function InvoiceSwipeCard({
  number,
  clientName,
  issueDate,
  status,
  statusClassName,
  amountLabel,
  onDelete,
  disableSwipe = false,
  onShare,
  isSharing = false,
}: InvoiceSwipeCardProps) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [DELETE_THRESHOLD, 0], [1, 0]);
  const [revealed, setRevealed] = useState(false);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < DELETE_THRESHOLD) {
      // Snap fully open rather than auto-deleting on release — a full
      // swipe-to-confirm is too easy to trigger by accident on a scrolling
      // list. Revealing the delete action and requiring a tap to confirm
      // matches how iOS Mail / most native list patterns actually work.
      animate(x, DELETE_THRESHOLD, { type: 'spring', stiffness: 500, damping: 40 });
      setRevealed(true);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
      setRevealed(false);
    }
  };

  return (
    <div className={styles.swipeRow}>
      {!disableSwipe && (
        <motion.button
          type="button"
          className={styles.deleteAction}
          style={{ opacity: deleteOpacity }}
          onClick={() => {
            animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
            setRevealed(false);
            onDelete();
          }}
          aria-label={`Delete invoice ${number}`}
        >
          <Trash size={20} weight="bold" />
          <span>Delete</span>
        </motion.button>
      )}

      <motion.div
        className={styles.card}
        style={{ x }}
        drag={disableSwipe ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: DELETE_THRESHOLD, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        onDragEnd={disableSwipe ? undefined : handleDragEnd}
        onClick={() => {
          // Tapping a revealed card closes it, same as tapping outside a
          // revealed row in iOS Mail — there's no per-invoice detail view
          // to open yet, so a tap when not revealed is simply a no-op.
          if (revealed) {
            animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
            setRevealed(false);
          }
        }}
      >
        <div className={styles.cardTop}>
          <span className={`${styles.number} mono-text`}>{number}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={statusClassName}>{status}</span>
            {onShare && (
              <button
                type="button"
                aria-label={`Share invoice ${number}`}
                disabled={isSharing}
                aria-busy={isSharing}
                onClick={(e) => { e.stopPropagation(); onShare(); }}
                style={{ background: 'none', border: 'none', padding: '4px', display: 'flex', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                <ShareNetwork size={16} />
              </button>
            )}
          </div>
        </div>
        <div className={styles.clientName}>{clientName}</div>
        <div className={styles.cardBottom}>
          <span className={styles.date}>{issueDate}</span>
          <span className={`${styles.amount} mono-text`}>{amountLabel}</span>
        </div>
      </motion.div>
    </div>
  );
}
