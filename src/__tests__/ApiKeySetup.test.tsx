import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ApiKeySetup from '@/components/ApiKeySetup';

describe('ApiKeySetup', () => {
  it('links to the privacy page where the AI company is chosen', () => {
    render(<ApiKeySetup onKeySet={() => {}} />);
    const link = screen.getByRole('link', { name: 'Read the privacy page' });
    expect(link).toHaveAttribute('href', '/privacy');
    expect(link.closest('p')).toHaveTextContent(/only ever sent to the AI company you choose/);
  });
});
