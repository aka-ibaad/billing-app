'use client';

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Trash } from '@phosphor-icons/react';
import styles from './InvoiceSwipeCard.module.css';

interface InvoiceSwipeCardProps {
  number: string;
  clientName: string;
  issueDate: string;
  status: string;
  statusClassName: string;
  amountLabel: string;
  onDelete: () => void;
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

      <motion.div
        className={styles.card}
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: DELETE_THRESHOLD, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        onDragEnd={handleDragEnd}
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
          <span className={statusClassName}>{status}</span>
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
