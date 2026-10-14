import type { LibraryGame } from '@/types';

export const FINISHING_GAMES: LibraryGame[] = [
  {
    id: 'finishing-corner-pockets',
    name: 'Corner Pockets',
    skill: 'finishing',
    players: [1, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['target', 'roles'],
    setup:
      'Use a goal or two cones as a goal. Mark a target zone in each lower corner with a shoe or ' +
      'a plastic bottle. Place the ball 8 big steps away.',
    howToPlay:
      'Take a shot at one corner and try to hit the zone. A hit in a corner zone is 2 points, ' +
      'and a shot on target anywhere else is 1 point. Take 10 shots, then try to beat your ' +
      'score. With a friend, take turns and add your scores together.',
    focus: 'Pick your corner first, plant your standing foot and follow through low.',
    easier: 'Move closer, and make the corner zones bigger.',
    harder: 'Move further back, or take each shot from a rolling ball.',
  },
  {
    id: 'finishing-bottle-skittles',
    name: 'Bottle Skittles',
    skill: 'finishing',
    players: [1, 4],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['target', 'roles', 'players'],
    setup:
      'Stand 5 plastic bottles or cones in a row along a wall or fence. Place the ball 8 ' +
      'big steps from them. Check that nothing breakable is behind the targets.',
    howToPlay:
      'Shoot to knock the bottles down. Each bottle is a point. Reset them and have another ' +
      'go. Take 5 shots each and add up the pair or group total. Try to beat your best score ' +
      'every time you play.',
    focus:
      'Glance at the target first, then keep your eyes on the ball and hit through the centre.',
    easier: 'Move closer, or use bigger targets.',
    harder: 'Stand further back, or call which bottle you will hit.',
  },
  {
    id: 'finishing-rebound-finisher',
    name: 'Rebound Finisher',
    skill: 'finishing',
    also: ['first-touch'],
    players: [1, 1],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    noTwists: ['target'],
    setup:
      'Face a solid wall with a target marked on it (a chalk square or a taped line). Stand ' +
      '10 big steps back. Nothing breakable should be nearby.',
    howToPlay:
      'Pass the ball at the wall. As it comes back, control it with your first touch, then ' +
      'shoot at the target. Count how many shots hit the target out of 10. Rest, then go ' +
      'again.',
    focus: 'Your first touch sets up the shot. Control it into the space you want to hit it.',
    easier: 'Stand closer and use a bigger target.',
    harder: 'Hit the target first time without controlling it.',
  },
  {
    id: 'finishing-penalty-pairs',
    name: 'Penalty Pairs',
    skill: 'finishing',
    also: ['goalkeeping'],
    players: [2, 6],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['players', 'roles'],
    setup:
      'Use a goal and a spot 8 big steps from it (or cones). One player shoots and one plays in ' +
      'goal. The others fetch balls and take the next turn.',
    howToPlay:
      'Shooters take 3 penalties each. A goal is 1 point. Each save is a point for the ' +
      'goalkeeper. Everyone plays in goal and everyone shoots. Everyone keeps their own score ' +
      'and nobody is ever out, so you can try new tricks and corners. Keep every shot on the ' +
      'ground and no harder than a firm pass. The keeper can say “softer” at any time.',
    focus: 'Pick your spot and commit. A calm run-up beats a rushed one.',
    easier: 'Move the spot closer to the goal.',
    harder: 'Shoot from a moving ball, or add a short run-up with a turn.',
  },
  {
    id: 'finishing-control-then-shoot',
    name: 'Control Then Shoot',
    skill: 'finishing',
    also: ['first-touch'],
    players: [2, 4],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Use a goal. The feeder stands 10 big steps in front of the goal and to one side. The ' +
      'shooter stands in the middle, 12 big steps out.',
    howToPlay:
      'The feeder rolls the ball to the shooter. The shooter takes one touch to set the ball ' +
      'and shoots with the second. Do 8 shots, then swap. Count how many are on target. In a ' +
      'group of 3 or 4, rotate: feeder, shooter, retriever.',
    focus: 'Your first touch should move the ball into your shooting stride.',
    easier: 'Take three touches if you need them.',
    harder: 'Shoot first time, or take the first touch away from a cone defender.',
  },
  {
    id: 'finishing-cut-back-finish',
    name: 'Cut-Back Finish',
    skill: 'finishing',
    also: ['passing', 'movement'],
    players: [3, 5],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Use a goal. Put a cone near the goal line, on each side, 6 big steps from the goal. A ' +
      'winger starts with the ball wide; the finisher starts 8 big steps out. Extra players are ' +
      'the goalkeeper and ball collectors.',
    howToPlay:
      'The winger dribbles to the cone and pulls the ball back along the ground for the ' +
      'finisher, who times their run and shoots with their feet. Take 6 turns, then swap ' +
      'jobs. Everything stays on the ground.',
    focus: 'Finisher: arrive late, not early. Winger: look up before the pull-back.',
    easier: 'The finisher starts closer to the goal.',
    harder: 'Add a defender who tries to block the pull-back.',
  },
  {
    id: 'finishing-shooting-gallery',
    name: 'Shooting Gallery',
    skill: 'finishing',
    players: [6, 16],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    noTwists: ['target', 'roles', 'players'],
    setup:
      'Make teams of 3 or 4. Each team has a line, a ball and a goal or a gate of cones to ' +
      'aim at. Mark a shooting spot about 8 big steps from each goal.',
    howToPlay:
      'One at a time, each player shoots, then fetches the ball and joins the back of the ' +
      'line. Every shot on target scores a point for the team. After 3 minutes, add up the ' +
      'team total, then try to beat it in the next round.',
    focus: 'Take your time, hit the target, then cheer for your teammates.',
    easier: 'Move the shooting spot closer.',
    harder: 'Move the spot back, or add a team challenge to score from a weaker foot.',
  },
  {
    id: 'finishing-angle-hunter',
    name: 'Angle Hunter',
    skill: 'finishing',
    also: ['vision'],
    players: [1, 3],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    noTwists: ['target', 'roles'],
    setup:
      'Use a goal. Put cones at five spots in a curve about 8 big steps from the goal: far ' +
      'left, left, middle, right and far right.',
    howToPlay:
      'Take one shot from each spot, aiming for a different part of the goal each time. ' +
      'A goal or target hit scores 1 point. Do the curve 3 times, and count your total. Then ' +
      'work out which angle is hardest for you.',
    focus:
      'From wide angles, aim for the far post and hit it firmly. In the middle, pick a corner.',
    easier: 'Start from the middle spots only.',
    harder: 'Move the curve back, or add a plastic bottle as a “goalkeeper”.',
  },
  {
    id: 'finishing-post-challenge',
    name: 'Post Challenge',
    skill: 'finishing',
    players: [1, 6],
    ages: [10, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['target', 'players', 'roles'],
    setup:
      'Use a real goal or two tall cones. Mark three spots at 8, 12 and 16 big steps from ' +
      'the goal. Check nobody is behind the goal.',
    howToPlay:
      'Try to hit a post or the crossbar with a low or driven shot, from each spot. Hitting ' +
      'the woodwork is 3 points, and a goal is 1 point. Take 3 shots from each spot and keep ' +
      'a running total. Players take turns and fetch the ball together.',
    focus:
      'Pick your spot, plant your standing foot and hit it firm and low, not as hard as you can.',
    easier: 'Start at the closest spot only.',
    harder: 'Only count shots hit with your weaker foot.',
  },
  {
    id: 'finishing-bounce-shots',
    name: 'Bounce Shots',
    skill: 'finishing',
    also: ['first-touch'],
    players: [1, 2],
    ages: [12, 18],
    level: 'advanced',
    minutes: 10,
    noTwists: ['target', 'handicap', 'roles', 'players'],
    setup:
      'Face a wall with a target square marked low on it, below your waist. Stand 8 big steps ' +
      'back and keep clear of anything breakable.',
    howToPlay:
      'Drop the ball from your hands and strike it just after it bounces, aiming at the ' +
      'target on the wall. Take 10 shots. Count how many hit the target and then try with the ' +
      'other foot.',
    focus: 'Keep your head still, eyes on the ball, and hit through the centre.',
    easier: 'Hit a stationary ball from the ground first.',
    harder: 'Move back further, or use only your weaker foot.',
  },
  {
    id: 'finishing-three-stations',
    name: 'Three Stations',
    skill: 'finishing',
    players: [1, 3],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 12,
    noTwists: ['target', 'handicap', 'roles'],
    setup:
      'Use a goal. Set three spots about 10 big steps from it: left, middle and right. Check ' +
      'nothing breakable is behind the goal.',
    howToPlay:
      'At the left spot, side-foot the ball low into the far corner. At the middle spot, ' +
      'drive it low and hard with your laces. At the right spot, curl it with the inside of ' +
      'your foot around a cone. Take 3 shots at each station and count how many hit the target. ' +
      'Rest between stations.',
    focus: 'Each shot has its own technique. Choose the one that suits the angle.',
    easier: 'Move closer and use a bigger target.',
    harder: 'Shoot from a moving ball, or add a keeper (a friend or a plastic bottle).',
  },
  {
    id: 'finishing-towel-golf',
    name: 'Towel Golf',
    skill: 'finishing',
    also: ['passing'],
    players: [1, 3],
    ages: [8, 14],
    level: 'beginner',
    minutes: 10,
    noTwists: ['target', 'roles', 'players', 'pace'],
    setup:
      'Lay a towel flat on the ground as your “green”, about 12 big steps from your start ' +
      'spot. Check nothing breakable is nearby.',
    howToPlay:
      'Kick the ball from the start spot and try to make it stop on the towel using as few ' +
      'kicks as you can. Count your kicks. Play 5 “holes”, moving the start spot each time. ' +
      'With friends, take turns and add up your total.',
    focus: 'Gentle, accurate kicks. Slow and controlled gets there quicker than a big thump.',
    easier: 'Make the green bigger, or start closer.',
    harder: 'Make the green smaller, or use only your weaker foot.',
  },
];
