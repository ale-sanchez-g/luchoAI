import type { LibraryGame } from '@/types';

export const TEAMWORK_GAMES: LibraryGame[] = [
  {
    id: 'teamwork-name-and-pass',
    name: 'Name and Pass',
    skill: 'teamwork',
    also: ['passing'],
    players: [3, 8],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['talk'],
    setup: 'Players stand in a circle about 10 big steps wide, with one ball.',
    howToPlay:
      'Before you pass, call out the name of the player you are passing to. The receiver ' +
      'calls “Got it!” and controls the ball, then names the next player. Keep going for 3 ' +
      'minutes and count your passes. If no name is called, the pass does not count.',
    focus: 'Clear calls make teammates confident. Use a loud, friendly voice.',
    easier: 'Say the name as you pass, instead of before.',
    harder: 'Add a second ball, or ask everyone to call “time” or “man on” as well.',
  },
  {
    id: 'teamwork-voice-guide',
    name: 'Voice Guide',
    skill: 'teamwork',
    also: ['dribbling', 'vision'],
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['talk'],
    setup:
      'Set up four or five cones in a zigzag, 3 big steps apart. One player dribbles at the ' +
      'start. Their partner stands at the end of the course.',
    howToPlay:
      'The partner guides the dribbler through the cones with their voice only (“left a ' +
      'little”, “speed up”, “turn now”) without pointing. The dribbler keeps their eyes open ' +
      'and moves carefully. Time the run, then swap. Beat your pair’s best time together.',
    focus: 'Short, clear instructions. Guides: say what to do, and when. Dribblers: listen well.',
    easier: 'The guide may point as well as speak.',
    harder: 'The guide stands to one side and can only use three different words.',
  },
  {
    id: 'teamwork-reset-routine',
    name: 'Reset Routine',
    skill: 'teamwork',
    also: ['first-touch', 'passing'],
    players: [1, 4],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    noTwists: ['pace', 'talk', 'roles'],
    setup: 'Stand 4 big steps from a wall. Pick a short reset routine to use after any mistake.',
    howToPlay:
      'Your routine could be: breathe out slowly, drop your shoulders, say “next ball” and ' +
      'get back to work. Pass against the wall. Every time you make an error (a bad touch or a ' +
      'wild pass), do your reset before the next ball. Count how quickly you get going again.',
    focus: 'The mistake is over the moment you reset. The next ball is the only one that counts.',
    easier: 'Take as long as you need for each reset.',
    harder: 'Complete the whole reset in about three seconds.',
  },
  {
    id: 'teamwork-calm-kicks',
    name: 'Calm Kicks',
    skill: 'teamwork',
    also: ['finishing'],
    players: [1, 6],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    noTwists: ['pace'],
    setup:
      'Use a goal or a target on a wall. Mark a spot 8 big steps away. Everyone has a ' +
      'turn at the spot.',
    howToPlay:
      'Before every shot, do the same short routine: one slow breath in for 4, out for 6, ' +
      'look at your target, then shoot. Take 10 shots. Notice how calm you feel on a scale of ' +
      '1 to 3. Do not count goals, only how steady your routine was.',
    focus: 'A calm routine you can repeat every time helps in a big moment.',
    easier: 'Use a bigger target and take your time.',
    harder: 'Have friends watch and cheer between shots, and keep your routine the same.',
  },
  {
    id: 'teamwork-captain-for-a-minute',
    name: 'Captain for a Minute',
    skill: 'teamwork',
    also: ['team-defending', 'passing'],
    players: [6, 16],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    noTwists: ['talk', 'players', 'handicap'],
    setup:
      'Play a small game, 4 v 4 or similar, in a pitch about 25 big steps long. Pick a ' +
      'captain for each team to start with.',
    howToPlay:
      'The captain’s job is to give three clear, helpful instructions to their team during ' +
      'the minute, such as “squeeze up”, “spread out” or “well done”. After one minute, a ' +
      'new captain takes over. Everybody gets a turn. At the end, share the best call you heard.',
    focus: 'Calm, clear and kind: say what to do, say it early and say it as a team-mate.',
    easier: 'The captain only has to give one instruction.',
    harder: 'The captain must also give a thank-you to a teammate.',
  },
  {
    id: 'teamwork-cheer-corner',
    name: 'Cheer Corner',
    skill: 'teamwork',
    also: ['passing', 'finishing'],
    players: [4, 12],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['talk', 'roles'],
    setup:
      'Set up a simple shooting or passing game your group already knows. Add a score ' +
      'sheet or someone to count.',
    howToPlay:
      'Play as normal, but the team scores a bonus point every time someone says something ' +
      'encouraging to a teammate, like “good try” or “nice pass”. Aim for 20 encouraging ' +
      'words in the game. There are no points off for mistakes, only for kind words.',
    focus: 'Encourage the effort, not just the result. A try that fails still deserves a cheer.',
    easier: 'Count every positive word, big or small.',
    harder: 'Give a specific compliment, like “great scan” or “good run”.',
  },
  {
    id: 'teamwork-quiet-then-loud',
    name: 'Quiet Then Loud',
    skill: 'teamwork',
    also: ['passing', 'movement'],
    players: [6, 12],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['talk', 'players', 'handicap'],
    setup:
      'Play a keep-ball game in a square about 15 big steps wide, with the group split ' +
      'into two teams. One team has a ball.',
    howToPlay:
      'For the first 2 minutes, no talking at all. Count how many passes you make. Then ' +
      'for the next 2 minutes, talk as much as you can (names, “man on”, “turn”). Count ' +
      'again. Which round was better? Discuss why for a minute.',
    focus: 'Good communication helps everyone, so notice what changes when you talk.',
    easier: 'Play with just one team passing and the other standing as cones.',
    harder: 'Use hand signals in the quiet round and see how many work.',
  },
  {
    id: 'teamwork-team-juggle',
    name: 'Team Juggle',
    skill: 'teamwork',
    also: ['first-touch'],
    players: [3, 10],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['roles'],
    setup:
      'Make a circle of players about 5 big steps across, on soft grass. You need one ball ' +
      'that is easy to control.',
    howToPlay:
      'Keep the ball in the air as a team, using feet, thighs and chest only (no hands). ' +
      'Each player can touch it once in a row. Count the group’s touches together out loud. ' +
      'If the ball drops, start again and try to beat your record.',
    focus: 'Make your touch gentle and send the ball up to the next player’s waist.',
    easier: 'Let the ball bounce once between touches.',
    harder: 'Add a second ball, or pass in a set order around the circle.',
  },
  {
    id: 'teamwork-role-swap',
    name: 'Role Swap',
    skill: 'teamwork',
    also: ['movement', 'team-defending'],
    players: [6, 12],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 12,
    noTwists: ['talk', 'players', 'handicap'],
    setup:
      'Make a pitch 25 big steps long with a small goal at each end. Play 3 v 3 or 4 v 4. ' +
      'Each player is given a role for 3 minutes: attacker, defender, or playmaker.',
    howToPlay:
      'Play a normal small game, staying in your role. After 3 minutes, everyone swaps to a ' +
      'new role. Afterwards, each player says one thing they learned about the job. Everyone ' +
      'gets to try each role.',
    focus: 'Every role needs a different kind of thinking. Listen to your teammates in each one.',
    easier: 'Use only two roles.',
    harder: 'Roles swap every minute, so you learn to switch quickly.',
  },
  {
    id: 'teamwork-focus-passing',
    name: 'Focus Passing',
    skill: 'teamwork',
    also: ['passing', 'first-touch'],
    players: [2, 6],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['talk', 'handicap'],
    setup: 'Pairs stand 8 big steps apart with a ball. A third player is the friendly distractor.',
    howToPlay:
      'Pass the ball back and forth and keep count. The distractor tries to throw you off ' +
      'with silly, kind noises (animal sounds, funny voices) but does not touch or block ' +
      'you. Keep your count. Your aim is to stay calm and keep passing accurately. Swap jobs ' +
      'after 2 minutes.',
    focus: 'Pick one thing to look at, like the ball, and let the noise go by.',
    easier: 'The distractor stands further back and whispers.',
    harder: 'Use a faster passing rhythm, or two distractors.',
  },
  {
    id: 'teamwork-my-match-routine',
    name: 'My Match Routine',
    skill: 'teamwork',
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['pace'],
    setup:
      'You need a piece of paper and a pen. Do this on a quiet day, well before your next ' +
      'match, with a ball nearby for the warm-up part.',
    howToPlay:
      'Write a short routine for the hour before a game: packing your bag (water, kit, ' +
      'boots), your warm-up, and one thing to help you feel calm, like slow breathing. Add ' +
      'one match mission. Then walk through the routine once with your ball, so it feels ' +
      'normal. Keep it short and the same each time.',
    focus: 'A steady routine makes match day feel familiar, and familiar feels calm.',
    easier: 'Write just three steps: pack, warm up, breathe.',
    harder: 'Use it before your next match, then change one thing afterwards.',
  },
];
