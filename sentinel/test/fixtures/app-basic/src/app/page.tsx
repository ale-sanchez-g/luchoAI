import type { Meta } from 'web-framework';
import Header from '@/components/Header';

export const meta: Meta = { title: 'Home' };

export default function Page() {
  return <Header />;
}
