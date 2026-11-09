import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DrillDiagram from '@/components/DrillDiagram';
import { DRILL_SETUP_IDS, DRILL_SETUPS, isDrillSetup } from '@/lib/drill-setups';

const inBox = ({ x, y }: { x: number; y: number }): boolean =>
  x >= 0 && x <= 100 && y >= 0 && y <= 56;

describe('drill setups', () => {
  it('accepts only the setups the app can draw', () => {
    expect(isDrillSetup('slalom')).toBe(true);
    expect(isDrillSetup('none')).toBe(false);
    expect(isDrillSetup('rondo')).toBe(false);
    expect(isDrillSetup(undefined)).toBe(false);
  });

  it.each(DRILL_SETUP_IDS)('%s keeps everyone and every cone inside the picture', (id) => {
    const { scene } = DRILL_SETUPS[id];
    const points = [scene.you, ...scene.cones];
    if (scene.helper) points.push(scene.helper);
    if (scene.ball) points.push(scene.ball);
    expect(points.every(inBox)).toBe(true);
  });

  it.each(DRILL_SETUP_IDS)('%s has picture words a young child knows', (id) => {
    const { alt } = DRILL_SETUPS[id];
    expect(alt).toMatch(/^Picture: /);
    expect(alt).not.toMatch(/1v1|rondo|overload|drill/i);
  });
});

describe('DrillDiagram', () => {
  it('describes the picture for screen readers and keys only the lines it draws', () => {
    render(<DrillDiagram setup="slalom" />);
    expect(screen.getByRole('img')).toHaveAccessibleName(DRILL_SETUPS.slalom.alt);
    expect(screen.getByText('Dribble with the ball')).toBeInTheDocument();
    expect(screen.queryByText('Pass or shoot')).not.toBeInTheDocument();
  });

  it('labels the helper when the drill has one', () => {
    const { container } = render(<DrillDiagram setup="passing-pair" />);
    expect(container.querySelector('svg')).toHaveTextContent('HELPER');
  });

  it('shows no key for a picture without lines', () => {
    render(<DrillDiagram setup="ball-mastery" />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
