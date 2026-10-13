import type { LibraryGame } from '@/types';

export const TEAM_DEFENDING_GAMES: LibraryGame[] = [
  {
    id: 'team-defending-press-and-recover',
    name: 'Press and Recover',
    skill: 'team-defending',
    also: ['defending-1v1', 'athleticism', 'transitions'],
    players: [1, 1],
    ages: [10, 18],
    level: 'beginner',
    minutes: 8,
    setup:
      'Put a cone 10 big steps in front of you (the “ball carrier”) and another 10 big steps ' +
      'behind you (your “goal”). Rest between runs.',
    howToPlay:
      'Sprint out in a curved run to close down the front cone, stopping a step away and ' +
      'getting low and side-on. Then backpedal and turn to sprint back to the cone behind ' +
      'you, getting between the ball and the goal. Do 6 runs, resting at least 30 seconds ' +
      'between each.',
    focus: 'Sprint to close down, then get low, slow down and stay on your feet.',
    easier: 'Jog the run and focus on the shape of it.',
    harder: 'Time yourself, or add a second front cone to choose from.',
  },
  {
    id: 'team-defending-cone-chess',
    name: 'Cone Chess',
    skill: 'team-defending',
    also: ['vision'],
    players: [1, 3],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'On a flat patch of grass, put four cones in a line as a back four, 3 big steps apart. ' +
      'Use a bottle or a ball as “the ball”. You are the coach.',
    howToPlay:
      'Move the “ball” to a new spot, then move your four cones so that your defence is ' +
      'compact: close together, with a defender near the ball and the rest covering. Each ' +
      'time you set the cones before a friend counts to five, you earn a point. With friends, ' +
      'take turns moving the ball and the cones.',
    focus: 'When the ball moves, the whole line slides. Keep the gaps small.',
    easier: 'Take as long as you like.',
    harder: 'Add a second line of three cones in front as a midfield.',
  },
  {
    id: 'team-defending-ambush-pair',
    name: 'Ambush!',
    skill: 'team-defending',
    also: ['defending-1v1', 'vision'],
    players: [3, 3],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a square 10 big steps wide. One attacker with a ball stands in the middle with ' +
      'their back to the two defenders, who stand at opposite sides.',
    howToPlay:
      'The attacker turns and tries to dribble out of the square. The first defender presses ' +
      'from the front. The second defender waits until the attacker looks down or cannot ' +
      'face forward, then closes in at an angle to trap them (2 v 1). No hard contact. Win ' +
      'the ball or stop the escape for a point. Swap after 4 goes.',
    focus:
      'The ambush works when the attacker cannot see you. Time your run, then stay on your feet.',
    easier: 'Defenders start closer to the attacker.',
    harder: 'Shrink the square, or only allow 5 seconds per go.',
  },
  {
    id: 'team-defending-lock-in',
    name: 'Lock In',
    skill: 'team-defending',
    also: ['vision'],
    players: [4, 8],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a pitch 20 big steps wide and 25 long. Play 3 attackers against 2 defenders ' +
      'with a goalkeeper or a target for the defenders to protect.',
    howToPlay:
      'One defender presses the ball. The other “locks in” on the nearest passing option, ' +
      'getting close so there is no easy pass. The attackers keep the ball for 20 seconds ' +
      'to score a point. The defenders score if they win it or force a bad pass. Swap jobs ' +
      'each round.',
    focus: 'When one player presses, everyone nearby locks in on the closest option.',
    easier: 'Play 3 v 1, with the defender pressing.',
    harder: 'Play 4 v 3 or shorten the time to 15 seconds.',
  },
  {
    id: 'team-defending-stay-compact',
    name: 'Stay Compact',
    skill: 'team-defending',
    also: ['movement'],
    players: [5, 10],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'Mark a box about 12 big steps wide and 15 deep with a gap at each end. Four defenders ' +
      'stand inside it. Two or three attackers with a ball stand outside.',
    howToPlay:
      'The attackers try to pass the ball through the box without the defenders touching it. ' +
      'Defenders must stay inside and move together as one group to close the gaps. A pass ' +
      'through is a point for the attackers. A block is a point for the defenders. Swap after ' +
      '3 minutes.',
    focus: 'Stay close together, front to back and side to side, so there are no gaps.',
    easier: 'Make the box smaller so the defenders are closer together.',
    harder: 'Make the box bigger, or add a third attacker.',
  },
  {
    id: 'team-defending-slide-together',
    name: 'Slide Together',
    skill: 'team-defending',
    players: [4, 10],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Make a line of defenders, one arm’s length apart, facing a leader or a ball carrier ' +
      '10 big steps away. A line of cones marks the “goal”.',
    howToPlay:
      'The leader moves the ball left and right along the line (or just walks and points). ' +
      'The defenders slide sideways together to stay in front of the ball, keeping the same ' +
      'gaps. If the line stays together, they score a point. Change the leader every minute.',
    focus: 'Move as one: the player nearest the ball leads, and everyone else follows.',
    easier: 'The leader walks very slowly.',
    harder: 'The leader plays a pass and the line must shift quickly.',
  },
  {
    id: 'team-defending-hold-the-block',
    name: 'Hold the Block',
    skill: 'team-defending',
    also: ['transitions', 'vision'],
    players: [8, 16],
    ages: [12, 18],
    level: 'advanced',
    minutes: 15,
    setup:
      'Use half a pitch with a goal and a goalkeeper. Defenders (6 or 7) form a block near ' +
      'their goal. Attackers (6 or 7) start with the ball.',
    howToPlay:
      'The attackers try to score. The defenders stay compact and connected, press when the ' +
      'ball is played wide, and talk to each other. If they win the ball, a pass to a ' +
      'teammate on the halfway line scores a point. Stop and ask: what worked? Then play on. ' +
      'Swap teams after 8 minutes.',
    focus: 'Compact, connected, communicate. Press as a group, not alone.',
    easier: 'Fewer attackers than defenders.',
    harder: 'Equal numbers, or the defenders must score in under 10 seconds.',
  },
  {
    id: 'team-defending-press-triggers',
    name: 'Press Triggers',
    skill: 'team-defending',
    also: ['vision', 'transitions'],
    players: [6, 12],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a pitch 25 big steps wide and 30 long. Play 4 v 4 (or similar) with a ' +
      'neutral player who joins whichever team has the ball.',
    howToPlay:
      'The defending team may only press the ball when they spot a trigger: a heavy touch, ' +
      'a pass back or sideways, or a player with their back to goal. The rest of the time they ' +
      'hold their shape. Win the ball on a trigger for 2 points, win it any other time for 1.',
    focus: 'Spot the trigger together, then go as a group. Hold your shape the rest of the time.',
    easier: 'A coach or leader shouts “trigger!” when they see one.',
    harder: 'Add a trigger, or the defenders have only 5 seconds to win it.',
  },
  {
    id: 'team-defending-wide-trap',
    name: 'Wide Trap',
    skill: 'team-defending',
    also: ['defending-1v1'],
    players: [6, 12],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a wide channel, 12 big steps across and 25 long, with a sideline on one side. ' +
      'Play 3 attackers against 3 defenders.',
    howToPlay:
      'The attackers try to move the ball up the channel. The defenders show the ball ' +
      'carrier towards the sideline, then close in together, so they have fewer passing ' +
      'options. Win the ball, or stop the attackers reaching the end line, for a point. ' +
      'Swap after 6 goes.',
    focus: 'Show them wide, then trap them: press from the inside with your teammates close.',
    easier: 'Play 3 v 2, with more attackers.',
    harder: 'Narrow the channel, or the attackers have only 15 seconds.',
  },
  {
    id: 'team-defending-get-behind-the-ball',
    name: 'Get Behind the Ball',
    skill: 'team-defending',
    also: ['transitions', 'athleticism'],
    players: [6, 16],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Mark a pitch 25 big steps long with a goal line at each end. Make two teams, with a ' +
      'mini goal at each end.',
    howToPlay:
      'Play a small game. When your team loses the ball, shout “back!” and sprint to get ' +
      'behind the ball, between it and your own goal. A team that has everyone behind the ' +
      'ball in three seconds scores a point. Keep playing and swap the leader for “back!” ' +
      'every minute.',
    focus: 'The moment the ball is lost, sprint back and get goal-side.',
    easier: 'Give yourselves five seconds to get back.',
    harder: 'Two seconds, or add a bonus for winning the ball back.',
  },
  {
    id: 'team-defending-see-ball-see-man',
    name: 'See Ball, See Man',
    skill: 'team-defending',
    also: ['vision', 'defending-1v1'],
    players: [1, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Put one cone down as your goal. Put a second cone as the “ball” and a third as the ' +
      'player you are marking, about 6 big steps apart. You are the defender.',
    howToPlay:
      'Move to a spot where you can see both the ball and your player, and where you are ' +
      'closer to your goal than they are. Then move the ball cone and your player’s cone to ' +
      'new places (or ask a friend to) and find your new spot. Do 12 moves. Each time you ' +
      'see both and stand goal-side, you score a point.',
    focus: 'Stand side-on, so you can see the ball and your player at the same time.',
    easier: 'Keep your player’s cone still.',
    harder: 'Move both cones quickly and find your spot in three seconds.',
  },
  {
    id: 'team-defending-press-and-cover',
    name: 'Press and Cover',
    skill: 'team-defending',
    also: ['defending-1v1'],
    players: [3, 3],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a lane 8 big steps wide and 20 long with a small goal at the end. One attacker ' +
      'with a ball starts at the far end. Two defenders start near the goal, one a few steps ' +
      'behind the other.',
    howToPlay:
      'The first defender presses the attacker and stays on their feet. The second defender ' +
      'stands a few steps behind, at an angle, ready to cover if the attacker gets past. A ' +
      'goal is a point for the attacker. If the defenders stop the attacker, the point is ' +
      'theirs. Swap roles after 4 goes.',
    focus: 'First defender: delay. Second defender: cover, and be ready to step in.',
    easier: 'The attacker walks.',
    harder: 'Give the attacker a second teammate to pass to.',
  },
];
