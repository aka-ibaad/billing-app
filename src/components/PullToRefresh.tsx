'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowClockwise } from '@phosphor-icons/react';
import styles from './PullToRefresh.module.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 64;
const MAX_PULL = 96;

// The page scrolls on the document (main-content has no overflow of its
// own, see globals.css), so this tracks window.scrollY rather than a
// nested scroll container. Only touch events are used — touchstart never
// fires for mouse input, so this is naturally a no-op on desktop without
// needing a viewport-width check.
export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    tracking.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!tracking.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    if (window.scrollY > 0) {
      // User started at the top but the page has scrolled since (e.g. a
      // bounce) — bail out rather than fighting native scroll.
      tracking.current = false;
      setPull(0);
      return;
    }
    // Resistance curve so it doesn't feel like a 1:1 drag past the
    // threshold — matches the "gets harder to pull" feel of native pull-to-
    // refresh instead of a linear drag.
    const resisted = Math.min(MAX_PULL, delta * 0.45);
    setPull(resisted);
  };

  const handleTouchEnd = async () => {
    if (!tracking.current) return;
    tracking.current = false;
    startY.current = null;

    if (pull >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPull(PULL_THRESHOLD);
      try {
        await onRefresh();
      } finally {
        // Minimum visible duration so the spinner doesn't just flash for
        // an instant on a refresh that resolves synchronously.
        setTimeout(() => {
          setRefreshing(false);
          setPull(0);
        }, 350);
      }
    } else {
      setPull(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.indicatorWrap} style={{ height: pull }}>
        <motion.div
          className={styles.indicator}
          animate={{
            opacity: pull > 8 ? 1 : 0,
            scale: refreshing ? 1 : Math.min(1, pull / PULL_THRESHOLD),
            rotate: refreshing ? 360 : pull * 3,
          }}
          transition={refreshing ? { repeat: Infinity, duration: 0.7, ease: 'linear' } : { duration: 0 }}
        >
          <ArrowClockwise size={20} weight="bold" />
        </motion.div>
      </div>
      <motion.div animate={{ y: pull }} transition={{ type: pull === 0 ? 'spring' : false, stiffness: 400, damping: 40 }}>
        {children}
      </motion.div>
    </div>
  );
}
