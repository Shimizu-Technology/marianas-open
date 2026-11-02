import type { ReactNode } from 'react';
export function SectionHeading({ title, description, className = '' }: { title: ReactNode; description?: ReactNode; className?: string }) {
  return <div className={`ui-section-heading ${className}`}><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}
