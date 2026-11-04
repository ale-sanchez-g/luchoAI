import '@testing-library/jest-dom';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PlayerProfileForm from '@/components/PlayerProfile';
import { getPlayerProfile } from '@/lib/storage';
import type { PlayerProfile } from '@/types';

const PROFILE: PlayerProfile = {
  name: 'Sam',
  age: 12,
  position: 'forward',
  skillLevel: 'intermediate',
  goals: ['Scoring goals', 'More individual play'],
  weaknesses: ['Short distance speed'],
};

// jsdom has no scrolling; each new set-up screen scrolls to the top.
beforeAll(() => {
  window.scrollTo = jest.fn();
});

function next(): void {
  fireEvent.click(screen.getByRole('button', { name: /^(Next|Finish)$/ }));
}

function pick(name: string | RegExp): void {
  fireEvent.click(screen.getByRole('radio', { name }));
}

function setUp(author: 'player' | 'parent', name: string, age: number): void {
  pick(author === 'player' ? /I'm the player/ : /I'm a parent or carer/);
  next();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: name } });
  pick(new RegExp(`^${age}$`));
  next();
}

describe('PlayerProfileForm set-up', () => {
  beforeEach(() => localStorage.clear());

  it('asks one question per screen, starting with who is filling it in', () => {
    render(<PlayerProfileForm initialProfile={null} onSave={jest.fn()} />);
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Who is setting up this profile?' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('does not move on until each question is answered', () => {
    render(<PlayerProfileForm initialProfile={null} onSave={jest.fn()} />);
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('Pick one to carry on.');
    pick(/I'm the player/);
    next();
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('Please add a name or a nickname.');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Sam' } });
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('Pick an age to carry on.');
  });

  it('starts an under-11 on "everywhere" and talks about places, not positions', () => {
    render(<PlayerProfileForm initialProfile={null} onSave={jest.fn()} />);
    setUp('player', 'Mia', 9);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Where do you like to play, Mia?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Everywhere! I want to try them all/ }))
      .toBeChecked();
    expect(screen.getByRole('radio', { name: /At the front/ })).toBeInTheDocument();
    expect(screen.queryByText(/Midfielder/)).toBeNull();
  });

  it('picks nothing for an 11-year-old until they choose', () => {
    render(<PlayerProfileForm initialProfile={null} onSave={jest.fn()} />);
    setUp('player', 'Sam', 11);
    screen.getAllByRole('radio').forEach((radio) => expect(radio).not.toBeChecked());
    next();
    expect(screen.getByRole('alert')).toHaveTextContent(/Choose "I don't have one yet"/);
  });

  it('lets a 12-year-old pick midfielder but say they are not sure yet', () => {
    const onSave = jest.fn();
    render(<PlayerProfileForm initialProfile={null} onSave={onSave} />);
    setUp('player', 'Sam', 12);
    pick(/Midfielder/);
    expect(screen.getByRole('radio', { name: 'Not sure yet' })).toBeChecked();
    expect(screen.getByText(/one each week is in a different spot/)).toBeInTheDocument();
    next();
    next();
    next();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'midfielder', exploring: true, setupBy: 'player' }),
    );
  });

  it('starts a 15-year-old settled, in football terms', () => {
    const onSave = jest.fn();
    render(<PlayerProfileForm initialProfile={null} onSave={onSave} />);
    setUp('player', 'Jo', 15);
    expect(screen.getByRole('heading', { level: 1, name: 'Your position' })).toBeInTheDocument();
    pick(/Defender.*Centre-back or full-back/);
    expect(screen.getByRole('radio', { name: 'Settled' })).toBeChecked();
    next();
    next();
    expect(screen.getByText('For defenders')).toBeInTheDocument();
    next();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ position: 'defender', exploring: false }),
    );
  });

  it('uses plain words and the child name for a parent, and hands over at the end', () => {
    const onSave = jest.fn();
    render(<PlayerProfileForm initialProfile={null} onSave={onSave} />);
    setUp('parent', 'Mia', 9);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Where does Mia like to play?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Good choice at 9')).toBeInTheDocument();
    expect(screen.getByText('(midfield)')).toBeInTheDocument();
    next();
    expect(
      screen.getByRole('heading', { level: 1, name: 'How much football does Mia play?' }),
    ).toBeInTheDocument();
    next();
    fireEvent.click(screen.getByRole('checkbox', { name: /Scoring goals/ }));
    next();

    const saved = {
      name: 'Mia',
      age: 9,
      position: 'all-round',
      exploring: true,
      setupBy: 'parent',
      skillLevel: 'beginner',
      goals: ['Scoring goals'],
      weaknesses: [],
    };
    expect(onSave).toHaveBeenCalledWith(saved);
    expect(getPlayerProfile()).toEqual(saved);
    expect(screen.getByRole('heading', { level: 1, name: "Mia's profile is ready" }))
      .toBeInTheDocument();
    expect(screen.getByText(/never sent anywhere/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hand over to Mia' }));
    expect(screen.getByRole('heading', { level: 1, name: "You're all set, Mia!" }))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Get my training plan/ })).toHaveAttribute(
      'href',
      '/training',
    );
  });

  it('keeps goal picks to three and still lets the player type their own', () => {
    render(<PlayerProfileForm initialProfile={null} onSave={jest.fn()} />);
    setUp('player', 'Mia', 9);
    next();
    next();
    ['Scoring goals', 'Cool tricks', 'Running faster'].forEach((goal) =>
      fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(goal) })),
    );
    expect(screen.getByText('3 of 3 picked. Tap one again to swap it.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Making saves/ })).toBeDisabled();
    const goals = screen.getByRole('heading', { name: 'What do you want to get better at?' })
      .closest('section') as HTMLElement;
    fireEvent.click(within(goals).getAllByRole('button', { name: 'Something else' })[0]);
    expect(screen.getByRole('textbox', { name: 'Your own goal 1' })).toBeInTheDocument();
  });

  it('goes back without losing answers', () => {
    render(<PlayerProfileForm initialProfile={null} onSave={jest.fn()} />);
    setUp('player', 'Mia', 9);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('textbox')).toHaveValue('Mia');
    expect(screen.getByRole('radio', { name: '9' })).toBeChecked();
  });
});

describe('PlayerProfileForm editing', () => {
  beforeEach(() => localStorage.clear());

  it('shows every question on one page with the saved answers', () => {
    render(<PlayerProfileForm initialProfile={PROFILE} onSave={jest.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Player profile' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /first name/ })).toHaveValue('Sam');
    expect(screen.getByRole('radio', { name: '12' })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Forward/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: "It's my position" })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Rising/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Scoring goals' })).toBeChecked();
    expect(screen.getByDisplayValue('More individual play')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Short distance speed')).toBeInTheDocument();
  });

  it('names the child in the title when a parent set it up', () => {
    render(
      <PlayerProfileForm initialProfile={{ ...PROFILE, setupBy: 'parent' }} onSave={jest.fn()} />,
    );
    expect(screen.getByRole('heading', { level: 1, name: "Sam's profile" })).toBeInTheDocument();
  });

  it('saves changes, keeping picked chips and typed goals', () => {
    const onSave = jest.fn();
    render(<PlayerProfileForm initialProfile={PROFILE} onSave={onSave} />);
    pick('Not sure yet');
    pick(/^Ace/);
    fireEvent.click(screen.getByRole('button', { name: 'Remove your own goal 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        position: 'forward',
        exploring: true,
        skillLevel: 'advanced',
        goals: ['Scoring goals'],
        weaknesses: ['Short distance speed'],
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Profile saved!');
  });

  it('will not save without a name', () => {
    const onSave = jest.fn();
    render(<PlayerProfileForm initialProfile={PROFILE} onSave={onSave} />);
    fireEvent.change(screen.getByRole('textbox', { name: /first name/ }), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Please add a name or a nickname.');
  });

  it('uses 16px text on inputs so iPhones do not zoom in', () => {
    render(<PlayerProfileForm initialProfile={PROFILE} onSave={jest.fn()} />);
    const fields = screen.getAllByRole('textbox');
    expect(fields.length).toBeGreaterThan(2);
    for (const field of fields) {
      expect(field.className).toContain('text-base');
      expect(field.className).not.toContain('text-sm');
    }
  });

  it('never lets a pasted line break into a goal', () => {
    render(<PlayerProfileForm initialProfile={PROFILE} onSave={jest.fn()} />);
    const goal = screen.getByDisplayValue('More individual play');
    fireEvent.change(goal, { target: { value: 'one\n\ntwo' } });
    expect(goal).toHaveValue('one two');
  });

  it('shows the friendly level names and saves the stored value', () => {
    const onSave = jest.fn();
    render(<PlayerProfileForm initialProfile={PROFILE} onSave={onSave} />);
    ['Rookie', 'Rising', 'Ace'].forEach((label) =>
      expect(screen.getByRole('radio', { name: new RegExp(`^${label}`) })).toBeInTheDocument(),
    );
    expect(screen.queryByText('Intermediate')).toBeNull();
    pick(/^Rookie/);
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ skillLevel: 'beginner' }));
  });
});
