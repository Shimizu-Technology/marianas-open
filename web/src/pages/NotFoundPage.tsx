import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return <div className="public-container flex min-h-[70vh] flex-col items-center justify-center pt-24 pb-12 text-center">
    <SEO title="Page Not Found" description="The requested Marianas Open page could not be found." noindex />
    <h1 className="font-heading text-8xl sm:text-9xl font-bold text-gold">404</h1>
    <p className="text-xl text-text-secondary mt-4 mb-8">{t('notFound.message')}</p>
    <Button to="/"><ArrowLeft size={16} aria-hidden="true" />{t('notFound.backHome')}</Button>
  </div>;
}
