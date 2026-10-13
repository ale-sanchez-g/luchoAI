import type { LibraryGame } from '@/types';

export const TRANSITIONS_GAMES: LibraryGame[] = [
  {
    id: 'transitions-flip-the-switch',
    name: 'Flip the Switch',
    skill: 'transitions',
    also: ['dribbling', 'athleticism'],
    players: [1, 4],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    setup: 'Mark two lines about 15 big steps apart. Stand on one line with the ball.',
    howToPlay:
      'Dribble towards the far line. When you call “switch!” (or a friend claps), stop the ' +
      'ball, turn and sprint back the other way as fast as you can with the ball. Do 10 ' +
      'switches. Aim to be moving at full speed again within two touches.',
    focus: 'Turn quickly and explode in the new direction. The first two steps matter most.',
    easier: 'Walk the dribble and take your time turning.',
    harder: 'A friend calls “switch!” at random so you cannot guess when it is coming.',
  },
  {
    id: 'transitions-wall-turnover',
    name: 'Win It, Go!',
    skill: 'transitions',
    also: ['passing', 'first-touch'],
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Stand 6 big steps from a wall. Put a target gate (two cones) 8 big steps to your left, ' +
      'and a cone 2 big steps to your right, as the “defender”.',
    howToPlay:
      'Pass at the wall and imagine the rebound is a pass from the other team. Run to ' +
      'intercept it at the cone, then play a quick, accurate pass through the gate in less ' +
      'than three seconds. Do 10 goes and count how many get through.',
    focus: 'The second you win it, look up and decide. A fast pass beats a fancy one.',
    easier: 'Give yourself five seconds.',
    harder: 'Take only two touches, and move the gate further away.',
  },
  {
    id: 'transitions-two-goal-switch',
    name: 'Two Goal Switch',
    skill: 'transitions',
    also: ['movement'],
    players: [4, 10],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'Make a pitch 25 big steps long and 15 wide with a small goal at each end. Make two ' +
      'teams with equal numbers.',
    howToPlay:
      'Play a normal small game. The moment a team wins the ball, they must play a forward ' +
      'pass within three seconds, otherwise play carries on as normal. Any goal scored right ' +
      'after a quick forward pass counts double. Swap sides every 5 minutes.',
    focus: 'As soon as you win it, look forward first. The other team is out of shape.',
    easier: 'Give yourselves five seconds.',
    harder: 'Two seconds, and the forward pass must be along the ground.',
  },
  {
    id: 'transitions-first-pass-forward',
    name: 'First Pass Forward',
    skill: 'transitions',
    also: ['passing', 'vision'],
    players: [3, 3],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'One defender, one runner and one target. The defender starts with the ball 6 big steps ' +
      'in front of the runner. The target stands 15 big steps beyond them.',
    howToPlay:
      'The defender “wins the ball” (rolls it to themselves) and plays a forward pass to the ' +
      'runner, who runs on and passes to the target. Count how fast your team can get from ' +
      'winning the ball to the target in under 8 seconds. Swap roles after 5 goes.',
    focus: 'Win it, look up, play forward. The runner starts moving before the pass.',
    easier: 'Give yourselves 12 seconds.',
    harder: 'Add a cone defender between the runner and the target.',
  },
  {
    id: 'transitions-three-v-two-break',
    name: 'Three v Two Break',
    skill: 'transitions',
    also: ['finishing', 'movement'],
    players: [5, 5],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Use half a pitch with a goal and a goalkeeper at one end. Three attackers start at ' +
      'the halfway line with a ball. Two defenders wait near the goal. Another defender starts ' +
      'behind the attackers.',
    howToPlay:
      'The three attackers run at the two defenders and try to score. After a few seconds, ' +
      'the third defender sprints back to join in. The attackers score if they shoot before ' +
      'the third defender arrives. Swap roles after every goal or save.',
    focus: 'Attackers: spread out and go forward quickly. Defenders: delay until help arrives.',
    easier: 'The third defender starts closer.',
    harder: 'The third defender starts later, so the attackers have less time.',
  },
  {
    id: 'transitions-lose-it-regroup',
    name: 'Lose It, Regroup',
    skill: 'transitions',
    also: ['team-defending', 'teamwork'],
    players: [6, 12],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'Mark a pitch 25 big steps long and 15 wide. Make two teams, with a small goal at ' +
      'each end. Every player wears a bib or is easy to see.',
    howToPlay:
      'Play a small game. When a team loses the ball, the whole team shouts “regroup!” and ' +
      'every player runs to get between the ball and their own goal. A team that is all ' +
      'back within five seconds scores a point. Keep playing and count how often you ' +
      'regroup well.',
    focus: 'Lose it, shout it, and everybody gets back together.',
    easier: 'Give yourselves eight seconds to get back.',
    harder: 'Three seconds, and everyone must be in a line behind the ball.',
  },
  {
    id: 'transitions-long-switch-rondo',
    name: 'Win and Switch',
    skill: 'transitions',
    also: ['passing', 'movement'],
    players: [6, 12],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a square 12 big steps wide with a small target gate on two opposite sides, 20 ' +
      'big steps apart in total. Play 4 v 2 inside the square.',
    howToPlay:
      'The four keep the ball away from the two. If the two win it, they must switch the ' +
      'play: pass quickly through the far gate to a waiting teammate. A point for each ' +
      'successful switch. Swap players after every winning switch.',
    focus: 'When you win it, look to the far side. The other team has moved to the ball.',
    easier: 'Make the gates wider.',
    harder: 'Only one touch to control before the long pass.',
  },
  {
    id: 'transitions-counter-relay',
    name: 'Counter Relay',
    skill: 'transitions',
    also: ['passing', 'athleticism'],
    players: [6, 16],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'Make teams of 3 or 4. Each team has a start line and a target cone 20 big steps ahead. ' +
      'A “defender” cone stands halfway between them.',
    howToPlay:
      'Player one “wins the ball” at the defender cone and passes forward to player two, who ' +
      'runs on and passes to player three, who dribbles round the target cone and sprints ' +
      'back. Every team plays the same relay. Try to beat your own team time on the next go.',
    focus: 'Pass and run. Quick passes beat dribbling the whole way.',
    easier: 'Walk through the first go to learn the pattern.',
    harder: 'Add a rule that every pass must be one or two touches.',
  },
  {
    id: 'transitions-end-to-end',
    name: 'End to End',
    skill: 'transitions',
    also: ['team-defending', 'finishing'],
    players: [8, 10],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 15,
    setup:
      'Make a pitch 35 big steps long and 20 wide with a small goal at each end. Play 4 v 4. ' +
      'Put a halfway line down the middle.',
    howToPlay:
      'Play a normal small game. When a team wins the ball, they have six seconds to shoot or ' +
      'it goes to the other team. A goal scored within six seconds of winning the ball counts ' +
      'double. Swap teams for a second game so everyone plays both sides.',
    focus: 'Win it, go forward, and have players ready for the next transition.',
    easier: 'Give yourselves ten seconds.',
    harder: 'Four seconds, or a goal needs two passes first.',
  },
  {
    id: 'transitions-fast-restart',
    name: 'Fast Restart',
    skill: 'transitions',
    also: ['vision'],
    players: [2, 6],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Mark a pitch 15 big steps wide with a gate at each end. Put spare balls in a pile ' +
      'near the touchline. One player acts as the “thrower”.',
    howToPlay:
      'When a ball goes out, the thrower instantly restarts with a new ball so play never ' +
      'stops. Players must be ready to move at once, with a quick pass and run. Count how many ' +
      'passes your group can make in a minute without stopping, and try to beat it.',
    focus: 'Stay alert and move the moment the ball goes out. Be ready before it arrives.',
    easier: 'Take a short break between balls.',
    harder: 'Every restart must go to the far side of the pitch.',
  },
];
