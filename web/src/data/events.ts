export interface Match {
  id: string;
  competitor1: { name: string; country: string; academy: string };
  competitor2: { name: string; country: string; academy: string };
  weightClass: string;
  belt: string;
  event: string;
  duration: string;
  result?: string;
  thumbnail?: string;
}

export const mockMatches: Match[] = [
  {
    id: '1',
    competitor1: { name: 'Takeshi Yamamoto', country: 'JP', academy: 'Carpe Diem Tokyo' },
    competitor2: { name: 'Carlos Santos', country: 'PH', academy: 'Atos Manila' },
    weightClass: 'Feather',
    belt: 'Black',
    event: 'Marianas Open 2025',
    duration: '8:42',
    result: 'Submission (Armbar)',
  },
  {
    id: '2',
    competitor1: { name: 'Kim Seung-ho', country: 'KR', academy: 'Team MAD Seoul' },
    competitor2: { name: 'Ryo Tanaka', country: 'JP', academy: 'Tri-Force Osaka' },
    weightClass: 'Light',
    belt: 'Brown',
    event: 'Marianas Pro Korea 2025',
    duration: '6:15',
    result: 'Points (8-4)',
  },
  {
    id: '3',
    competitor1: { name: 'Marcus Chen', country: 'TW', academy: 'Checkmat Taipei' },
    competitor2: { name: 'Juan Dela Cruz', country: 'PH', academy: 'DEFTAC Manila' },
    weightClass: 'Middle',
    belt: 'Purple',
    event: 'Marianas Pro Manila 2025',
    duration: '7:30',
    result: 'Submission (Triangle)',
  },
  {
    id: '4',
    competitor1: { name: 'Figo Bonsai', country: 'GU', academy: 'Figo BJJ Guam' },
    competitor2: { name: 'Rodrigo Caporal', country: 'HK', academy: 'Atos Hong Kong' },
    weightClass: 'Medium Heavy',
    belt: 'Black',
    event: 'Marianas Open 2025',
    duration: '10:00',
    result: 'Points (6-2)',
  },
  {
    id: '5',
    competitor1: { name: 'Haruki Sato', country: 'JP', academy: 'Paraestra Tokyo' },
    competitor2: { name: 'David Wong', country: 'HK', academy: 'ICON BJJ HK' },
    weightClass: 'Rooster',
    belt: 'Black',
    event: 'Marianas Pro Nagoya 2025',
    duration: '5:48',
    result: 'Advantage',
  },
  {
    id: '6',
    competitor1: { name: 'Park Min-jun', country: 'KR', academy: 'Korea BJJ Academy' },
    competitor2: { name: 'Miguel Torres', country: 'GU', academy: 'Spike 22 Guam' },
    weightClass: 'Heavy',
    belt: 'Brown',
    event: 'Marianas Open 2025',
    duration: '9:15',
    result: 'Submission (RNC)',
  },
  {
    id: '7',
    competitor1: { name: 'Lin Wei-chen', country: 'TW', academy: 'Ground Control Taipei' },
    competitor2: { name: 'Kenji Morita', country: 'JP', academy: 'Impacto Japan' },
    weightClass: 'Light Feather',
    belt: 'Purple',
    event: 'Marianas Pro Taiwan 2025',
    duration: '6:00',
    result: 'Points (12-6)',
  },
  {
    id: '8',
    competitor1: { name: 'Rafael Mendoza', country: 'PH', academy: 'Submission Sports PH' },
    competitor2: { name: 'Yuki Nakamura', country: 'JP', academy: 'Alive Academy' },
    weightClass: 'Ultra Heavy',
    belt: 'White',
    event: 'Copa de Marianas 2025',
    duration: '4:22',
    result: 'Submission (Kimura)',
  },
  {
    id: '9',
    competitor1: { name: 'Chris Aguon', country: 'GU', academy: 'Purebred Guam' },
    competitor2: { name: 'Zhang Wei', country: 'HK', academy: 'Gracie Barra HK' },
    weightClass: 'Super Heavy',
    belt: 'Brown',
    event: 'Marianas Open 2025',
    duration: '7:45',
    result: 'Points (4-2)',
  },
  {
    id: '10',
    competitor1: { name: 'Marlon Godoy', country: 'PH', academy: 'Figo Bonsai BJJ' },
    competitor2: { name: 'Tae-young Lee', country: 'KR', academy: 'ZR Team Korea' },
    weightClass: 'Open Class',
    belt: 'Black',
    event: 'Marianas Open 2025',
    duration: '10:00',
    result: 'Submission (Heel Hook)',
  },
];

export const weightClasses = [
  'Rooster', 'Light Feather', 'Feather', 'Light', 'Middle',
  'Medium Heavy', 'Heavy', 'Super Heavy', 'Ultra Heavy', 'Open Class',
];

export const beltRanks = ['White', 'Blue', 'Purple', 'Brown', 'Black'];
