import type { LibraryGame } from '@/types';

export const DRIBBLING_GAMES: LibraryGame[] = [
  {
    id: 'dribbling-slalom-sprint',
    name: 'Slalom Sprint',
    skill: 'dribbling',
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Set up 6 cones (or shoes) in a straight line, about 2 big steps apart. Mark a start ' +
      'and a finish line.',
    howToPlay:
      'Dribble through the cones, weaving left and right, then sprint back with the ball. ' +
      'Time your run and try to beat your best time. Do 5 runs, resting between each.',
    focus: 'Keep the ball close, with small touches around each cone, and look up between them.',
    easier: 'Space the cones further apart, or use fewer of them.',
    harder: 'Move the cones closer together, or use only your weaker foot.',
  },
  {
    id: 'dribbling-phone-box',
    name: 'Phone Box',
    skill: 'dribbling',
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup: 'Mark a small square about 3 big steps wide with four cones or shoes.',
    howToPlay:
      'Stay inside the square for 30 seconds, dribbling with the ball always under control. ' +
      'Turn using the sole, inside or outside of your foot. Count how many turns you do ' +
      'without the ball leaving the square. Do 5 rounds and try to beat your best.',
    focus: 'Small touches and quick turns, with the ball always within a step of your foot.',
    easier: 'Make the square bigger, or use your favourite turn.',
    harder: 'Make the square smaller, or only use your weaker foot.',
  },
  {
    id: 'dribbling-ball-mastery-menu',
    name: 'Ball Mastery Menu',
    skill: 'dribbling',
    also: ['creativity'],
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup: 'You need a ball and a patch of space about 5 big steps across.',
    howToPlay:
      'Pick five moves from this menu: sole rolls, toe taps, inside-outside touches, pull-' +
      'backs and drag-backs. Do each move for 30 seconds, then rest. Try to do each one ' +
      'smoothly and a little faster every time you come back to it.',
    focus: 'Light, quick touches with your head up. Be smooth first, then be fast.',
    easier: 'Slow right down and use only your favourite two moves.',
    harder: 'Link two moves together in a row, or do them with your weaker foot.',
  },
  {
    id: 'dribbling-traffic-lights',
    name: 'Traffic Lights',
    skill: 'dribbling',
    players: [3, 16],
    ages: [8, 12],
    level: 'beginner',
    minutes: 10,
    noTwists: ['talk', 'handicap'],
    setup:
      'Mark a big square, about 15 big steps wide. Everyone has a ball inside it. One person ' +
      'is the “traffic light” and calls out the colours.',
    howToPlay:
      'Green means dribble fast. Yellow means slow, small touches. Red means stop the ball ' +
      'dead with the sole of your foot. Swap the traffic light every minute so everyone has a ' +
      'turn. Nobody is ever out, because everyone just keeps playing.',
    focus: 'Keep your head up so you can see the colours and the other players.',
    easier: 'Only use green and red.',
    harder: 'Add “blue” to turn around, or a rule that red must be stopped with the weaker foot.',
  },
  {
    id: 'dribbling-treasure-island',
    name: 'Treasure Island',
    skill: 'dribbling',
    players: [2, 10],
    ages: [8, 12],
    level: 'beginner',
    minutes: 12,
    setup:
      'Mark a square about 15 big steps wide. Put lots of cones or bibs in the middle as ' +
      '“treasure”. Each player has a ball and a home corner.',
    howToPlay:
      'Dribble to the middle, pick up one piece of treasure with your hand and dribble home. ' +
      'Count how much treasure you bring home in 2 minutes. Then add up the whole group and ' +
      'try to beat your total in the next round.',
    focus: 'Keep the ball close while you look up to find the treasure and avoid others.',
    easier: 'Spread out and make the square bigger.',
    harder: 'Make the square smaller, or carry the treasure only after a turn.',
  },
  {
    id: 'dribbling-copy-cat',
    name: 'Copy Cat',
    skill: 'dribbling',
    also: ['creativity'],
    players: [2, 6],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['handicap'],
    setup: 'Everyone has a ball. One player is the leader and the rest follow in a line.',
    howToPlay:
      'The leader dribbles around the space doing different moves, such as zigzags, turns and ' +
      'slow-downs. The followers copy every move. After 1 minute, the leader goes to the back ' +
      'and the next player leads.',
    focus: 'Followers watch closely and copy the footwork. Leaders try new and different moves.',
    easier: 'Leaders keep their moves simple, like walking and turning.',
    harder: 'Leaders add fast changes of speed, and followers must stay close.',
  },
  {
    id: 'dribbling-slow-race',
    name: 'Slow Race',
    skill: 'dribbling',
    players: [1, 8],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    noTwists: ['roles'],
    setup: 'Mark a start line and a finish line about 10 big steps apart.',
    howToPlay:
      'Dribble to the finish line as slowly as you can, but the ball must keep moving and ' +
      'stay under control. If you stop or lose control, shuffle back a couple of steps and ' +
      'carry on. The slowest controlled dribble wins the round. Playing alone? Time yourself.',
    focus: 'Tiny touches, with the ball right next to your feet. Control is the whole game.',
    easier: 'Shorten the course, or allow a stop to reset.',
    harder: 'Add cones to weave around, or use only your weaker foot.',
  },
  {
    id: 'dribbling-gates-galore',
    name: 'Gates Galore',
    skill: 'dribbling',
    also: ['vision'],
    players: [1, 8],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['roles'],
    setup:
      'Scatter 8 or more small gates (pairs of cones, about 2 big steps wide) around a space ' +
      '15 big steps across.',
    howToPlay:
      'Dribble through as many different gates as you can in 60 seconds. You cannot go ' +
      'through the same gate twice in a row. Count your score, rest, and go again. In a group, ' +
      'everyone plays at once and adds their scores together.',
    focus: 'Lift your head to choose the next gate before you reach the one you are in.',
    easier: 'Make the gates wider, or allow the same gate twice.',
    harder: 'Make the gates narrower, or use only your weaker foot.',
  },
  {
    id: 'dribbling-fast-and-slow',
    name: 'Fast and Slow',
    skill: 'dribbling',
    also: ['athleticism'],
    players: [1, 4],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Mark a long lane, 20 big steps long. Put cones at the start, the 8 step mark, the 12 ' +
      'step mark and the end.',
    howToPlay:
      'Dribble fast with big touches along the first stretch, then slow down with tiny ' +
      'touches in the middle zone, then burst away again to the end. Walk back and repeat 6 ' +
      'times. Time yourself and aim for smooth changes.',
    focus: 'Change speed suddenly. Big touches when there is space, small ones when it is tight.',
    easier: 'Make the middle zone longer so you have more time to slow down.',
    harder: 'Add a quick turn in the slow zone before you speed up again.',
  },
  {
    id: 'dribbling-escape-the-shadow',
    name: 'Escape the Shadow',
    skill: 'dribbling',
    also: ['taking-on'],
    players: [2, 2],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Make a lane about 6 big steps wide and 20 long. The dribbler starts at one end with ' +
      'the ball, and the shadow starts one big step behind them.',
    howToPlay:
      'The shadow jogs after the dribbler and tries to stay close, but does not tackle. The ' +
      'dribbler uses a change of speed or direction to get away from the shadow and cross the ' +
      'far line. Each clean escape scores a point. Swap after 5 goes.',
    focus: 'Slow, then burst. A sudden change of speed is harder to defend than a fast run.',
    easier: 'The shadow walks.',
    harder: 'The shadow jogs fast, and the dribbler has to cross within 6 seconds.',
  },
  {
    id: 'dribbling-turn-box',
    name: 'Turn Box',
    skill: 'dribbling',
    also: ['first-touch', 'taking-on'],
    players: [1, 1],
    ages: [12, 18],
    level: 'beginner',
    minutes: 10,
    setup: 'Make a box with four cones, 4 big steps wide. Stand in the middle with a ball.',
    howToPlay:
      'Dribble to the edge of the box, then use one turn to change direction: an inside ' +
      'hook, an outside hook, a drag-back or a sole roll. Accelerate away for two steps, then ' +
      'turn again at the next edge. Do each turn 4 times, then mix them up and choose the turn ' +
      'that suits the moment.',
    focus: 'Plant your standing foot beside the ball and turn your hips, then burst away.',
    easier: 'Slow right down and use only the turn you know best.',
    harder: 'Do it at match speed, or use only your weaker foot.',
  },
];
