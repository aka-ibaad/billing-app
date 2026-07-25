'use client';

import React from 'react';
import { Devices } from '@phosphor-icons/react';
import styles from './page.module.css';

export default function PlatformsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Devices size={64} weight="duotone" className={styles.icon} />
        <h1 className={styles.title}>Phone & Web Platforms</h1>
        <p className={styles.description}>
          This section is currently under construction. Check back soon for updates to our mobile and web platform options.
        </p>
      </div>
    </div>
  );
}
