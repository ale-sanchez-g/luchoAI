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
      'Do each move for one length of the space: easy jog, side shuffle, high knees, walking ' +
      'lunges, karaoke steps (crossing one leg over the other), then three build-up runs, each a ' +
      'little faster than the last but never flat out. Finish with leg swings and slow hip ' +
      'circles. Ask your coach to teach you a warm-up made to help prevent injuries.',
    focus: 'Start slowly and build up. Your muscles are ready when you feel warm, not tired.',
    easier: 'Take it at walking pace and skip the sprints.',
    harder: 'Do the jog, shuffle and high knees with a ball at your feet.',
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
    setup: 'Stand 5 big steps from a wall with space around you, on flat, dry grass or a mat.',
    howToPlay:
      'Stand on one leg and pass the ball to the wall with the other foot. Control the ' +
      'rebound and pass again, still on one leg. Do 10 passes, then switch legs. If your foot ' +
      'touches the ground, just set again and keep counting.',
    focus: 'Keep your standing knee slightly bent and your eyes on the ball, not on your feet.',
    easier: 'Rest a hand on a fence or hold a friend’s hand for balance.',
    harder:
      'Aim at a small spot on the wall, or hold your finish pose for a count of two after every ' +
      'pass.',
  },
  {
    id: 'athleticism-cone-shuttles',
    name: 'Cone Shuttles',
    skill: 'athleticism',
    players: [1, 6],
    ages: [10, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['streak', 'touches', 'call', 'target', 'pace', 'handicap', 'roles', 'rules'],
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
    harder: 'Once you land quietly every time, hop on one leg or dribble at the end of the row.',
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
      'Mark a square about 15 big steps wide on soft grass. Each of you tucks a bib firmly into ' +
      'the side of your waistband, with a little showing.',
    howToPlay:
      'Move around the square and try to touch your partner’s bib with your hand, without ' +
      'pulling or pushing. Slow to a jog when you get close. When you touch it, you both stop ' +
      'for a second and swap who chases. Keep a count of how many touches you each made in two ' +
      'minutes.',
    focus: 'Change speed and direction suddenly, and look where your partner is going.',
    easier: 'Walk fast instead of running.',
    harder: 'Do it with a ball at your feet.',
  },
  {
    id: 'athleticism-freeze-frame',
    name: 'Freeze Frame',
    skill: 'athleticism',
    also: ['dribbling', 'teamwork'],
    players: [3, 12],
    ages: [8, 12],
    level: 'beginner',
    minutes: 10,
    noTwists: ['pace', 'streak', 'talk', 'target'],
    setup:
      'Mark a space about 15 big steps wide, or 20 if there are more than 8 players. Everyone ' +
      'has a ball. One person is the leader and stands at one edge.',
    howToPlay:
      'When the leader shouts “go!”, everyone dribbles around. When the leader shouts ' +
      '“freeze!”, everyone stops the ball dead and stands like a statue. The leader also calls ' +
      '“slow motion” and “super speed”. Swap the leader every minute. Nobody is ever out. Every ' +
      'player keeps playing the whole time.',
    focus: 'Listen for the call, but keep your head up and watch for other players.',
    easier: 'Use only go and freeze.',
    harder: 'Add “turn!” (change direction) and “taps!” (five quick toe taps on top of the ball).',
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
      'Mark a space about 20 big steps wide (bigger if there are more than 8 players). ' +
      'Everyone has a ball. Pick two or three taggers, who wear bibs.',
    howToPlay:
      'Everyone dribbles at a jog. Taggers try to touch another player’s arm with two fingers, ' +
      'gently, and never push or grab. If you are tagged, take a quick ball-skills break (5 toe ' +
      'taps on your ball) and rejoin. Swap taggers every minute. Always look up and never run ' +
      'into anyone: stop the game if players are bumping.',
    focus: 'Keep your head up. Use the space and watch where everyone is going.',
    easier: 'Walk fast instead of jogging.',
    harder: 'Taggers must have their weaker foot touch the ball just before each tag.',
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
      'Mark a line on flat, soft grass. Put a cone or a marker 1 big step in front of the line ' +
      'to jump towards.',
    howToPlay:
      'Jump forward off two feet and land softly on two feet with your knees bent, hips back and ' +
      'chest up. Hold the landing for two seconds like a statue. Do 8 jumps. Once your landings ' +
      'are steady, try 4 more landing on one foot. Rest between sets.',
    focus: 'Land quietly, with your knees over your toes. A silent landing is a good one.',
    easier: 'Jump a shorter distance.',
    harder: 'Hold each landing for four seconds. Never jump your very furthest.',
  },
  {
    id: 'athleticism-sprint-pyramid',
    name: 'Sprint Pyramid',
    skill: 'athleticism',
    players: [1, 4],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 10,
    noTwists: [
      'streak',
      'space',
      'touches',
      'call',
      'target',
      'pace',
      'handicap',
      'roles',
      'rules',
    ],
    setup:
      'Mark five lines 5, 10, 15, 20 and 25 big steps from a start line, on flat, dry grass. ' +
      'Bring water and wear shoes with good grip.',
    howToPlay:
      'Warm up first. Sprint to the first line and walk back, then to the second and walk back, ' +
      'and so on up to the fifth. Then work back down. Rest until your breathing is easy before ' +
      'every sprint. On hot days, do fewer lines, in the shade. Compare your best sprints with ' +
      'last time, not your total time.',
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
      'Lay a rope or a line of cones flat on the ground across a space about 8 big steps long.',
    howToPlay:
      'Serve the ball over the line to your partner, who lets it bounce once and returns it with ' +
      'their foot. Keep the rally going and count your best rally together. If you want a ' +
      'challenge, play in teams, but cheer for good shots on both sides. Keep the ball below ' +
      'your waist: feet and thighs only, never your head or your hands.',
    focus: 'Soft touches, quick feet and good balance. Keep your eyes on the ball.',
    easier: 'Allow two bounces.',
    harder: 'Allow one touch each, or use only your weaker foot.',
  },
];
