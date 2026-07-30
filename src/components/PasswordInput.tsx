'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import styles from './PasswordInput.module.css';

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string;
  // Tighter icon/padding for dense contexts (e.g. the admin dashboard's
  // inline password-reset field), vs. the default sizing used by the
  // full-height login/signup inputs.
  compact?: boolean;
};

// Reusable show/hide toggle for any <input type="password">. Wraps the
// input rather than replacing it, so every caller keeps using its own
// className for width/border/font styling — this only adds the toggle
// button and the padding-right needed to keep text from running under it.
// The padding-right is set inline (not via a CSS module class) specifically
// to avoid depending on stylesheet import order to win the cascade against
// each caller's own `padding` shorthand — see the same reasoning already
// documented for --auth-card-width in login.module.css.
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { wrapperClassName, compact, className, style, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`${styles.wrapper} ${wrapperClassName || ''}`}>
      <input
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={className}
        style={{ paddingRight: compact ? 26 : 40, ...style }}
      />
      <button
        type="button"
        className={`${styles.toggle} ${compact ? styles.toggleCompact : ''}`}
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeSlash size={compact ? 14 : 18} /> : <Eye size={compact ? 14 : 18} />}
      </button>
    </div>
  );
});

export default PasswordInput;
