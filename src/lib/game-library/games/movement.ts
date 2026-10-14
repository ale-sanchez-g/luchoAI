import type { LibraryGame } from '@/types';

export const MOVEMENT_GAMES: LibraryGame[] = [
  {
    id: 'movement-pass-and-move-wall',
    name: 'Pass and Move',
    skill: 'movement',
    also: ['passing', 'first-touch'],
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Stand 5 big steps from a wall. Place three cones in a curve in front of the wall, ' +
      '4 big steps apart.',
    howToPlay:
      'Pass the ball to the wall, then move to the next cone as the ball comes back and ' +
      'control it there. Pass again and move to the next cone. Count how many times in a ' +
      'row you can pass and move into a new spot without a mistake.',
    focus: 'After every pass, move. A moving player is easier to find.',
    easier: 'Take as many touches as you need to control the ball.',
    harder: 'Control and pass in two touches, or move before the ball comes back.',
  },
  {
    id: 'movement-check-away-check-back',
    name: 'Check Away, Check Back',
    skill: 'movement',
    also: ['first-touch'],
    players: [1, 2],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    noTwists: ['handicap'],
    setup:
      'Put a cone down as a pretend defender. A friend stands 8 big steps from the cone with a ' +
      'ball. On your own, stand 8 big steps from a wall with a ball at your feet instead.',
    howToPlay:
      'Start beside the cone. Take two steps away from the ball, then check back sharply and ' +
      'call for it. Your friend passes to you. On your own, pass at the wall first, then take ' +
      'your two steps away and check back to meet the rebound. Control it facing forward. Do 8 ' +
      'runs, then rest and swap.',
    focus: 'Fake one way, go the other. The sharper the change of direction, the more space.',
    easier: 'Take a bigger step away and a slower check back.',
    harder: 'Have the friend pass the ball on your first step back.',
  },
  {
    id: 'movement-magnet-pairs',
    name: 'Magnet Pairs',
    skill: 'movement',
    also: ['passing', 'vision'],
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'The passer stands with the ball. A cone “defender” stands 3 big steps in front of ' +
      'them. The receiver starts behind the cone, 6 big steps from the passer.',
    howToPlay:
      'The receiver moves left or right until they have a clear line to the passer, then ' +
      'calls for the ball. The passer plays it once the line is open. The receiver controls ' +
      'it, and plays it back. Do 10, then swap. Add a point for each pass that avoids the cone.',
    focus: 'Move so the passer can see you, not so the defender can.',
    easier: 'Make the cone smaller, or move it to one side.',
    harder: 'Have the passer look away until the receiver calls.',
  },
  {
    id: 'movement-support-triangle',
    name: 'Support Triangle',
    skill: 'movement',
    also: ['passing'],
    players: [3, 3],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    noTwists: ['handicap', 'roles'],
    setup:
      'One player has the ball. The other two stand about 6 big steps away, one at each side ' +
      'and a little behind, to make a triangle.',
    howToPlay:
      'The player on the ball passes to one of the supports. After passing, they move to a ' +
      'new spot to rebuild the triangle. Keep going. If the triangle is a straight line, ' +
      'stop and fix it. Count how many passes you make in 2 minutes.',
    focus: 'Make a triangle, not a line. Give the passer two easy options.',
    easier: 'Take two touches and pass slowly.',
    harder: 'Play in one or two touches, or add a cone defender in the middle.',
  },
  {
    id: 'movement-spread-the-pitch',
    name: 'Spread the Pitch',
    skill: 'movement',
    also: ['passing', 'vision'],
    players: [4, 10],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a pitch 30 big steps wide and 20 deep with three vertical zones (left, middle, ' +
      'right). One ball and one or two defenders (they only block, no tackles).',
    howToPlay:
      'The team passes the ball, trying to keep a player in each zone at all times. A pass ' +
      'from one wide zone to the other, along the ground, scores 2 points. Any other pass ' +
      'scores 1 point. Swap defenders every 3 minutes.',
    focus: 'Stretch the defenders. If you are wide, stay wide and wait for the switch.',
    easier: 'No defenders, just a moving cone.',
    harder: 'Three defenders, or only two touches.',
  },
  {
    id: 'movement-moving-rondo',
    name: 'Moving Rondo',
    skill: 'movement',
    also: ['passing', 'vision'],
    players: [6, 10],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a square about 10 big steps wide. Four to eight players are around the outside ' +
      'and two defenders in the middle. One ball.',
    howToPlay:
      'The outside players pass the ball to keep it away from the defenders. The rule: if ' +
      'you do not have the ball, you must slide along your side to give the passer a clear ' +
      'lane. If a defender touches the ball, the player who lost it swaps in.',
    focus: 'Show for the ball in a new lane every time, so there is never a blocked pass.',
    easier: 'Only one defender.',
    harder: 'Allow two touches, or add a third defender.',
  },
  {
    id: 'movement-timing-the-run',
    name: 'Timing the Run',
    skill: 'movement',
    also: ['passing', 'finishing'],
    players: [3, 4],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 12,
    noTwists: ['handicap'],
    setup:
      'Mark a line of cones 20 big steps from a small goal. The passer stands near the halfway ' +
      'line and the runner stands beside the cone line. A third player is the goalkeeper, or use ' +
      'a cone.',
    howToPlay:
      'The passer waits until they look up, then the runner starts. The passer plays a ball ' +
      'along the ground into the space ahead of the runner. The runner takes it on and ' +
      'shoots at the goal. Take 6 goes, then rotate positions.',
    focus: 'Runner: wait for the head to come up, then go. Passer: pass to where they will be.',
    easier: 'The runner starts with a head start.',
    harder: 'Add a defender who tries to follow the runner.',
  },
  {
    id: 'movement-corner-swap',
    name: 'Corner Swap',
    skill: 'movement',
    also: ['passing'],
    players: [6, 12],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    noTwists: ['handicap', 'roles', 'players'],
    setup:
      'Make a square about 12 big steps wide with a cone on each corner. Split the group into ' +
      'four teams, one at each corner. Each team has a line, and one team has the ball.',
    howToPlay:
      'Pass the ball to the corner on your right and run to join the back of that line. The ' +
      'next player passes on in the same way. How many passes can the whole group make in 3 ' +
      'minutes without stopping? Then try going the other way.',
    focus: 'Pass, then run. Look up so you know where the next ball is coming from.',
    easier: 'Walk the first round.',
    harder: 'Add a second ball going the other way.',
  },
  {
    id: 'movement-overlap-game',
    name: 'The Overlap',
    skill: 'movement',
    also: ['passing', 'finishing'],
    players: [3, 3],
    ages: [13, 18],
    level: 'advanced',
    minutes: 12,
    noTwists: ['talk'],
    setup:
      'Use half of a pitch with a small goal. One attacker dribbles up the wing, a ' +
      'teammate starts behind them, and a defender stands in front.',
    howToPlay:
      'The attacker dribbles at the defender. The teammate runs around the outside of them ' +
      '(an overlap). The attacker plays the ball into the runner’s path, or fakes it and cuts ' +
      'inside. Finish with a shot. Take 6 goes then rotate roles.',
    focus: 'Overlapper: run fast and wide, calling early. Dribbler: decide to pass or keep it.',
    easier: 'The defender stands still.',
    harder: 'The defender may close down, and you must finish within 10 seconds.',
  },
  {
    id: 'movement-free-lane',
    name: 'Find the Free Lane',
    skill: 'movement',
    also: ['vision'],
    players: [5, 12],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    noTwists: ['talk', 'handicap'],
    setup:
      'Mark a square 15 big steps wide. Put 2 defenders inside (cones if you have too few ' +
      'players) and give the rest a ball to share. Everyone else is a passer.',
    howToPlay:
      'The passers keep the ball moving between them, trying to find lanes the defenders ' +
      'cannot block. If you have no pass, move until you create one. Call “free!” when you ' +
      'have a clear lane. Count passes in a row. If a defender touches it, they swap with the ' +
      'player who made the pass.',
    focus: 'Keep moving until a lane opens, and call for the ball when it does.',
    easier: 'Use cones as the defenders.',
    harder: 'Make the square smaller, or have the defenders try for the ball.',
  },
  {
    id: 'movement-curve-the-run',
    name: 'Curve the Run',
    skill: 'movement',
    also: ['first-touch'],
    players: [1, 1],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Stand 6 big steps from a wall. Put a cone “defender” 3 big steps in front of you, off ' +
      'to one side.',
    howToPlay:
      'Pass to the wall, then curve your run around the cone so you can see the ball and the ' +
      'wall, and meet the rebound on the far side. Take your first touch forward. Do 8 runs, ' +
      '4 each way. A run that reaches the ball with it in front of you scores a point.',
    focus: 'Curve your run so your body stays open and you can see the ball.',
    easier: 'Run in a straight line first, then add the curve.',
    harder: 'Start running before the ball comes back off the wall.',
  },
  {
    id: 'movement-wall-one-two',
    name: 'Wall One-Two',
    skill: 'movement',
    also: ['passing', 'first-touch'],
    players: [1, 1],
    ages: [10, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Stand 5 big steps from a wall. Put a cone 3 big steps to one side, level with you, as ' +
      'your “defender”.',
    howToPlay:
      'Pass to the wall, which is your “teammate”, then run round the far side of the cone to ' +
      'meet the rebound. Control it and go again. Do 8 on each side. A one-two that gets past ' +
      'the cone with the ball under control is a point.',
    focus: 'Pass firmly and move at once. Time your run to arrive as the ball does.',
    easier: 'Take as many touches as you need after the rebound.',
    harder: 'Play the return first time.',
  },
  {
    id: 'movement-four-goal-game',
    name: 'Four-Goal Game',
    skill: 'movement',
    also: ['vision', 'transitions'],
    players: [6, 8],
    ages: [9, 14],
    level: 'beginner',
    minutes: 15,
    noTwists: ['players', 'roles'],
    setup:
      'Make a pitch 25 big steps long and 20 wide. Put two small goals (two cones each) on ' +
      'each end line, 6 big steps apart. Play 3 v 3 or 4 v 4.',
    howToPlay:
      'Each team attacks the two goals at one end and defends the two at the other. Score in ' +
      'either goal. With four goals there is always a free one, so look up and spot it! ' +
      'Change the teams after 5 minutes so everyone plays with everyone.',
    focus: 'Look for the open goal. When one side is crowded, switch the play.',
    easier: 'Use a bigger pitch, or add a neutral player who plays for the team with the ball.',
    harder: 'Allow two touches only, or goals only count after a forward pass.',
  },
];
