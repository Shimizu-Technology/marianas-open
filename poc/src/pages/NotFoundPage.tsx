import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-[10rem] font-heading font-bold leading-none bg-gradient-to-b from-gold to-gold/40 bg-clip-text text-transparent"
      >
        404
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-xl text-text-secondary mt-4 mb-8"
      >
        {t('notFound.message')}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-navy-900 font-semibold rounded-lg hover:bg-gold/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('notFound.backHome')}
        </Link>
      </motion.div>
    </div>
  );
}
