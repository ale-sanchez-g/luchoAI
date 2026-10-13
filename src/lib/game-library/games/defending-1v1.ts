import type { LibraryGame } from '@/types';

export const DEFENDING_1V1_GAMES: LibraryGame[] = [
  {
    id: 'defending-1v1-mirror-mirror',
    name: 'Mirror Mirror',
    skill: 'defending-1v1',
    also: ['athleticism'],
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    setup:
      'Mark two lines about 5 big steps apart. You and your partner stand facing each other, ' +
      'one on each line, on soft grass. No ball is needed.',
    howToPlay:
      'One player is the leader and moves sideways along the line. The other is the mirror ' +
      'and copies every move, staying side-on with knees bent and on their toes. After 30 ' +
      'seconds, swap. Then try again with a ball at the leader’s feet.',
    focus: 'Stay low and balanced, and shuffle your feet without crossing them.',
    easier: 'Leaders move slowly with big, clear steps.',
    harder: 'Leaders change speed and direction suddenly.',
  },
  {
    id: 'defending-1v1-jockey-lane',
    name: 'Jockey Lane',
    skill: 'defending-1v1',
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Mark a lane 5 big steps wide and 15 long, with a finish line at the end. The attacker ' +
      'has the ball at one end, the defender stands in front of them.',
    howToPlay:
      'The attacker dribbles slowly towards the finish line. The defender backs off, side-on, ' +
      'staying between the ball and the line and not diving in. If the attacker gets to the ' +
      'line, they score a point. If the defender stays in front the whole way, the defender ' +
      'scores a point. Swap every 4 goes.',
    focus: 'Back off in small steps, keep your eyes on the ball and stay on your feet.',
    easier: 'The attacker only walks.',
    harder: 'The attacker can speed up or change direction whenever they like.',
  },
  {
    id: 'defending-1v1-patience-challenge',
    name: 'Patience Challenge',
    skill: 'defending-1v1',
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Mark a square 8 big steps wide. The attacker has the ball in the middle and the ' +
      'defender stands 2 big steps away.',
    howToPlay:
      'The defender must wait for three whole seconds, staying on their feet and staying ' +
      'close, before they try to win the ball. The attacker tries to keep it away for 30 ' +
      'seconds. The defender scores a point for every ball won fairly after the wait, and the ' +
      'attacker for every 30 seconds kept. Swap after 4 goes.',
    focus: 'Patience wins the ball. Wait, stay balanced and pick your moment.',
    easier: 'Make the wait only two seconds.',
    harder: 'Make the square smaller, or ask the defender to guide the attacker to one side.',
  },
  {
    id: 'defending-1v1-gate-guard',
    name: 'Gate Guard',
    skill: 'defending-1v1',
    also: ['taking-on'],
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Set up three small gates (2 big steps wide) in a row, 4 big steps apart. The ' +
      'attacker starts at one end with the ball and the defender stands in the middle.',
    howToPlay:
      'The attacker tries to dribble through any gate. The defender moves in front of the ' +
      'gate the ball is heading for, staying on their feet. A gate scores a point for the ' +
      'attacker. If the attacker is stopped or loses control, the defender scores. Swap after ' +
      '5 goes.',
    focus: 'Move your feet quickly to stay between the ball and the gate.',
    easier: 'Make the gates wider.',
    harder: 'Add a fourth gate, or limit the attacker to 6 seconds.',
  },
  {
    id: 'defending-1v1-recovery-run',
    name: 'Recovery Run',
    skill: 'defending-1v1',
    also: ['transitions', 'athleticism'],
    players: [2, 2],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Mark a lane 6 big steps wide and 20 long with a goal line at the end. The attacker ' +
      'starts with the ball 4 big steps ahead of the defender.',
    howToPlay:
      'On “go”, the attacker dribbles to the goal line. The defender sprints to get between ' +
      'the ball and the goal and then slows down and defends. If the defender gets back in ' +
      'time and stops the attacker reaching the line, they score a point. Rest between goes ' +
      'and swap after 4.',
    focus: 'Sprint to get goal-side first. Then slow down, stay on your feet and stay patient.',
    easier: 'Give the defender a smaller head start gap.',
    harder: 'Make the gap bigger, or use a longer lane.',
  },
  {
    id: 'defending-1v1-show-them-wide',
    name: 'Show Them Wide',
    skill: 'defending-1v1',
    also: ['team-defending'],
    players: [2, 3],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a lane 10 big steps wide and 20 long. Put a small goal at the end. Put a cone ' +
      'line along one side as a “sideline”.',
    howToPlay:
      'The attacker dribbles at the goal. The defender approaches at an angle and shows the ' +
      'attacker towards the sideline, away from the middle. If the attacker is forced to the ' +
      'sideline and cannot score, the defender scores. A third player can wait as a second ' +
      'defender to help.',
    focus: 'Approach at an angle and show one way, so the attacker has less choice.',
    easier: 'The attacker starts walking.',
    harder: 'Move the sideline closer to the middle, or add a second attacker.',
  },
  {
    id: 'defending-1v1-footwork-ladder',
    name: 'Defender Footwork',
    skill: 'defending-1v1',
    also: ['team-defending', 'athleticism'],
    players: [1, 1],
    ages: [10, 18],
    level: 'beginner',
    minutes: 8,
    setup: 'Set four cones in a square, 4 big steps apart, on soft grass. You stand in the middle.',
    howToPlay:
      'Shuffle sideways to a cone, drop back to the next, then sprint forward to the third and ' +
      'backpedal to the middle. Stay low with knees bent and feet apart. Do 30 seconds, rest ' +
      '30 seconds, and do 5 rounds. Then try it with a ball at your feet.',
    focus: 'Stay low and side-on, and keep your feet from crossing as you move.',
    easier: 'Do each move slowly and focus on staying balanced.',
    harder: 'Call a random cone (or have a friend call it) and react.',
  },
  {
    id: 'defending-1v1-lane-cutter',
    name: 'Lane Cutter',
    skill: 'defending-1v1',
    also: ['team-defending', 'vision'],
    players: [3, 3],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Two passers stand 12 big steps apart with a ball. The defender stands between them, ' +
      'about 6 big steps from each.',
    howToPlay:
      'The passers pass to each other along the ground. The defender moves to cut off the ' +
      'passing lane, aiming to block or intercept the ball. Each block or interception is a ' +
      'point for the defender. Each completed pass is a point for the passers. Swap jobs after ' +
      '2 minutes.',
    focus: 'Stand where you can see the ball and the passer, and move when the pass is made.',
    easier: 'Passers play slowly and only along the ground.',
    harder: 'Add a third passer, or give the passers only two touches each.',
  },
  {
    id: 'defending-1v1-hold-the-line',
    name: 'Hold the Line',
    skill: 'defending-1v1',
    also: ['team-defending'],
    players: [6, 16],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'Mark a line 20 big steps long. Attackers with balls wait at one end 10 big steps back. ' +
      'Defenders stand along the line.',
    howToPlay:
      'Attackers dribble towards the line to cross it with the ball under control. Defenders ' +
      'stay on their feet, slow them down and try to make them go wide. Defenders do not ' +
      'tackle (the line is a block, not a fight). Count how many attackers are slowed down or ' +
      'stopped. Swap after 2 minutes.',
    focus: 'Face your attacker, stay patient and keep a step away from them.',
    easier: 'Attackers walk, defenders only block.',
    harder: 'Add more attackers than defenders.',
  },
  {
    id: 'defending-1v1-chase-and-block',
    name: 'Chase and Block',
    skill: 'defending-1v1',
    also: ['athleticism'],
    players: [2, 6],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Mark a lane 6 big steps wide and 15 long. The attacker has the ball at one end with a ' +
      'cone gate to dribble through at the other. The defender starts behind the attacker.',
    howToPlay:
      'The attacker sprints with the ball at a controlled pace. The defender chases from ' +
      'behind and tries to get alongside and then in front to block the way, without pulling ' +
      'or pushing. The defender scores for getting level before the gate. The attacker ' +
      'scores for reaching the gate first.',
    focus: 'Chase at an angle to get goal-side, with hands down and body in control.',
    easier: 'Give the defender a smaller head start gap.',
    harder: 'Make the lane longer and add a second gate.',
  },
  {
    id: 'defending-1v1-close-down-control',
    name: 'Close Down Control',
    skill: 'defending-1v1',
    also: ['team-defending', 'athleticism'],
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    setup:
      'Mark a start line on a flat, clear lane. You will need a ball and about 12 big steps ' +
      'of space in front of you.',
    howToPlay:
      'Give the ball a gentle push forward, as if an attacker has just touched it too far. ' +
      'Sprint after it, then slow right down for the last two steps. Stop a big step away, ' +
      'low and side-on, then stop the ball with the sole of your foot. Do 8 goes. A smooth ' +
      'stop a step away scores a point.',
    focus: 'Sprint to close the gap, then slow down and get low. Never charge in.',
    easier: 'Walk to the ball first, then build up speed.',
    harder: 'Roll the ball at an angle, so you have to curve your run.',
  },
  {
    id: 'defending-1v1-drop-step-sprints',
    name: 'Drop Step Sprints',
    skill: 'defending-1v1',
    also: ['athleticism'],
    players: [1, 1],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 8,
    setup:
      'Mark two cones 10 big steps apart. Stand at one cone, side-on, as if you were facing ' +
      'an attacker. Wear shoes with good grip on flat ground.',
    howToPlay:
      'Back-step a few steps with small, quick shuffles, staying side-on. Then call out ' +
      '“over the top!”, turn on your drop step and sprint to the other cone. Walk back, rest, ' +
      'and repeat 8 times, starting on the other side every second time.',
    focus: 'Turn smoothly on your drop step so there is no wasted step before you sprint.',
    easier: 'Jog the sprint and focus on the drop step.',
    harder: 'Have a friend call left or right at random.',
  },
  {
    id: 'defending-1v1-defender-relay',
    name: 'Defender Relay',
    skill: 'defending-1v1',
    also: ['athleticism'],
    players: [6, 16],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'Make teams of 3 or 4. For each team, mark a lane 8 big steps long with a cone at the ' +
      'far end. Each team lines up at the start.',
    howToPlay:
      'The first player shuffles side-on to the cone, staying low with small steps, touches ' +
      'it, then sprints back and tags the next player. Everyone takes a turn. Then try to ' +
      'beat your own team’s time. You are racing your best time, not the other teams.',
    focus: 'Tidy, quick feet when you shuffle, then a strong sprint back.',
    easier: 'Walk the shuffle.',
    harder: 'Add a ball to dribble back with.',
  },
];
