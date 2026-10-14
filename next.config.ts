import type { NextConfig } from 'next';
import { encodeFreeKey } from './src/lib/free-key';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_FREE_KEY_ENC: encodeFreeKey(process.env.GEMINI_FREE_API_KEY || ''),
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
