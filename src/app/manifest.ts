import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LuchoAI — Your Personal Football Coach',
    short_name: 'LuchoAI',
    description: 'AI-augmented coaching for young football players.',
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: 'standalone',
    background_color: '#1a7f3c',
    theme_color: '#1a7f3c',
    icons: [
      { src: `${BASE_PATH}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: `${BASE_PATH}/icon-maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
