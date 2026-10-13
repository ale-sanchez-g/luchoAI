import type { LibraryGame } from '@/types';

export const TAKING_ON_GAMES: LibraryGame[] = [
  {
    id: 'taking-on-fake-and-go',
    name: 'Fake and Go',
    skill: 'taking-on',
    also: ['dribbling', 'creativity'],
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Set up a row of 4 cones about 4 big steps apart. Each cone is a defender. Mark a ' +
      'finish line 4 big steps after the last cone.',
    howToPlay:
      'Dribble up to a cone, fake one way (drop your shoulder or step over the ball), then ' +
      'push the ball the other way and sprint past it. Do this at every cone and finish with ' +
      'a burst to the line. Do 6 runs, mixing up your fakes.',
    focus: 'Sell the fake with your body, then explode away in the first two steps.',
    easier: 'Walk the first run, then build up speed.',
    harder: 'Use a different fake at each cone, or finish with a shot at a target.',
  },
  {
    id: 'taking-on-three-cone-escape',
    name: 'Three Cone Escape',
    skill: 'taking-on',
    also: ['finishing'],
    players: [1, 3],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Put three cones in a zigzag, 4 big steps apart. Place a small goal (two cones) 6 big ' +
      'steps after the last cone. Start 4 big steps before the first cone.',
    howToPlay:
      'Dribble past each cone as if it were a defender, then shoot at the small goal. Take ' +
      '8 turns. You score a point for getting past all three cones with the ball under ' +
      'control, and another point if you score. With friends, take turns and cheer each go.',
    focus: 'Change speed or direction as you reach each cone, then accelerate away.',
    easier: 'Spread the cones further apart and skip the shot.',
    harder: 'Put the cones closer together, or only use your weaker foot at the last cone.',
  },
  {
    id: 'taking-on-stop-start',
    name: 'Stop-Start Surprise',
    skill: 'taking-on',
    also: ['athleticism'],
    players: [1, 2],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 8,
    setup:
      'Mark a lane about 6 big steps wide and 20 long. Place a cone in the middle as your ' +
      '“defender”, or have a friend stand there.',
    howToPlay:
      'Dribble at the defender, then suddenly stop the ball under your sole for a second and ' +
      'pause. As soon as the defender relaxes, burst past on either side. Do 10 goes. Score a ' +
      'point for every time you get past the cone with the ball under control.',
    focus: 'The pause freezes the defender. Go the instant they stop moving.',
    easier: 'Slow the dribble and use a bigger lane.',
    harder: 'Have your friend jog towards you while you pause.',
  },
  {
    id: 'taking-on-gate-run',
    name: 'Gate Run',
    skill: 'taking-on',
    also: ['defending-1v1'],
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'Make three gates (two cones, 2 big steps apart) in a line across a pitch about 12 big ' +
      'steps wide. The attacker starts 8 big steps back, the defender stands in the middle.',
    howToPlay:
      'The attacker tries to dribble through any gate. The defender tries to block the way ' +
      'and stay on their feet. Under 10s: defenders only block and do not tackle. Each gate ' +
      'you get through is a point for the attacker. Swap after 6 goes and add up your scores.',
    focus: 'Attacker: read the defender’s feet and go where they are not. Defender: stay patient.',
    easier: 'Make the gates wider, or the defender walks.',
    harder: 'Make the gates narrower, or give the attacker only 5 seconds.',
  },
  {
    id: 'taking-on-pick-a-goal',
    name: 'Pick a Goal',
    skill: 'taking-on',
    also: ['finishing', 'vision'],
    players: [2, 2],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Put two small goals (two cones each) 8 big steps apart at one end of a pitch 12 big ' +
      'steps wide. The attacker starts 12 big steps back, the defender in the middle.',
    howToPlay:
      'The attacker dribbles at the defender and chooses which goal to score in, depending on ' +
      'where the defender leans. Score through either goal for a point. Swap after 6 goes. ' +
      'Defenders: stay on your feet and show the attacker to one side.',
    focus: 'Watch the defender’s weight. Go to the goal they are not covering.',
    easier: 'Make the goals wider, or the defender starts further back.',
    harder: 'Make the goals narrower, or limit the attacker to 6 seconds.',
  },
  {
    id: 'taking-on-corner-pocket',
    name: 'Corner Pocket 1v1',
    skill: 'taking-on',
    players: [2, 6],
    ages: [9, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Make a channel 8 big steps wide and 15 long with a small goal at one end. The ' +
      'attacker starts at the far end with the ball, the defender at the goal.',
    howToPlay:
      'The attacker dribbles at the defender and tries to score in the small goal. The ' +
      'defender tries to win the ball fairly and stay on their feet. After each go, swap ' +
      'jobs. In a group, rotate: the defender becomes the attacker and the attacker joins the ' +
      'back of the line.',
    focus: 'Attack at pace, and decide early: inside, outside or shoot.',
    easier: 'Start the attacker closer to the goal.',
    harder: 'Add a second attacker who can receive a pass.',
  },
  {
    id: 'taking-on-rotation-1v1',
    name: '1v1 Rotation',
    skill: 'taking-on',
    also: ['defending-1v1'],
    players: [6, 16],
    ages: [8, 18],
    level: 'beginner',
    minutes: 15,
    setup:
      'Make 3 or 4 small lanes (6 big steps wide, 12 long) with a small goal at one end of ' +
      'each. Groups of 4 at each lane: one attacker, one defender, two waiting.',
    howToPlay:
      'Play 1v1 in each lane. After every go, the attacker moves to the back, the defender ' +
      'becomes the attacker and the next player defends. Everyone keeps a personal score of ' +
      'good attempts, not goals, and adds it to the team total.',
    focus: 'Try something different every go. A brave attempt that fails still counts.',
    easier: 'Defenders start behind the attacker and chase.',
    harder: 'Time each go at 8 seconds to keep the pace high.',
  },
  {
    id: 'taking-on-wing-wars',
    name: 'Wing Wars',
    skill: 'taking-on',
    also: ['passing', 'movement'],
    players: [4, 8],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a wide lane about 8 big steps wide and 25 long, with a small goal at the end and ' +
      'a finisher waiting near it. A winger and a full-back start at the halfway line.',
    howToPlay:
      'The winger runs at the full-back to beat them and then passes low along the ground to ' +
      'the finisher, who shoots with their feet. Then swap jobs. Count how many times the ' +
      'winger gets past, and how many chances the finisher gets.',
    focus: 'Take the full-back on at pace, then pick the pass before you cross the line.',
    easier: 'The full-back starts a step back and only walks.',
    harder: 'Add a second defender near the goal, or make the finisher come from deep.',
  },
  {
    id: 'taking-on-burst-past',
    name: 'Burst Past',
    skill: 'taking-on',
    also: ['athleticism'],
    players: [2, 2],
    ages: [12, 18],
    level: 'advanced',
    minutes: 10,
    setup:
      'Mark a lane 5 big steps wide and 15 long. The attacker starts with the ball at one ' +
      'end, the defender one step off them, facing them.',
    howToPlay:
      'On “go”, the attacker pushes the ball past the defender’s side and sprints to win the ' +
      'race to a cone 10 big steps away. The defender chases but cannot tackle. A point for ' +
      'each time the attacker gets there first. Swap after 5 goes, rest between goes.',
    focus: 'A sharp first touch and the first two steps are what win the race.',
    easier: 'Start the defender two steps off, or only walking.',
    harder: 'Let the defender challenge fairly for the ball after the first touch.',
  },
  {
    id: 'taking-on-gauntlet',
    name: 'The Gauntlet',
    skill: 'taking-on',
    also: ['dribbling'],
    players: [4, 12],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'Make a lane 6 big steps wide and 15 long. Three “gatekeepers” stand in it holding ' +
      'cones, 4 big steps apart. Dribblers wait in a line at the start, each with a ball.',
    howToPlay:
      'Gatekeepers shuffle side to side with the cones, but do not move forward or tackle. ' +
      'Each dribbler runs the gauntlet and tries to get past all three. A point for each ' +
      'gatekeeper beaten. Swap gatekeepers every 3 dribblers so everybody gets a go.',
    focus: 'Look for the gap between the gatekeepers and burst into it.',
    easier: 'Gatekeepers stand still.',
    harder: 'Gatekeepers move more, or the dribbler has to use only one foot.',
  },
  {
    id: 'taking-on-hide-and-turn',
    name: 'Hide and Turn',
    skill: 'taking-on',
    also: ['first-touch', 'dribbling'],
    players: [2, 2],
    ages: [8, 12],
    level: 'beginner',
    minutes: 10,
    setup:
      'Mark a square 5 big steps wide. The attacker has the ball in the square and the ' +
      'defender stands a step behind them. A gate (two cones) is 8 big steps in front of ' +
      'the attacker.',
    howToPlay:
      'The attacker keeps their body between the ball and the defender (“hide it”), then ' +
      'turns when they find space and dribbles through the gate. The defender stays a step ' +
      'away and only walks. A point for each turn that gets through the gate. Swap after 6 ' +
      'goes.',
    focus: 'Hide the ball with your body, then turn when there is space.',
    easier: 'The defender stays still.',
    harder: 'The defender may jog and try to win the ball fairly.',
  },
];
