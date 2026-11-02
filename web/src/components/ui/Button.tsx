import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost';
type Shared = { variant?: Variant; className?: string };
type Props = Shared & (ButtonHTMLAttributes<HTMLButtonElement> & { to?: never; href?: never }
  | LinkProps & { href?: never }
  | AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: never });

import { buttonClassName } from './buttonStyles';

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  const classes = buttonClassName(variant, className);
  if ('to' in props && props.to !== undefined) return <Link {...props as LinkProps} className={classes} />;
  if ('href' in props && props.href !== undefined) return <a {...props as AnchorHTMLAttributes<HTMLAnchorElement>} className={classes} />;
  return <button type="button" {...props as ButtonHTMLAttributes<HTMLButtonElement>} className={classes} />;
}
