import type { LibraryGame } from '@/types';

export const FIRST_TOUCH_GAMES: LibraryGame[] = [
  {
    id: 'first-touch-wall-wizard',
    name: 'Wall Wizard',
    skill: 'first-touch',
    players: [1, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    noTwists: ['roles'],
    setup:
      'Find a solid wall with nothing breakable nearby. Mark a box about 3 big steps wide, ' +
      '5 big steps back from the wall.',
    howToPlay:
      'Pass the ball firmly at the wall. As it comes back, use your first touch to stop it ' +
      'inside the box. Every ball that stops in the box scores a point. Race to 10, then try ' +
      'to beat your time. With a friend, take turns and add your scores together.',
    focus: 'Use a soft foot, like catching an egg. Watch the ball all the way onto your foot.',
    easier: 'Make the box bigger and stand closer to the wall.',
    harder: 'Shrink the box, or stand further back so the ball comes back faster.',
  },
  {
    id: 'first-touch-bounce-and-control',
    name: 'Bounce and Control',
    skill: 'first-touch',
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    noTwists: ['foot'],
    setup:
      'Use a flat patch of grass. Set two cones or shoes about 3 big steps apart as a gate, ' +
      '5 big steps in front of you.',
    howToPlay:
      'Throw the ball gently up and let it bounce once. Control it with your foot, thigh or ' +
      'chest (no hands!), then dribble it through the gate. Do 10 throws and count how many ' +
      'times you get through.',
    focus: 'Give with the ball: let your body drop away at the moment it touches you.',
    easier: 'Use a bigger gate, or let the ball bounce twice before you control it.',
    harder: 'Control it with your weaker foot, or add a second gate to dribble through.',
  },
  {
    id: 'first-touch-juggling-ladder',
    name: 'Juggling Ladder',
    skill: 'first-touch',
    also: ['creativity'],
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup: 'Find a soft, flat space. Count out loud so you can see yourself getting better.',
    howToPlay:
      'Climb the ladder one rung at a time. Rung 1: drop the ball from your hands, kick it up ' +
      'once and catch it. Rung 2: two touches, then catch. Add a touch each time you manage ' +
      'a rung twice in a row. If the ball drops, just step back down one rung and carry on.',
    focus: 'Small, soft touches that keep the ball around waist height. Eyes on the ball.',
    easier: 'Let the ball bounce once between touches.',
    harder: 'Swap feet on every touch, or add a thigh touch between each foot touch.',
  },
  {
    id: 'first-touch-pointer-touch',
    name: 'Pointer Touch',
    skill: 'first-touch',
    also: ['vision'],
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Stand about 8 big steps from your partner. Mark your starting spot with a shoe or a ' +
      'cone.',
    howToPlay:
      'Your partner passes to you. While the ball is rolling, they point left or right. Use ' +
      'your first touch to move the ball 2 big steps that way and stop it. Do 10 passes, then ' +
      'swap. Every touch that ends with the ball under control scores a point.',
    focus: 'Stay on your toes with your body open, and look up while the pass travels.',
    easier: 'Your partner points before they pass, so you know where to go.',
    harder: 'Your partner points as late as they can, or you touch it into a small square.',
  },
  {
    id: 'first-touch-square-catch',
    name: 'Square Catch',
    skill: 'first-touch',
    players: [2, 4],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Mark a square about 2 big steps wide on the ground. The passer stands about 6 big ' +
      'steps away from the receiver, who stands next to the square.',
    howToPlay:
      'Pass so the ball arrives near the receiver. They control it with one touch so it stops ' +
      'inside the square, which scores a point. After 6 passes, swap. In a group of 3 or 4, ' +
      'pass, then run to the back of the line.',
    focus: 'Pull your foot back as the ball arrives to take the pace off it.',
    easier: 'Make the square bigger and pass slowly along the ground.',
    harder: 'Make the square smaller, or pass faster with a little bounce.',
  },
  {
    id: 'first-touch-chest-thigh-foot',
    name: 'Chest, Thigh, Foot',
    skill: 'first-touch',
    players: [2, 6],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    noTwists: ['handicap', 'foot', 'players'],
    setup:
      'Stand about 4 big steps from a partner on soft grass. Use a ball that is a little ' +
      'soft, so it is easy to control.',
    howToPlay:
      'Your partner gently throws the ball underarm, no higher than your chest, so it drops ' +
      'towards you. Call out chest, thigh or foot before it lands, then control it with that ' +
      'part and let it fall to your feet. Do 8 throws, then swap. In a group, rotate after every ' +
      'go.',
    focus: 'Be a cushion: relax the part of your body that touches the ball and let it drop.',
    easier: 'Let the ball bounce once first, or only use your foot and thigh.',
    harder: 'Your partner calls the body part just as the ball leaves their hands.',
  },
  {
    id: 'first-touch-shadow-receiver',
    name: 'Shadow Receiver',
    skill: 'first-touch',
    also: ['vision'],
    players: [3, 3],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'One passer, one receiver and one shadow. The passer stands about 8 big steps from the ' +
      'receiver, and the shadow stands one big step behind the receiver.',
    howToPlay:
      'The passer plays to the receiver. The shadow steps up as the ball arrives but does not ' +
      'tackle. The receiver looks over their shoulder first, takes a first touch away from ' +
      'the shadow and passes back. Swap roles every 5 passes.',
    focus: 'Scan before the ball arrives, so your first touch goes away from the defender.',
    easier: 'The shadow starts two steps back and only walks.',
    harder: 'After the first touch, the shadow may try to win the ball fairly.',
  },
  {
    id: 'first-touch-control-circuit',
    name: 'Control Circuit',
    skill: 'first-touch',
    also: ['passing'],
    players: [4, 12],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup: 'Make a circle about 10 big steps across with a player on every spot, and one ball.',
    howToPlay:
      'Pass across the circle to anyone. The receiver controls the ball with one touch and ' +
      'passes it on with the next. How many passes can your group make in a row without the ' +
      'ball stopping or leaving the circle? Add a second ball when you reach 20.',
    focus: 'Call for the ball and get your first touch ready before it arrives.',
    easier: 'Allow three touches, or make the circle smaller.',
    harder: 'Add a second ball, or only pass to someone who is not next to you.',
  },
  {
    id: 'first-touch-receive-on-the-run',
    name: 'Receive on the Run',
    skill: 'first-touch',
    also: ['movement'],
    players: [4, 8],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Make two lines facing each other about 12 big steps apart, offset a little so passes go ' +
      'diagonally. Put a cone 4 big steps in front of each line. Players waiting keep their feet ' +
      'moving.',
    howToPlay:
      'The first player in a line passes diagonally across and runs after the pass. The receiver ' +
      'moves towards the ball and takes a first touch forward past the cone. Then dribble ' +
      'across, pass to the other line and join the back of it. Look before you run, and wait ' +
      'until the pass has been played before you cross.',
    focus: 'Receive with your far foot so your body opens up and you can move forward.',
    easier: 'Pass slowly, or skip the cone and just control and pass.',
    harder: 'Pass harder, or make the receiver check away before coming to the ball.',
  },
  {
    id: 'first-touch-spin-cycle',
    name: 'Spin Cycle',
    skill: 'first-touch',
    players: [1, 1],
    ages: [12, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Stand about 4 big steps from a wall with clear space around you. Put a cone 3 big ' +
      'steps behind you as a finish line.',
    howToPlay:
      'Pass the ball at the wall. As it comes back, use your first touch to turn your body ' +
      'and move the ball away to one side. Take two quick dribbles, then reset and go again. ' +
      'Try 10 turns, 5 each way.',
    focus: 'Turn your hips as the ball arrives, so the touch and the turn happen together.',
    easier: 'Stop the ball first, then turn. Build up to doing both in one touch.',
    harder: 'Sprint to the cone after every turn, then walk back and rest.',
  },
  {
    id: 'first-touch-across-the-body',
    name: 'Across the Body',
    skill: 'first-touch',
    also: ['vision'],
    players: [2, 2],
    ages: [13, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Stand about 8 big steps from your partner. Put a gate (two cones, 2 big steps apart) ' +
      '4 big steps to one side of you.',
    howToPlay:
      'Your partner passes to you at an angle. Receive it with your far foot and take it ' +
      'across your body, through your gate, in one touch, then pass back. Do 10, then swap. A ' +
      'point for each clean touch through the gate.',
    focus: 'Open your hips and use your far foot, so you face the pitch and can see more.',
    easier: 'Pass slowly along the ground, and make the gate wider.',
    harder: 'Pass faster, or have your partner choose which side the gate is on.',
  },
];
