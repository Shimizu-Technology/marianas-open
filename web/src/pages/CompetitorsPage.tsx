import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';

export default function CompetitorsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#0a0a0b] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <Users className="w-16 h-16 text-[#D4A843] mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white font-['Outfit'] mb-4">
            {t('nav.competitors', 'Competitors')}
          </h1>
          <p className="text-gray-400 text-lg">
            Coming soon — competitor profiles and rankings.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
