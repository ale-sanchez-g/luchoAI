import type { LibraryGame } from '@/types';

export const PASSING_GAMES: LibraryGame[] = [
  {
    id: 'passing-bullseye',
    name: 'Bullseye',
    skill: 'passing',
    players: [1, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['target', 'roles', 'touches'],
    setup:
      'Put a cone or a plastic bottle down as a target. Stand 5 big steps away, then 8, then 12.',
    howToPlay:
      'Pass the ball along the ground and try to hit the target. Take 5 tries from each ' +
      'distance. A hit from 5 steps is 1 point, from 8 steps is 2 and from 12 steps is 3. Add ' +
      'up your score and try to beat it next time. With a friend, add your scores together.',
    focus: 'Plant your standing foot beside the ball and follow through towards the target.',
    easier: 'Use a bigger target, like a gate made from two cones, or start closer.',
    harder: 'Move the target further away, or pass with your weaker foot.',
  },
  {
    id: 'passing-wall-rhythm',
    name: 'Wall Rhythm',
    skill: 'passing',
    also: ['first-touch'],
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    noTwists: ['call'],
    setup: 'Stand about 4 big steps from a wall with nothing breakable nearby.',
    howToPlay:
      'Pass to the wall with the inside of your right foot, control the rebound, then pass ' +
      'with the inside of your left foot. Count how many clean passes you make in a row. Then ' +
      'try new patterns: right, right, left, left, or one touch to control and one to pass.',
    focus: 'Keep a steady beat: pass, control, pass. Keep your passes firm and straight.',
    easier: 'Take as many touches as you need, and stand a little closer.',
    harder: 'Pass first time without controlling, or stand further back.',
  },
  {
    id: 'passing-gate-keepers',
    name: 'Gate Keepers',
    skill: 'passing',
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['roles', 'call'],
    setup:
      'Stand about 10 big steps from your partner. Put two cones 2 big steps apart halfway ' +
      'between you, as a gate.',
    howToPlay:
      'Pass through the gate to each other along the ground. Every pass that goes through ' +
      'scores a point. After 10 passes, make the gate a bit narrower. Play 3 rounds and add ' +
      'up your pair score.',
    focus:
      'Glance up at the gate first, then keep your eyes on the ball as you strike it. Pass firmly.',
    easier: 'Make the gate wider, or stand closer together.',
    harder: 'Make the gate narrower, or pass first time.',
  },
  {
    id: 'passing-triangle-follow',
    name: 'Triangle Follow',
    skill: 'passing',
    also: ['movement'],
    players: [3, 3],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    noTwists: ['roles', 'target', 'call'],
    setup: 'Three players stand in a triangle about 8 big steps apart, with one ball.',
    howToPlay:
      'Pass to the player on your right, then follow your pass and take their place. They ' +
      'pass on in the same way. Keep going for 2 minutes and count your passes. Then change ' +
      'direction and pass to your left.',
    focus: 'Pass, then move straight away. Keep the triangle shape as you rotate.',
    easier: 'Slow down and take two touches each.',
    harder: 'Play first time, or add a second ball.',
  },
  {
    id: 'passing-long-pass-zones',
    name: 'Long Pass Zones',
    skill: 'passing',
    players: [2, 2],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 10,
    noTwists: ['target', 'roles', 'space', 'foot', 'call'],
    setup:
      'Stand about 25 big steps from your partner. Mark a target zone, 4 big steps wide, in ' +
      'front of each of you with four cones. Your partner waits beside their zone.',
    howToPlay:
      'Hit a firm, low pass so it arrives in your partner’s zone, and keep it below head height ' +
      'the whole way. A pass that ends in the zone is 1 point. Your partner then steps in and ' +
      'controls it with one touch for 2 points. Take 10 passes each, then add your scores ' +
      'together as a pair.',
    focus: 'Lock your ankle, strike the middle of the ball with your laces and follow through low.',
    easier: 'Stand closer together, or make the zone bigger.',
    harder: 'Make the zone smaller, or pass with your weaker foot.',
  },
  {
    id: 'passing-square-dance',
    name: 'Square Dance',
    skill: 'passing',
    also: ['movement'],
    players: [4, 8],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    noTwists: ['handicap', 'players', 'target'],
    setup:
      'Mark a square about 10 big steps wide. Put one player on each corner, with one ball. If ' +
      'you have more than four players, make a second square so nobody waits.',
    howToPlay:
      'Pass along a side or across the square. After you pass, run round the outside of the ' +
      'square to the corner you passed to and take that spot, while the receiver passes on. How ' +
      'many passes can your group make in 3 minutes?',
    focus: 'Pass, then move. Make sure everyone knows where the ball is going next.',
    easier: 'Only pass along the sides, not across.',
    harder: 'Play with two touches or fewer, or add a second ball.',
  },
  {
    id: 'passing-relay-race',
    name: 'Passing Relay',
    skill: 'passing',
    players: [8, 16],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    noTwists: ['roles', 'players', 'target', 'call'],
    setup:
      'Make teams of 4. Each team makes two lines of two, facing each other about 8 big steps ' +
      'apart, with one ball.',
    howToPlay:
      'The first player in one line passes to the first player in the other line, then runs to ' +
      'the back of their own line. Keep going. A team has finished when every player has passed ' +
      '3 times. Each team tries to beat its own best time.',
    focus: 'Make every pass accurate. A slow, neat pass beats a fast, wild one.',
    easier: 'Pass once each, then run to the back of the line.',
    harder: 'Pass first time, or use the weaker foot.',
  },
  {
    id: 'passing-switch-it',
    name: 'Switch It!',
    skill: 'passing',
    also: ['movement', 'transitions'],
    players: [3, 6],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 12,
    noTwists: ['target'],
    setup:
      'Make a pitch about 30 big steps wide and 15 deep, with a target gate at each side ' +
      '(two cones, 3 big steps apart). Put a player at each gate and the others in the middle.',
    howToPlay:
      'Pass the ball from one gate to the other through the middle players, who may touch it ' +
      'only to block (no tackling). Every pass that reaches the far gate along the ground ' +
      'scores a point. Swap jobs every 2 minutes.',
    focus: 'Look for the long pass early. The best switch happens before the defenders move.',
    easier: 'The middle players just stand still, so the long pass is easy to find.',
    harder: 'Add a second middle player, or allow only two touches.',
  },
  {
    id: 'passing-through-gates',
    name: 'Through the Gates',
    skill: 'passing',
    also: ['movement', 'vision'],
    players: [2, 3],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 12,
    noTwists: ['talk', 'handicap', 'target'],
    setup:
      'Make a row of three gates about 5 big steps apart, each 2 big steps wide. The passer ' +
      'stands 8 big steps back with the ball, and a runner starts beside the first gate.',
    howToPlay:
      'The runner takes off just as the passer looks up. The passer slides the ball through the ' +
      'gate for the runner to run on to, then they do it again at the next gate. At the end of ' +
      'the row the runner dribbles the ball back to the passer. Swap jobs after one trip down ' +
      'the row.',
    focus: 'Pass to where the runner is going to be, not where they are now.',
    easier: 'The runner jogs and the passer picks the gate.',
    harder: 'Add a shadow defender, or have the runner call the gate just before the pass.',
  },
  {
    id: 'passing-pass-and-swap-rondo',
    name: 'Pass and Swap Rondo',
    skill: 'passing',
    also: ['vision', 'movement'],
    players: [5, 8],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    noTwists: ['roles', 'target'],
    setup:
      'Make a square about 8 big steps wide. Put one player in the middle and the rest around ' +
      'the outside, with one ball.',
    howToPlay:
      'The outside players pass the ball around the square. The player in the middle tries ' +
      'to touch it. Whoever made the pass that was touched swaps into the middle. Count how ' +
      'many passes your group makes in a row.',
    focus: 'Show for the ball, then pass quickly. Use your first touch to open up the next pass.',
    easier:
      'Make the square a bit bigger so you have more time and space, or add a second player ' +
      'outside.',
    harder: 'Allow two touches only, or put two players in the middle.',
  },
  {
    id: 'passing-wall-pyramid',
    name: 'Wall Pyramid',
    skill: 'passing',
    also: ['first-touch'],
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['pace', 'call'],
    setup:
      'Stand 3 big steps from a solid wall with nothing breakable nearby. You will build a ' +
      'pyramid of passes.',
    howToPlay:
      'Round 1: one pass at the wall, control it and stop. Round 2: two passes in a row. ' +
      'Round 3: three, and so on up to six, then come back down: five, four, three, two, ' +
      'one. Use the inside of your foot each time. If you lose control, just start that ' +
      'round again.',
    focus: 'Pass firmly, control softly and keep the same smooth rhythm all the way up.',
    easier: 'Stop at four passes and stand a little closer.',
    harder: 'Swap feet on every pass, or stand further back.',
  },
  {
    id: 'passing-give-and-go',
    name: 'Give and Go',
    skill: 'passing',
    also: ['movement'],
    players: [2, 3],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    noTwists: ['target', 'call'],
    setup:
      'A passer, a wall player and a cone “defender”. Put the cone 4 big steps in front of the ' +
      'passer, and the wall player 3 big steps beyond it, to one side. A third player, if you ' +
      'have one, collects loose balls and takes the next turn.',
    howToPlay:
      'The passer plays to the wall player, then sprints round the far side of the cone. The ' +
      'wall player lays the ball first time into the passer’s path, and the passer collects ' +
      'it past the cone. Do 8 goes, then swap jobs. A point for every give and go that works.',
    focus: 'Pass, then go straight away. The run is part of the pass.',
    easier: 'The wall player may take two touches.',
    harder: 'Swap the cone for a defender who walks, or play first time all the way.',
  },
];
