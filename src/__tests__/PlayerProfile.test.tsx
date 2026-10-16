import { render, screen, fireEvent } from '@testing-library/react';
import PlayerProfileForm from '@/components/PlayerProfile';
import type { PlayerProfile } from '@/types';

const PROFILE: PlayerProfile = {
  name: 'Sam',
  age: 12,
  position: 'forward',
  skillLevel: 'intermediate',
  goals: ['Score more goals', 'More individual play'],
  weaknesses: ['Short distance speed'],
};

describe('PlayerProfileForm', () => {
  it('removes a goal', () => {
    render(<PlayerProfileForm initialProfile={PROFILE} onSave={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove goal 1' }));
    expect(screen.queryByDisplayValue('Score more goals')).toBeNull();
    expect(screen.getByDisplayValue('More individual play')).toBeTruthy();
  });

  it('keeps one empty field when the last item is removed', () => {
    render(<PlayerProfileForm initialProfile={PROFILE} onSave={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove area 1' }));
    expect(screen.getByPlaceholderText('Area 1')).toHaveProperty('value', '');
  });

  it('uses 16px text on inputs so iPhones do not zoom in', () => {
    render(<PlayerProfileForm initialProfile={PROFILE} onSave={jest.fn()} />);
    const fields = [...screen.getAllByRole('textbox'), ...screen.getAllByRole('combobox')];
    expect(fields.length).toBeGreaterThan(5);
    for (const field of fields) {
      expect(field.className).toContain('text-base');
      expect(field.className).not.toContain('text-sm');
    }
  });

  it('opens with one empty field when the saved profile has no goals', () => {
    render(
      <PlayerProfileForm initialProfile={{ ...PROFILE, goals: [] }} onSave={jest.fn()} />,
    );
    expect(screen.getByPlaceholderText('Goal 1')).toHaveProperty('value', '');
  });

  it('stops offering more goals at the limit', () => {
    render(<PlayerProfileForm initialProfile={PROFILE} onSave={jest.fn()} />);
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByText('+ Add goal'));
    expect(screen.queryByText('+ Add goal')).toBeNull();
  });

  it('never lets a pasted line break into a goal', () => {
    render(<PlayerProfileForm initialProfile={PROFILE} onSave={jest.fn()} />);
    const goal = screen.getByPlaceholderText('Goal 1');
    fireEvent.change(goal, { target: { value: 'one\n\ntwo' } });
    expect(goal).toHaveProperty('value', 'one two');
  });
});
