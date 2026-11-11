'use client';

import Link from 'next/link';
import { useState, type PointerEvent } from 'react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './conversion-cta.module.css';

type SharedProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'format' | 'resource';
};
type LinkProps = SharedProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
type ButtonProps = SharedProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never; loading?: boolean };

/** Shared appearance for navigation and actions, using their native semantics. */
export function ConversionCta(props: LinkProps | ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const feedback = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.isPrimary && event.button === 0) setPressed(true);
    },
    onPointerUp: () => setPressed(false),
    onPointerCancel: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    onBlur: () => setPressed(false),
  };
  if (props.href !== undefined) {
    const { children, variant = 'primary', className = '', href, ...attributes } = props;
    const content = <>{children}<span className={styles.icon} aria-hidden="true">{variant === 'format' ? '↗' : '→'}</span></>;
    const classes = `${styles.control} ${styles[variant]} ${className}`;
    return href.startsWith('/') || href.startsWith('#')
      ? <Link href={href} {...feedback} {...attributes} data-pressed={pressed || undefined} className={classes}>{content}</Link>
      : <a href={href} {...feedback} {...attributes} data-pressed={pressed || undefined} className={classes}>{content}</a>;
  }

  const { children, variant = 'primary', className = '', loading = false, disabled, type = 'button', ...attributes } = props;
  return (
    <button {...feedback} {...attributes} data-pressed={pressed || undefined} type={type} className={`${styles.control} ${styles[variant]} ${className}`}
      disabled={disabled || loading} aria-busy={loading || undefined}>
      {children}<span className={styles.icon} aria-hidden="true">{loading ? '…' : '→'}</span>
    </button>
  );
}
