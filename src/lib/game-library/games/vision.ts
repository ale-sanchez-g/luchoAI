import type { LibraryGame } from '@/types';

export const VISION_GAMES: LibraryGame[] = [
  {
    id: 'vision-shoulder-sweep',
    name: 'Shoulder Sweep',
    skill: 'vision',
    also: ['first-touch', 'passing'],
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    setup:
      'Stand 4 big steps from a wall. Place three different coloured items (cones, bibs or ' +
      'shoes) in a row on the ground behind you, about 4 big steps back.',
    howToPlay:
      'Pass at the wall. While the ball is on its way back, glance over your shoulder and ' +
      'call out the colour in the middle. Then control the ball and pass again. Mix up ' +
      'which colour you call. Try 20 passes, and count how many colours you called correctly.',
    focus: 'Look early, then look back at the ball. Scanning is a quick glance, not a stare.',
    easier: 'Call just the colour on the left.',
    harder: 'Swap the items around while you are not looking, and call the new order.',
  },
  {
    id: 'vision-colour-gates',
    name: 'Colour Gates',
    skill: 'vision',
    also: ['dribbling'],
    players: [1, 6],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Make four gates of different colours (use bibs, cones or tape) around a space about ' +
      '15 big steps wide. Each player has a ball. One person is the caller, or you call ' +
      'colours to yourself.',
    howToPlay:
      'The caller shouts a colour. Everyone dribbles to that gate and through it, then waits ' +
      'for the next call. Keep going for 2 minutes. If you are on your own, pick the next ' +
      'colour yourself and keep your head up. Swap the caller each round.',
    focus: 'Keep your head up. You can only choose the right gate if you can see them all.',
    easier: 'Call the colour before the player moves.',
    harder: 'Call the next colour before they get through the gate.',
  },
  {
    id: 'vision-number-scan',
    name: 'Number Scan',
    skill: 'vision',
    also: ['first-touch', 'passing'],
    players: [3, 3],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'The receiver stands in the middle. The two passers stand about 8 big steps away on ' +
      'either side, one with a ball. Both can hold up fingers.',
    howToPlay:
      'The passer with the ball plays to the receiver. The other passer shows a number of ' +
      'fingers (1 to 5) as the ball travels. The receiver scans, calls the number, controls ' +
      'the ball and passes to the other passer. Do 10, then rotate. A point for each correct ' +
      'number.',
    focus: 'Look away from the ball for a quick moment, then back. Know where everyone is.',
    easier: 'Show the fingers before the pass.',
    harder: 'Use two hands and add the numbers together.',
  },
  {
    id: 'vision-numbered-rondo',
    name: 'Numbered Rondo',
    skill: 'vision',
    also: ['passing', 'movement'],
    players: [5, 8],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'Mark a square about 10 big steps wide. Players on the outside each have a number. One ' +
      'or two defenders are in the middle. One ball.',
    howToPlay:
      'Before you pass, call the number of the player you will pass to, then play it to ' +
      'them. That player calls the next number. Keep the ball away from the defenders. If a ' +
      'defender touches the ball, swap with the last passer. Count how many calls and passes ' +
      'you can do in a row.',
    focus: 'Decide before you pass, not after. Look up to pick the best option.',
    easier: 'Call the number after you pass instead.',
    harder: 'Call a number two passes ahead, and keep to it.',
  },
  {
    id: 'vision-spot-the-lane',
    name: 'Spot the Lane',
    skill: 'vision',
    also: ['passing', 'movement'],
    players: [3, 4],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Make a square 12 big steps wide. Two attackers and one defender inside, one extra ' +
      'attacker waiting outside on a target gate at the far side.',
    howToPlay:
      'The attackers pass between themselves until they spot a gap in the defender’s cover, ' +
      'then play a pass to the target gate outside the square. Score a point for a clean ' +
      'pass to the target. Swap roles after every point.',
    focus: 'Scan before you receive, so you already know where the open lane is.',
    easier: 'The defender only blocks one side.',
    harder: 'Add a second defender or give the attackers only 10 seconds.',
  },
  {
    id: 'vision-decision-lights',
    name: 'Decision Lights',
    skill: 'vision',
    also: ['dribbling', 'teamwork'],
    players: [4, 12],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Mark a square 15 big steps wide. Everyone has a ball inside it. A leader stands on ' +
      'the edge holding up coloured bibs (green, yellow, red).',
    howToPlay:
      'Green: dribble as fast as you can. Yellow: slow down and look for a teammate to ' +
      'pass to. Red: stop the ball and turn to face the other way. Swap the leader every ' +
      'minute. Everyone stays involved the whole time.',
    focus: 'The leader is hard to see if your eyes are on the ball. Look up often.',
    easier: 'Hold up one colour at a time and wait.',
    harder: 'Hold up two colours at once, with a rule for each combination.',
  },
  {
    id: 'vision-find-the-free-player',
    name: 'Find the Free Player',
    skill: 'vision',
    also: ['passing'],
    players: [4, 10],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a 15 big step square. Play 4 v 2 inside it, with players in different coloured ' +
      'bibs. One ball.',
    howToPlay:
      'The team of four keeps the ball. Before each pass, the passer calls the name of the ' +
      'free player (the one no defender can reach). Pass to them only if they really are ' +
      'free. A named pass that finds the free player scores a point.',
    focus: 'Look at the defenders first, not the ball. The free player shows up in the gaps.',
    easier: 'Play 4 v 1.',
    harder: 'Play 4 v 3, with a smaller square.',
  },
  {
    id: 'vision-two-ball-awareness',
    name: 'Two Balls',
    skill: 'vision',
    also: ['passing', 'teamwork'],
    players: [4, 10],
    ages: [13, 18],
    level: 'advanced',
    minutes: 12,
    setup:
      'Mark a square 12 big steps wide. Players pass around the outside with two balls. ' +
      'One or two defenders are in the middle.',
    howToPlay:
      'Pass both balls around the square without letting a defender touch either. If a ball ' +
      'is touched, both balls stop and restart. Count how many passes you can make in a row. ' +
      'Players must keep talking (“I have it”, “Yours”) so nothing collides.',
    focus: 'Scan constantly. You always need to know where both balls are.',
    easier: 'Start with one ball for 30 seconds, then add the second.',
    harder: 'Add a third defender, or allow two touches only.',
  },
  {
    id: 'vision-gap-spotter',
    name: 'Gap Spotter',
    skill: 'vision',
    also: ['passing', 'dribbling'],
    players: [2, 4],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'One player holds a cone in each hand about 2 big steps apart, to make a gate that ' +
      'moves. The other stands 6 big steps away with a ball.',
    howToPlay:
      'The gate holder moves around slowly. The player with the ball spots the gap, waits ' +
      'until it is facing them and plays through it. A pass through the gap scores a point. ' +
      'Swap after 8 passes. With more players, rotate: holder, passer, collector.',
    focus: 'Pick the gap, then pick your moment. Do not rush the pass.',
    easier: 'The gate holder stands still.',
    harder: 'Make the gap smaller and move the gate faster.',
  },
  {
    id: 'vision-spot-three-things',
    name: 'Spot Three Things',
    skill: 'vision',
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'You do not need a ball. Watch a football game, live from the sideline with a ' +
      'grown-up or on a screen, for a few minutes. Have a notepad if you like.',
    howToPlay:
      'Pick one player and watch only them for one minute. Count three things: how often ' +
      'they look around, where they stand when they do not have the ball, and one good ' +
      'decision they make. Write them down. At your own next game, try to copy one of the ' +
      'three.',
    focus: 'The best players are busy even when the ball is far away. What are they doing?',
    easier: 'Watch for just thirty seconds.',
    harder: 'Predict the next pass before it happens and see how often you are right.',
  },
];
