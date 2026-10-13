import type { LibraryGame } from '@/types';

export const GOALKEEPING_GAMES: LibraryGame[] = [
  {
    id: 'goalkeeping-wall-catch',
    name: 'Wall Catch',
    skill: 'goalkeeping',
    players: [1, 1],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    setup: 'Stand about 4 big steps from a solid wall with nothing breakable nearby.',
    howToPlay:
      'Throw the ball at the wall and catch the rebound with two hands. Count how many ' +
      'catches you make in a row. Then mix it up: throw it low, at chest height, and above ' +
      'your head. Start again whenever you drop it, and see if you can beat your count.',
    focus: 'Make a “W” with your hands: thumbs close together behind the ball, fingers spread.',
    easier: 'Stand closer and throw gently.',
    harder: 'Stand further back, or throw so the ball comes back to one side.',
  },
  {
    id: 'goalkeeping-ready-and-shuffle',
    name: 'Ready and Shuffle',
    skill: 'goalkeeping',
    also: ['athleticism'],
    players: [1, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    setup:
      'Place three cones in a line, 3 big steps apart, as if they were the posts and middle ' +
      'of a goal. Stand in the middle, in a ready position.',
    howToPlay:
      'Shuffle sideways to the left cone and back, then to the right cone and back, always ' +
      'facing forward and never crossing your feet. Do 30 seconds, rest and repeat 5 times. ' +
      'With a friend, they point and you shuffle to the cone they point at.',
    focus: 'Ready position: feet shoulder-width apart, knees bent, hands up, weight on your toes.',
    easier: 'Go slowly and focus on balance.',
    harder: 'React to a friend pointing at random, or move the cones further apart.',
  },
  {
    id: 'goalkeeping-tennis-reflex',
    name: 'Tennis Ball Reflex',
    skill: 'goalkeeping',
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    setup:
      'You need a tennis ball (or another soft ball). The keeper stands 4 big steps from a ' +
      'partner or from a wall, with space around them.',
    howToPlay:
      'Your partner throws the tennis ball underarm to different spots: low left, low right, ' +
      'chest height and above your head. Catch each one with two hands. Count catches out of ' +
      '10, then swap. If there is no partner, bounce the ball off a wall and catch it.',
    focus: 'Watch the ball, get your hands to it early and catch it with soft, giving hands.',
    easier: 'Throw slowly and to the middle.',
    harder: 'Throw faster, or call out “left” or “right” just as you throw.',
  },
  {
    id: 'goalkeeping-corner-saves',
    name: 'Corner Saves',
    skill: 'goalkeeping',
    players: [2, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Mark a goal with two cones about 6 big steps apart. The thrower stands 6 big steps ' +
      'in front, with a ball. The keeper starts in the middle of the goal.',
    howToPlay:
      'The thrower rolls or throws the ball low towards a corner. The keeper takes side ' +
      'steps and gets their body behind the ball to save it. Do 10 throws, count the saves ' +
      'and then swap. Everyone plays in goal and everyone throws.',
    focus: 'Move your feet first, then get your body and hands behind the ball.',
    easier: 'Roll the ball along the ground and slowly.',
    harder: 'Make the goal wider, or throw from further back and faster.',
  },
  {
    id: 'goalkeeping-soft-landings',
    name: 'Soft Landings',
    skill: 'goalkeeping',
    also: ['athleticism'],
    players: [1, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 10,
    setup:
      'Use soft, flat grass or a gym mat with nothing hard around it. A friend can roll a ' +
      'ball to you, or you can hold the ball yourself.',
    howToPlay:
      'Start on your knees. Reach out to a ball placed beside you, and fall gently onto your ' +
      'side, hugging the ball to your chest. Once that feels easy, try it from a crouch, ' +
      'then from standing. Do 5 goes on each side, and stop if anything feels sore.',
    focus: 'Land on the side of your body, not on your elbows or knees, and keep the ball tight.',
    easier: 'Stay on your knees and just roll sideways.',
    harder: 'Have a friend roll the ball a metre to the side so you reach for it.',
  },
  {
    id: 'goalkeeping-throw-accuracy',
    name: 'Throw Accuracy',
    skill: 'goalkeeping',
    also: ['passing'],
    players: [1, 2],
    ages: [8, 18],
    level: 'beginner',
    minutes: 8,
    setup:
      'Put three targets (cones or bottles) at 8, 12 and 16 big steps away. Stand behind a ' +
      'line with the ball in your hand.',
    howToPlay:
      'Throw the ball (rolling, underarm or overarm) to try to land it near each target. ' +
      'Land it within a big step of the target for 1 point. Take 5 throws at each target and ' +
      'add up your score. Beat your total next time.',
    focus: 'Roll for short, throw overarm for long, and step towards your target.',
    easier: 'Use the closest target and a bigger landing zone.',
    harder: 'Move the targets further away, or throw with your weaker arm.',
  },
  {
    id: 'goalkeeping-kick-zones',
    name: 'Kick Zones',
    skill: 'goalkeeping',
    also: ['passing'],
    players: [1, 2],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Mark three zones, each about 5 big steps wide, at 15, 25 and 35 big steps from you. ' +
      'Stand behind a line with a ball on the ground.',
    howToPlay:
      'Kick the ball from the ground, aiming to land it inside each zone: 1 point for the ' +
      'closest, 2 for the middle, 3 for the furthest. Take 5 kicks at each zone, and then add ' +
      'up your points. Try both feet.',
    focus: 'Lean slightly over the ball, point your toe down and follow through to the target.',
    easier: 'Make the zones bigger, or kick from closer.',
    harder: 'Make the zones smaller, or kick from a rolling ball.',
  },
  {
    id: 'goalkeeping-shot-parade',
    name: 'Shot Parade',
    skill: 'goalkeeping',
    also: ['finishing'],
    players: [3, 8],
    ages: [10, 18],
    level: 'intermediate',
    minutes: 12,
    setup:
      'Use a goal with a goalkeeper. Mark a shooting line 10 big steps away. Shooters wait ' +
      'in a line next to it with a ball each, and keep their own balls busy while they wait.',
    howToPlay:
      'Shooters take turns shooting low, firm shots at the goal. The goalkeeper saves what ' +
      'they can. After 5 shots, the next player takes over in goal, and the keeper joins the ' +
      'shooters. Everyone keeps their own save count and tries to beat it.',
    focus: 'Set your feet before each shot, and move your whole body behind the ball.',
    easier: 'Shoot from further back and aim for the middle.',
    harder: 'Shoot to the corners, or make the shot come from a short pass.',
  },
  {
    id: 'goalkeeping-double-trouble',
    name: 'Double Trouble',
    skill: 'goalkeeping',
    also: ['finishing'],
    players: [6, 12],
    ages: [8, 18],
    level: 'beginner',
    minutes: 12,
    setup:
      'Make two small goals about 20 big steps apart. Put a goalkeeper in each goal. Split ' +
      'the others into two teams of shooters, and give each team a ball.',
    howToPlay:
      'Teams take turns shooting at the goal at the other end. Keepers save what they can ' +
      'and roll the ball back to the other team. A goal is 1 point, a save is 1 point for ' +
      'the keeper’s team. Swap keepers every 3 minutes so everyone gets a turn.',
    focus: 'Keepers: stay on your toes and watch every shot, even the far ones.',
    easier: 'Make the goals wider.',
    harder: 'Make the goals smaller, or the shots must be on the ground.',
  },
  {
    id: 'goalkeeping-start-the-attack',
    name: 'Start the Attack',
    skill: 'goalkeeping',
    also: ['transitions', 'passing'],
    players: [2, 6],
    ages: [11, 18],
    level: 'intermediate',
    minutes: 10,
    setup:
      'Use a goal with a keeper. Put two target gates (cones 2 big steps apart) 15 big ' +
      'steps out on each side. A thrower stands in front of the goal with a few balls.',
    howToPlay:
      'The thrower rolls or throws a shot for the keeper to save. As soon as the keeper has ' +
      'the ball, they count to three in their head and then throw or roll it to one of the ' +
      'gates. A point for each save and each accurate distribution. Swap after 8 goes.',
    focus: 'Look up after the save. A quick, accurate throw starts a good attack.',
    easier: 'Take as long as you like to choose a gate.',
    harder: 'Add a cone defender on one side, so the keeper picks the other.',
  },
  {
    id: 'goalkeeping-drop-and-catch',
    name: 'Drop and Catch',
    skill: 'goalkeeping',
    also: ['athleticism'],
    players: [2, 2],
    ages: [8, 14],
    level: 'beginner',
    minutes: 8,
    setup:
      'Stand 3 big steps from a partner on soft grass. One of you holds a tennis ball at ' +
      'shoulder height, and the other has their hands ready by their sides.',
    howToPlay:
      'The holder drops the ball without warning. The catcher darts forward and catches it ' +
      'before it bounces twice. Do 10 drops, then swap. Take one step further back after every ' +
      '5 catches.',
    focus: 'Be on your toes with soft hands, and watch the ball, not your partner.',
    easier: 'Stand closer, or catch it after three bounces.',
    harder: 'Start further back, or use a smaller ball.',
  },
];
