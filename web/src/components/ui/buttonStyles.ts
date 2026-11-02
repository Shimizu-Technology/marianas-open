export function buttonClassName(variant: 'primary' | 'secondary' | 'ghost' = 'primary', className = '') {
  return `ui-button ui-button--${variant} ${className}`.trim();
}

