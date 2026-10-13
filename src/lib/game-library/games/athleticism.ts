import { GENTLE_PRACTICE } from '@/lib/game-library/no-twists';
import type { LibraryGame } from '@/types';

export const ATHLETICISM_GAMES: LibraryGame[] = [
  {
    id: 'athleticism-warm-up-wizard',
    name: 'Warm-Up Wizard',
    skill: 'athleticism',
    players: [1, 16],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: GENTLE_PRACTICE,
    setup:
      'Find a flat, clear space about 15 big steps long. Wear your normal football shoes ' +
      'and have a drink nearby. A ball is optional.',
    howToPlay:
      'Do each move for one length of the space: easy jog, side shuffle, high knees, ' +
      'walking lunges, karaoke steps (crossing one leg over the other), then three smooth ' +
      'sprints at about half speed. Finish with leg swings and slow hip circles. Your coach ' +
      'may know the FIFA 11+ Kids warm-up too. Ask them to teach it to you.',
    focus: 'Start slowly and build up. Your muscles are ready when you feel warm, not tired.',
    easier: 'Take it at walking pace and skip the sprints.',
    harder: 'Do each move with a ball at your feet.',
  },
  {
    id: 'athleticism-ladder-flow',
    name: 'Ladder Flow',
    skill: 'athleticism',
    also: ['dribbling'],
    players: [1, 4],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['streak', 'space', 'touches', 'call', 'target', 'roles'],
    setup:
      'Draw a ladder on the ground with chalk, or lay out two ropes with eight “rungs” ' +
      'about a big step apart. Use flat grass or a mat.',
    howToPlay:
      'Move through the ladder with quick feet: one foot in each rung, then two feet in each ' +
      'rung, then side steps. Do each pattern 3 times, resting between runs. Try to be ' +
      'quick, light and tidy. With friends, copy each other’s patterns.',
    focus: 'Stay on the balls of your feet, with quick, tiny steps and your head up.',
    easier: 'Walk through the ladder first.',
    harder: 'Add a ball and dribble through with small touches.',
  },
  {
    id: 'athleticism-balance-and-pass',
    name: 'Balance and Pass',
    skill: 'athleticism',
    also: ['passing', 'first-touch'],
    players: [1, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    noTwists: ['pace', 'space', 'handicap', 'roles'],
    setup: 'Stand 3 big steps from a wall with space around you, on a flat, dry surface.',
    howToPlay:
      'Stand on one leg and pass the ball to the wall with the other foot. Control the ' +
      'rebound and pass again, still on one leg. Do 10 passes, then switch legs. If your foot ' +
      'touches the ground, just set again and keep counting.',
    focus: 'Keep your standing knee slightly bent and your eyes on the ball, not on your feet.',
    easier: 'Hold a wall or a friend’s hand for balance.',
    harder: 'Stand on a folded towel, or close your eyes for one second between passes.',
  },
  {
    id: 'athleticism-cone-shuttles',
    name: 'Cone Shuttles',
    skill: 'athleticism',
    players: [1, 6],
    ages: [10, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['streak', 'touches', 'call', 'target'],
    setup:
      'Put four cones in a line, 5 big steps apart. Start at the first cone. Have some ' +
      'water close by and plenty of space around you.',
    howToPlay:
      'Sprint to the second cone and back, then to the third and back, then to the fourth ' +
      'and back. Walk for a minute, then go again. Do 3 or 4 rounds and compare your times. ' +
      'In a group, race against your own time, not against each other.',
    focus: 'Touch the cone, turn quickly on the outside foot and push off hard.',
    easier: 'Jog the shuttles and rest for longer.',
    harder: 'Dribble the ball through the shuttles.',
  },
  {
    id: 'athleticism-hop-overs',
    name: 'Hop Overs',
    skill: 'athleticism',
    players: [1, 4],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 8,
    noTwists: GENTLE_PRACTICE,
    setup:
      'Lay out five very low obstacles (rolled-up towels or flat markers, no taller than a ' +
      'hand) in a row, about 2 big steps apart, on soft grass.',
    howToPlay:
      'Hop over each obstacle with two feet together and land softly, with your knees bent ' +
      'and your chest up. Do a full row, rest, and do it again for 5 rounds. Then try side-to-' +
      'side hops. Stop if your legs feel tired or sore.',
    focus:
      'Land softly, like a cat. Bend your knees and keep them pointing the same way as your toes.',
    easier: 'Step over the obstacles instead of hopping.',
    harder: 'Hop on one leg, or add a ball dribble at the end of the row.',
  },
  {
    id: 'athleticism-shadow-chase',
    name: 'Shadow Chase',
    skill: 'athleticism',
    also: ['defending-1v1'],
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    noTwists: ['streak', 'call', 'target', 'handicap'],
    setup:
      'Mark a square about 10 big steps wide on soft grass. Each of you has a bib tucked ' +
      'loosely into your waistband, like a tail.',
    howToPlay:
      'Move around the square and try to touch your partner’s bib with your hand, without ' +
      'pulling or pushing. When you touch it, you both stop for a second and swap who ' +
      'chases. Keep a count of how many touches you each made in two minutes.',
    focus: 'Change speed and direction suddenly, and look where your partner is going.',
    easier: 'Walk fast instead of running.',
    harder: 'Do it with a ball at your feet.',
  },
  {
    id: 'athleticism-freeze-frame',
    name: 'Freeze Frame',
    skill: 'athleticism',
    also: ['dribbling', 'teamwork'],
    players: [3, 16],
    ages: [8, 12],
    level: 'beginner',
    minutes: 10,
    noTwists: ['pace', 'streak', 'talk', 'target'],
    setup:
      'Mark a space about 15 big steps wide. Everyone has a ball. One person is the leader ' +
      'and stands at one edge.',
    howToPlay:
      'When the leader shouts “go!”, everyone dribbles around. When the leader shouts ' +
      '“freeze!”, everyone stops the ball dead and stands like a statue. The leader also calls ' +
      '“slow motion” and “super speed”. Swap the leader every minute. Nobody is ever out. Every ' +
      'player keeps playing the whole time.',
    focus: 'Listen for the call, but keep your head up and watch for other players.',
    easier: 'Use only go and freeze.',
    harder: 'Add “turn!” (change direction) and “jump!” (a small hop over the ball).',
  },
  {
    id: 'athleticism-dribble-tag',
    name: 'Dribble Tag',
    skill: 'athleticism',
    also: ['dribbling'],
    players: [4, 16],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['streak', 'target', 'handicap'],
    setup:
      'Mark a space about 15 big steps wide. Everyone has a ball. Pick two or three ' +
      'taggers, who wear bibs.',
    howToPlay:
      'Taggers dribble and try to touch other players on the arm with two fingers, gently. ' +
      'If you are tagged, do 5 toe taps on your ball and rejoin the game. Swap taggers every ' +
      'minute. Always look up and never run into anyone.',
    focus: 'Keep your head up. Use the space and watch where everyone is going.',
    easier: 'Walk fast instead of running.',
    harder: 'Taggers must tag with their weaker foot touching the ball first.',
  },
  {
    id: 'athleticism-stick-the-landing',
    name: 'Stick the Landing',
    skill: 'athleticism',
    players: [1, 1],
    ages: [10, 18],
    level: 'beginner',
    minutes: 8,
    noTwists: GENTLE_PRACTICE,
    setup:
      'Mark a line on flat, soft grass. Put a cone or a marker 2 big steps in front of ' +
      'the line to jump towards.',
    howToPlay:
      'Jump forward off two feet and land softly on two feet with your knees bent, hips ' +
      'back and chest up. Hold the landing for two seconds like a statue. Do 8 jumps, ' +
      'then try 8 more landing on one foot. Rest between sets.',
    focus: 'Land quietly, with your knees over your toes. A silent landing is a good one.',
    easier: 'Jump a shorter distance.',
    harder: 'Jump and turn a quarter turn in the air before you land.',
  },
  {
    id: 'athleticism-sprint-pyramid',
    name: 'Sprint Pyramid',
    skill: 'athleticism',
    players: [1, 4],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 10,
    noTwists: ['streak', 'space', 'touches', 'call', 'target'],
    setup:
      'Mark five lines 5, 10, 15, 20 and 25 big steps from a start line, on flat, dry grass. ' +
      'Bring water and wear shoes with good grip.',
    howToPlay:
      'Sprint to the first line and walk back, then to the second and walk back, and so on ' +
      'up to the fifth. Then work back down. Walk back slowly to recover, and take a full ' +
      'break if you need one. Compare your total time with last time.',
    focus: 'Drive your arms and push off the ground. Fast starts matter more than top speed.',
    easier: 'Jog the shorter lines and sprint only the last two.',
    harder: 'Start each sprint from a push-start or a quick turn.',
  },
  {
    id: 'athleticism-foot-tennis',
    name: 'Foot Tennis',
    skill: 'athleticism',
    also: ['first-touch'],
    players: [2, 4],
    ages: [8, 14],
    level: 'beginner',
    minutes: 10,
    noTwists: ['handicap', 'roles'],
    setup:
      'Mark a line on the ground, or tie a rope no higher than your knee between two ' +
      'chairs, across a space about 8 big steps long.',
    howToPlay:
      'Serve the ball over the line to your partner, who lets it bounce once and returns it ' +
      'with their foot. Keep the rally going and count your best rally together. If you want ' +
      'a challenge, play in teams, but cheer for good shots on both sides.',
    focus: 'Soft touches, quick feet and good balance. Keep your eyes on the ball.',
    easier: 'Allow two bounces.',
    harder: 'Allow no bounce, or raise the line a little.',
  },
];
