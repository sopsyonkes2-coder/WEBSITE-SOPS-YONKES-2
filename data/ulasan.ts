export type ReviewItem = {
  name: string;
  role: string;
  quote: string;
};

export const defaultReviews: ReviewItem[] = [
  {
    name: 'Kapten Rian',
    role: 'Anggota Staf',
    quote: 'Website ini membantu saya memantau operasi dan anggaran dengan cepat.',
  },
  {
    name: 'Sersan Maya',
    role: 'Personel Lapangan',
    quote: 'Informasinya jelas, tampilannya modern, dan aksesnya lancar.',
  },
  {
    name: 'Letda Dika',
    role: 'Perencana',
    quote: 'Dashboard anggaran sangat berguna untuk perencanaan kerja harian.',
  },
];
