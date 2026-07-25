'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SquaresFour, FileText, Users, ChartLineUp, Receipt, Gear, Sparkle, Crown, List, X, Devices } from '@phosphor-icons/react';
import styles from './Navigation.module.css';
import { useAppData } from '@/context/AppDataContext';

const navItems = [
  { id: 'dashboard', path: '/', label: 'Overview', icon: SquaresFour },
  { id: 'invoices', path: '/invoices', label: 'Invoices', icon: FileText },
  { id: 'clients', path: '/clients', label: 'Clients', icon: Users },
  { id: 'expenses', path: '/expenses', label: 'Expenses', icon: Receipt },
  // 5th item for mobile bottom bar
  { id: 'menu', path: '/settings', label: 'Menu', icon: Gear, mobileOnly: true },
  
  // Extra desktop items (hidden on mobile)
  { id: 'products', path: '/products', label: 'Products', icon: ChartLineUp, desktopOnly: true },
  { id: 'records', path: '/records', label: 'Records', icon: FileText, desktopOnly: true },
  { id: 'insights', path: '/insights', label: 'Insights', icon: Sparkle, desktopOnly: true },
  { id: 'platforms', path: '/platforms', label: 'Phone & Web', icon: Devices, desktopOnly: true },
];

// Mobile floating pill nav: only the 4 most-used destinations get a slot
// (Invoices/Clients/Expenses around a raised, always-prominent Dashboard
// center button, echoing the reference design's "home" anchor), everything
// else (Products, Records, Insights, Settings) lives one tap away behind
// the hamburger so the bar itself doesn't get crowded on a phone screen.
const mobilePrimaryItems = [
  { id: 'invoices', path: '/invoices', label: 'Invoices', icon: FileText },
  { id: 'clients', path: '/clients', label: 'Clients', icon: Users },
  { id: 'dashboard', path: '/', label: 'Dashboard', icon: SquaresFour, center: true },
  { id: 'expenses', path: '/expenses', label: 'Expenses', icon: Receipt },
];

const mobileMoreItems = [
  { id: 'products', path: '/products', label: 'Products', icon: ChartLineUp },
  { id: 'records', path: '/records', label: 'Records', icon: FileText },
  { id: 'insights', path: '/insights', label: 'Insights', icon: Sparkle },
  { id: 'platforms', path: '/platforms', label: 'Phone & Web', icon: Devices },
  { id: 'settings', path: '/settings', label: 'Settings', icon: Gear },
];

export default function Navigation() {
  const pathname = usePathname();
  const { settings } = useAppData();
  const [moreOpen, setMoreOpen] = useState(false);

  const businessName = settings.businessName || 'Business';
  const initials = businessName.substring(0, 2).toUpperCase();
  const isPro = settings.plan === 'pro';

  const isItemActive = (path: string) => pathname === path || (path !== '/' && pathname.startsWith(path));

  return (
    <>
    <nav className={styles.nav}>
      <div className={styles.navTop}>
        <div className={styles.logoSection}>
          <div className={`${styles.logoMarkWrapper} ${(settings.avatarUrl || settings.logoUrl) ? styles.logoMarkWrapperPhoto : ''}`}>
            {settings.avatarUrl ? (
              /* Personal profile picture takes priority here over the
                 business logo — this header slot reads as "who's signed
                 in", and settings.avatarUrl is the field the Settings
                 page's "Profile Picture" upload actually writes to.
                 settings.logoUrl (Branding Elements) is the business's
                 brand mark, shown on invoices, not the account avatar. */
              <img src={settings.avatarUrl} alt="Profile" className={styles.logoImage} />
            ) : settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className={styles.logoImage} />
            ) : (
              <div className={styles.logoMark}>{initials}</div>
            )}
          </div>
          <div className={styles.logoTextWrapper}>
            <span className={`${styles.logoText} fontHeading`}>{businessName}</span>
            <span className={styles.logoSubtitle}>Business Suite</span>
          </div>
          {/* Its own line rather than crammed onto the name or subtitle
              row — the sidebar just isn't wide enough for a fixed-width
              badge to share a line with either without forcing something
              else to truncate or wrap. Still reads from settings.plan
              (defaults to 'free'). */}
          <span className={`${styles.planBadge} ${styles.planBadgeHeader} ${isPro ? styles.planBadgePro : ''}`}>
            {isPro && <Crown size={10} weight="fill" />}
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>

        <ul className={styles.navList}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <li 
                key={item.id} 
                className={`${styles.navItem} ${item.mobileOnly ? styles.mobileOnly : ''} ${item.desktopOnly ? styles.desktopOnly : ''}`}
              >
                <Link 
                  href={item.path}
                  className={`${styles.navPill} ${isActive ? styles.active : ''}`}
                >
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill-bg"
                        className={styles.activePillBg}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </AnimatePresence>
                  
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill-border"
                      className={styles.activeIndicator}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}

                  <span className={styles.iconWrapper}>
                    {/* "fill" is Phosphor's fully solid variant — "duotone"
                        (used previously) only adds a faint secondary-tone
                        layer on top of the same outline, which read as
                        barely-filled or unchanged for several icons
                        (Users, FileText) even though it visibly filled
                        others, making the active state look inconsistent
                        tab to tab. */}
                    <Icon size={20} weight={isActive ? "fill" : "regular"} className={isActive ? styles.activeIcon : ''} />
                  </span>
                  <span className={styles.linkLabel}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      
      <div className={styles.navBottom}>
        {/* No avatar and no plan badge here anymore — both moved up to
            the header card (avatar was duplicated across two spots, and
            the badge fits better next to the business identity it
            describes than next to a plain "Settings" link). This is now
            just a settings shortcut, not a second identity card. */}
        <Link href="/settings" className={styles.profileSection}>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>Settings</span>
          </div>
          <div className={styles.settingsIcon}>
            <Gear size={18} weight="regular" />
          </div>
        </Link>
      </div>
    </nav>

    {/* --- MOBILE FLOATING NAV --- */}
    {/* A separate element rather than a CSS reflow of .nav above — the
        floating pill, raised center button, and icon-only (no label)
        treatment are different enough from the desktop sidebar/old
        full-width bar that fighting one shared markup tree with media
        queries stopped being worth it. .nav hides entirely below 768px
        (see Navigation.module.css) and this takes over. */}
    <nav className={styles.mobileNav}>
      {mobilePrimaryItems.map((item) => {
        const Icon = item.icon;
        const isActive = isItemActive(item.path);
        if (item.center) {
          return (
            <Link key={item.id} href={item.path} className={styles.mobileNavCenter} aria-label={item.label}>
              <Icon size={24} weight="fill" />
            </Link>
          );
        }
        return (
          <Link
            key={item.id}
            href={item.path}
            className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
            aria-label={item.label}
          >
            <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
          </Link>
        );
      })}
      <button
        type="button"
        className={`${styles.mobileNavItem} ${mobileMoreItems.some(i => isItemActive(i.path)) ? styles.mobileNavItemActive : ''}`}
        aria-label="More"
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen(true)}
      >
        <List size={20} weight={mobileMoreItems.some(i => isItemActive(i.path)) ? 'fill' : 'regular'} />
      </button>
    </nav>

    <AnimatePresence>
      {moreOpen && (
        <React.Fragment>
          <motion.div
            className={styles.moreBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMoreOpen(false)}
          />
          <motion.div
            className={styles.moreSheet}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className={styles.moreSheetHandle} />
            <div className={styles.moreSheetHeader}>
              <span className={styles.moreSheetTitle}>More</span>
              <button type="button" className={styles.moreSheetClose} aria-label="Close menu" onClick={() => setMoreOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className={styles.moreGrid}>
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item.path);
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={styles.moreGridItem}
                    onClick={() => setMoreOpen(false)}
                  >
                    <span className={`${styles.moreGridIcon} ${isActive ? styles.moreGridIconActive : ''}`}>
                      <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
                    </span>
                    <span className={styles.moreGridLabel}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
    </>
  );
}
