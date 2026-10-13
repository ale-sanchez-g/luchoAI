import type { LibraryGame } from '@/types';

export const CREATIVITY_GAMES: LibraryGame[] = [
  {
    id: 'creativity-invent-a-trick',
    name: 'Invent-a-Trick',
    skill: 'creativity',
    also: ['dribbling'],
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'You need a ball and a patch of space about 5 big steps across. Bring a notepad or ' +
      'just remember what you make.',
    howToPlay:
      'Invent a brand new move using only the ball and your feet. Try to do it 5 times in a ' +
      'row. Give it a funny name. Then invent a second move that starts from the end of the ' +
      'first. You have made a combo! Show a friend or family member.',
    focus: 'There are no wrong answers. Try something you have never tried before.',
    easier: 'Start from a move you already know and change one thing.',
    harder: 'Link three moves into a combo you can do at speed.',
  },
  {
    id: 'creativity-freestyle-menu',
    name: 'Freestyle Cards',
    skill: 'creativity',
    also: ['first-touch'],
    players: [1, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Write six ideas on bits of paper: “sole”, “outside foot”, “thigh”, “turn”, “stop” ' +
      'and “spin”. Fold them up and put them in a pile.',
    howToPlay:
      'Pick two cards. Make a short routine with the ball using those two ideas, for 20 ' +
      'seconds. Then pick two new cards and make another routine. Do 6 rounds. With a ' +
      'friend, take turns and copy each other’s favourite.',
    focus: 'Mix and match. A small change to a move makes it a new move.',
    easier: 'Pick only one card at a time.',
    harder: 'Pick three cards, and use all of them in one smooth routine.',
  },
  {
    id: 'creativity-gate-crashers',
    name: 'Gate Crashers',
    skill: 'creativity',
    also: ['passing'],
    players: [2, 6],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['roles'],
    setup:
      'Pairs stand 8 big steps apart. Both players stand with their feet about a big step ' +
      'apart, to make a “gate” with their legs.',
    howToPlay:
      'Pass the ball back and forth, aiming to roll it through your partner’s legs (a ' +
      'nutmeg gate). Each pass through the gate is a point. After every 5 passes, take one ' +
      'step back. Keep a pair score and cheer each other on.',
    focus: 'Pass with the inside of your foot and aim for the middle of the gate.',
    easier: 'Stand closer and make a bigger gate.',
    harder: 'Move one big step in between each pass.',
  },
  {
    id: 'creativity-flick-and-go',
    name: 'Flick and Go',
    skill: 'creativity',
    also: ['first-touch', 'taking-on'],
    players: [1, 2],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 10,
    noTwists: ['roles'],
    setup:
      'Mark a start line and a cone 8 big steps away. You will practise on soft ground. ' +
      'A friend can stand by the cone, or you can use a wall.',
    howToPlay:
      'Dribble up to the cone, flick the ball past it with the outside of your foot or a ' +
      'quick toe flick, then sprint round to collect it on the other side. Try different ' +
      'flicks each time. Do 8 runs and note which one works best.',
    focus: 'A flick works when the ball goes where you are about to go, not where you are.',
    easier: 'Use a flat, slow flick along the ground.',
    harder: 'Do the flick at full speed, or add a small obstacle to flick it past.',
  },
  {
    id: 'creativity-look-away-pass',
    name: 'Look Away, Pass There',
    skill: 'creativity',
    also: ['passing', 'vision'],
    players: [2, 2],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Stand 6 big steps from your partner with a ball. Place two small gates, one on each ' +
      'side of your partner, as passing options.',
    howToPlay:
      'Look at one gate, then pass to the other one. Your partner has to guess which way ' +
      'you will go. They control the ball and do the same. A pass through the gate you did ' +
      'not look at is 2 points; the gate you looked at is 1 point.',
    focus: 'Use your eyes and body to fool a defender, and keep the pass accurate.',
    easier: 'Make the gates wide.',
    harder: 'Play first time, with no stopping the ball.',
  },
  {
    id: 'creativity-trick-relay',
    name: 'Trick Relay',
    skill: 'creativity',
    also: ['dribbling'],
    players: [6, 16],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'Make teams of 3 or 4. Each team has a line, a ball, and a cone 8 big steps away to ' +
      'dribble round. Each player picks a trick to do at the cone.',
    howToPlay:
      'Dribble to the cone, do your trick (a turn, a spin, or a pull-back), dribble back ' +
      'and hand over to the next player. When the whole team has gone, everyone does the ' +
      'next player’s trick in the next round. How many tricks can your team learn?',
    focus: 'Clear tricks done well beat messy ones done fast.',
    easier: 'Everyone picks the same simple trick.',
    harder: 'Add a second cone and a second trick, or use only your weaker foot.',
  },
  {
    id: 'creativity-shot-styles',
    name: 'Shot Styles',
    skill: 'creativity',
    also: ['finishing'],
    players: [1, 4],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    noTwists: ['handicap', 'roles'],
    setup:
      'Use a goal or a wall target. Mark a shooting spot 8 big steps away and check there ' +
      'is nothing breakable nearby.',
    howToPlay:
      'Take shots using different parts of your foot: instep, laces, inside, or outside. ' +
      'Try different run-ups and body shapes. Keep a note of which styles hit the target ' +
      'most. After 12 shots, choose your two favourites and use them for 8 more.',
    focus: 'Experiment and notice what works. Be curious, not perfect.',
    easier: 'Stand closer and aim at a big target.',
    harder: 'Keep the same style but start from a moving ball.',
  },
  {
    id: 'creativity-story-dribble',
    name: 'Story Dribble',
    skill: 'creativity',
    also: ['dribbling'],
    players: [1, 6],
    ages: [8, 10],
    level: 'beginner',
    minutes: 10,
    noTwists: ['pace', 'streak', 'handicap'],
    setup: 'Everyone has a ball inside a marked space about 12 big steps wide.',
    howToPlay:
      'One player tells a short story, and everyone acts it out with their ball: “We sneak ' +
      'through the jungle (slow, tiny touches), a lion appears (stop!), then we race away ' +
      '(fast dribble) and jump over a river (big touch).” Take turns telling stories. Be as ' +
      'silly as you like.',
    focus: 'Show the story with your dribbling. The ball goes where the story goes.',
    easier: 'Keep stories short, and use only two actions.',
    harder: 'Add a rule that every action has to use a different part of the foot.',
  },
  {
    id: 'creativity-surprise-pass',
    name: 'Surprise Pass',
    skill: 'creativity',
    also: ['passing', 'vision'],
    players: [3, 6],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Mark a square 10 big steps wide with a cone defender in the middle. The players stand ' +
      'around the square with one ball.',
    howToPlay:
      'Pass the ball around the square, but not in the obvious way. Try passes with the ' +
      'outside of your foot, with a fake first, or a pass to the player on the other side ' +
      'of the cone. A pass that surprises the group (they agree) earns a point.',
    focus: 'A surprise only counts if it still reaches the teammate. Be creative and accurate.',
    easier: 'Take one touch before you pass.',
    harder: 'Play in one touch, or add a second cone.',
  },
  {
    id: 'creativity-skills-showcase',
    name: 'Skills Showcase',
    skill: 'creativity',
    also: ['teamwork'],
    players: [4, 12],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'The group stands in a circle with a ball each, or shares a few balls. There is no ' +
      'winner and no score.',
    howToPlay:
      'Take turns being the teacher. The teacher shows one move, slowly, and everyone else ' +
      'copies it for 30 seconds. Then the next player teaches a different move. The aim is ' +
      'for everyone to leave knowing at least three new moves. Say thank you to each teacher.',
    focus: 'Teach clearly and kindly. Learn from everyone, and cheer for every try.',
    easier: 'Teach moves you already know really well.',
    harder: 'Link the group’s moves into one routine that everyone can do together.',
  },
  {
    id: 'creativity-invent-a-game',
    name: 'Invent a Game',
    skill: 'creativity',
    also: ['teamwork', 'vision'],
    players: [3, 10],
    ages: [8, 18],
    level: 'beginner',
    minutes: 15,
    noTwists: ['roles'],
    setup: 'Gather a ball, a few cones and three or more friends. You have 5 minutes to plan.',
    howToPlay:
      'Together, design a new game with three rules: how you score, one rule about feet or ' +
      'touches, and one rule that keeps everyone involved. Play it for 3 minutes. Then change ' +
      'one rule and play again. Everyone gets a say and nobody is ever out. Give your game a ' +
      'name and teach it to someone else.',
    focus: 'Listen to every idea. The best rules are fair, fun and give everyone lots of touches.',
    easier: 'Start from a game you know and change just one rule.',
    harder: 'Design a game that practises one skill, like scanning or your first touch.',
  },
];
