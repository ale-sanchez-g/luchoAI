import type { DecisionTheme, DecisionThemeId } from '@/types';

// Pitch coordinates use a 100 × 75 grid (see PitchDiagram). Your team always attacks up the
// screen, so y = 0 is the end you attack and y = 75 is the end you defend.

export const DECISION_THEMES: DecisionTheme[] = [
  {
    id: 'space',
    emoji: '🏃',
    title: 'Move into Space',
    description: 'Get free from defenders so your teammates can pass to you.',
    scenarios: [
      {
        id: 'space-shadow',
        title: 'Get out of the shadow',
        situation:
          'Your centre-back has the ball. You want it, but a defender is standing right ' +
          'between you and the ball.',
        question: 'Where should you move?',
        scene: {
          you: { x: 50, y: 30 },
          ball: { x: 53, y: 63 },
          teammates: [{ x: 50, y: 66 }],
          opponents: [
            { x: 50, y: 46 },
            { x: 22, y: 22 },
            { x: 80, y: 20 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Run further up the pitch',
            correct: false,
            feedback:
              'The defender is still in the way, and now the pass is even longer and harder.',
            marker: { x: 50, y: 12 },
          },
          {
            id: 'B',
            label: 'Move a few steps to the side',
            correct: true,
            feedback:
              'Now there is a clear line between you and the ball. If you can see the ball, ' +
              'your teammate can pass to you.',
            marker: { x: 70, y: 36 },
          },
          {
            id: 'C',
            label: 'Stay where you are and shout for it',
            correct: false,
            feedback:
              "Shouting louder doesn't move the defender. The pass would be intercepted.",
          },
        ],
        cue: 'Can you see the ball clearly? If a defender is in the way, move until you can.',
      },
      {
        id: 'space-triangle',
        title: 'Make a triangle',
        situation:
          'Your teammate has the ball near the sideline with a defender in front of them. ' +
          'You are standing straight behind your teammate.',
        question: 'Where is the best place to support?',
        scene: {
          you: { x: 16, y: 60 },
          ball: { x: 19, y: 37 },
          teammates: [{ x: 16, y: 40 }],
          opponents: [
            { x: 16, y: 27 },
            { x: 45, y: 32 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Move inside, at an angle',
            correct: true,
            feedback:
              'From an angle your teammate can see you and pass easily, and you get the ball ' +
              'facing forward.',
            marker: { x: 38, y: 54 },
          },
          {
            id: 'B',
            label: 'Stay straight behind them',
            correct: false,
            feedback:
              'In a straight line your teammate has to turn right around to pass to you, and ' +
              "you can't see what's ahead.",
          },
          {
            id: 'C',
            label: 'Run right up next to them',
            correct: false,
            feedback:
              'Too close! One defender can now guard you both, and there is no space to pass ' +
              'into.',
            marker: { x: 26, y: 39 },
          },
        ],
        cue: 'Support at an angle. Make a triangle, not a straight line.',
      },
      {
        id: 'space-between-lines',
        title: 'Find the gap between the lines',
        situation:
          'Your team has the ball. The other team has a line of midfielders and a line of ' +
          'defenders, with a gap between them.',
        question: 'Where is the most dangerous place to get the ball?',
        scene: {
          goal: 'top',
          you: { x: 38, y: 60 },
          ball: { x: 53, y: 65 },
          teammates: [
            { x: 50, y: 68 },
            { x: 12, y: 48 },
            { x: 88, y: 48 },
          ],
          opponents: [
            { x: 25, y: 46 },
            { x: 55, y: 47 },
            { x: 78, y: 46 },
            { x: 22, y: 22 },
            { x: 42, y: 20 },
            { x: 60, y: 20 },
            { x: 80, y: 22 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Right next to one of their defenders',
            correct: false,
            feedback:
              'You are tightly marked there. The defender can step in front and win the ball.',
            marker: { x: 48, y: 26 },
          },
          {
            id: 'B',
            label: 'Drop deep, right next to the passer',
            correct: false,
            feedback:
              "It's safe, but getting the ball there doesn't take your team past anyone.",
            marker: { x: 38, y: 70 },
          },
          {
            id: 'C',
            label: 'In the gap between their midfield and defence',
            correct: true,
            feedback:
              'The most dangerous space on the pitch! From here you can turn and run at their ' +
              'defenders.',
            marker: { x: 40, y: 34 },
          },
        ],
        cue: "Look for the gaps between the lines. That's where you can turn and attack.",
      },
      {
        id: 'space-timing',
        title: 'Time your run',
        situation:
          'Your teammate is trying to control a bouncing ball with their head down. You want ' +
          'to run into the space behind the defender.',
        question: 'When should you make your run?',
        scene: {
          you: { x: 68, y: 48 },
          ball: { x: 37, y: 52 },
          teammates: [{ x: 34, y: 56 }],
          opponents: [
            { x: 64, y: 36 },
            { x: 30, y: 40 },
          ],
          arrows: [{ from: { x: 72, y: 46 }, to: { x: 80, y: 16 }, kind: 'run' }],
        },
        options: [
          {
            id: 'A',
            label: 'Right now, while they are still controlling it',
            correct: false,
            feedback:
              "Too early! They can't pass yet, so the defender just follows you and the space " +
              'closes. You might be offside too.',
          },
          {
            id: 'B',
            label: 'After they have passed to someone else',
            correct: false,
            feedback: 'Too late. The chance has gone.',
          },
          {
            id: 'C',
            label: 'The moment the ball is under control and they look up',
            correct: true,
            feedback:
              'Perfect timing. When the passer looks up, they can see your run and play the ' +
              'ball into the space.',
          },
        ],
        cue: 'Watch the passer: head down means get ready, head up means GO!',
      },
    ],
    pitchGames: [
      {
        name: 'Get Free',
        players: '3 players',
        setup:
          'A passer and a receiver stand about 10 big steps apart. A defender stands in the ' +
          'middle and can only move sideways.',
        howToPlay:
          'The defender tries to block the pass by staying in line between the passer and ' +
          'the receiver. The receiver keeps moving side to side to get a clear line. Every ' +
          'pass that gets through is a point. Swap roles after 5 passes.',
        focus: 'Receiver: can you see the ball past the defender? If not, move!',
        harder: 'Give the receiver only 3 seconds to get free.',
      },
      {
        name: 'Rondo: Find the Gap',
        players: '5+ players',
        setup:
          'Mark a square about 10 big steps wide. Four players stand on the sides, with one ' +
          'defender in the middle.',
        howToPlay:
          'Keep the ball away from the defender by passing around the square. Players ' +
          'without the ball slide along their side so the defender is never blocking the pass ' +
          'to them. 6 passes in a row scores a point. If the defender touches the ball, they ' +
          'swap with the player who lost it.',
        focus: 'Get open before your teammate receives the ball, not after.',
        harder: 'Add a second defender, or allow only two touches each.',
      },
    ],
  },
  {
    id: 'first-touch',
    emoji: '👟',
    title: 'First Touch',
    description: 'Decide where your first touch goes before the ball arrives.',
    scenarios: [
      {
        id: 'touch-away-from-pressure',
        title: 'Away from pressure',
        situation:
          'A pass is coming to you. A defender is running at you from your left. There is ' +
          'lots of space on your right.',
        question: 'Where should your first touch go?',
        scene: {
          you: { x: 50, y: 40 },
          ball: { x: 50, y: 56 },
          teammates: [{ x: 50, y: 70 }],
          opponents: [{ x: 27, y: 35 }],
          arrows: [
            { from: { x: 50, y: 66 }, to: { x: 50, y: 45 }, kind: 'pass' },
            { from: { x: 30, y: 36 }, to: { x: 41, y: 39 }, kind: 'run' },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'To your left',
            correct: false,
            feedback: "That's towards the defender, so you'd be giving them the ball.",
            marker: { x: 39, y: 30 },
          },
          {
            id: 'B',
            label: 'Stop it dead under your foot',
            correct: false,
            feedback:
              'Stopping the ball gives the defender time to arrive and tackle. Keep it moving.',
          },
          {
            id: 'C',
            label: 'To your right, into the space',
            correct: true,
            feedback:
              'Touching it away from the defender gives you time and space for your next move.',
            marker: { x: 63, y: 33 },
          },
        ],
        cue: 'Know where the defender is BEFORE the ball arrives, then touch it away from them.',
      },
      {
        id: 'touch-protect',
        title: 'Defender on your back',
        situation:
          'You are facing your own goal to receive a pass. A defender is right behind you, ' +
          'really close.',
        question: 'What should you do with your first touch?',
        scene: {
          you: { x: 50, y: 42 },
          ball: { x: 38, y: 55 },
          teammates: [{ x: 30, y: 64 }],
          opponents: [
            { x: 50, y: 35.5 },
            { x: 80, y: 24 },
          ],
          arrows: [{ from: { x: 33, y: 61 }, to: { x: 46, y: 46 }, kind: 'pass' }],
        },
        options: [
          {
            id: 'A',
            label: 'Protect it: keep your body between the defender and the ball, then pass back',
            correct: true,
            feedback:
              'Your body is a shield. Keep the ball on the side away from the defender and ' +
              'look for a teammate.',
          },
          {
            id: 'B',
            label: 'Spin and turn straight away',
            correct: false,
            feedback: 'With a defender this close, turning runs you straight into them.',
          },
          {
            id: 'C',
            label: 'Let the ball run through your legs',
            correct: false,
            feedback:
              'A great trick when there is space behind you, but the defender is right there ' +
              'to take it.',
          },
        ],
        cue: 'Defender tight behind you? Protect it or pass it back. Lots of space? Turn!',
      },
      {
        id: 'touch-scan-turn',
        title: 'Scan, then turn',
        situation:
          'Before the pass arrived, you looked over your shoulder. There is no defender near ' +
          'you and lots of space in front.',
        question: 'What is the best first touch?',
        scene: {
          you: { x: 50, y: 46 },
          ball: { x: 37, y: 58.6 },
          teammates: [
            { x: 28, y: 68 },
            { x: 84, y: 30 },
          ],
          opponents: [
            { x: 20, y: 18 },
            { x: 78, y: 14 },
          ],
          arrows: [{ from: { x: 31, y: 65 }, to: { x: 46, y: 49 }, kind: 'pass' }],
        },
        options: [
          {
            id: 'A',
            label: 'Pass it straight back to where it came from',
            correct: false,
            feedback: "Safe, but you had time to turn and attack. That's a chance missed!",
          },
          {
            id: 'B',
            label: 'Open up and take your first touch forward into the space',
            correct: true,
            feedback: 'You looked, you saw space, so your first touch goes forward. Now attack!',
          },
          {
            id: 'C',
            label: 'Stop the ball, then look around',
            correct: false,
            feedback:
              'Looking after the ball arrives is too late. Look first, so your first touch can ' +
              'already go forward.',
          },
        ],
        cue:
          'Scan before you receive. Look over your shoulder so your first touch can go ' +
          'forward.',
      },
      {
        id: 'touch-first-time',
        title: 'The best touch is a pass',
        situation:
          'The ball is coming to you fast. Two defenders are closing you down from both ' +
          'sides, and a teammate is free in space ahead.',
        question: 'What is your best option?',
        scene: {
          you: { x: 46, y: 48 },
          ball: { x: 42.6, y: 62.6 },
          teammates: [
            { x: 40, y: 72 },
            { x: 74, y: 22 },
          ],
          opponents: [
            { x: 32, y: 44 },
            { x: 60, y: 43 },
          ],
          arrows: [
            { from: { x: 41, y: 69 }, to: { x: 45, y: 53 }, kind: 'pass' },
            { from: { x: 35, y: 45 }, to: { x: 41, y: 47 }, kind: 'run' },
            { from: { x: 57, y: 44.5 }, to: { x: 51, y: 47 }, kind: 'run' },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Take a touch and try to dribble past both of them',
            correct: false,
            feedback: 'Two defenders are arriving fast. One touch and they will trap you.',
          },
          {
            id: 'B',
            label: 'Pass it first time to your free teammate',
            correct: true,
            feedback:
              'Sometimes the best first touch is a pass! The ball moves faster than any ' +
              'defender.',
          },
          {
            id: 'C',
            label: 'Take a big touch backwards',
            correct: false,
            feedback: 'They will chase you down, and your free teammate was the better choice.',
          },
        ],
        cue:
          'Know your next move before the ball arrives. Free teammate + pressure = pass ' +
          'first time.',
      },
    ],
    pitchGames: [
      {
        name: 'Call It!',
        players: '2 players',
        setup:
          'Stand about 10 steps from your partner. Make a small cone gate 3 steps to your ' +
          'left and another 3 steps to your right.',
        howToPlay:
          'Your partner passes to you and, while the ball is rolling, shouts “Left!” or ' +
          '“Right!”. Take your first touch through that gate. Do 10, then swap.',
        focus: 'Stay on your toes with your body open, so your first touch can go either way.',
        harder:
          'Your partner points instead of shouting, so you have to look up as the ball ' +
          'comes.',
      },
      {
        name: 'Man On or Turn?',
        players: '3 players',
        setup:
          'A passer, a receiver and a defender. Put a small cone gate about 5 steps behind ' +
          'the receiver.',
        howToPlay:
          'The defender starts behind the receiver and secretly chooses: move in close or ' +
          'stay back. Before the ball arrives, the receiver looks over their shoulder. ' +
          'Defender close: protect it and pass back. Defender far: turn and dribble through ' +
          'the gate.',
        focus: 'Look before you receive. What you see decides your first touch.',
        harder: 'The defender can start moving as soon as the pass is played.',
      },
    ],
  },
  {
    id: 'press',
    emoji: '🛡️',
    title: 'Press or Hold?',
    description:
      'Know when to go and win the ball, and when to hold your position and protect your goal.',
    scenarios: [
      {
        id: 'press-bad-touch',
        title: 'Bad touch: GO!',
        situation:
          'An opponent gets the ball, but their touch is too heavy and it bounces away from ' +
          'them. You are only a few steps away.',
        question: 'Press or hold?',
        scene: {
          goal: 'bottom',
          you: { x: 50, y: 47 },
          ball: { x: 53, y: 36 },
          teammates: [
            { x: 26, y: 54 },
            { x: 74, y: 54 },
          ],
          opponents: [
            { x: 50, y: 28 },
            { x: 80, y: 18 },
            { x: 22, y: 20 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Press! Sprint in and win the ball',
            correct: true,
            feedback:
              'A bad touch is a press trigger. The ball is loose and they are off balance, so ' +
              'go!',
          },
          {
            id: 'B',
            label: 'Hold your position and wait',
            correct: false,
            feedback: 'You miss the moment. One more touch and they have it under control.',
          },
          {
            id: 'C',
            label: 'Drop back towards your goal',
            correct: false,
            feedback: 'That gives them time to fix their mistake and attack you.',
          },
        ],
        cue:
          'Press triggers: a bad touch, a slow pass, a player with their back to you, or a ' +
          'player stuck by the sideline.',
      },
      {
        id: 'press-outnumbered',
        title: 'Two against one',
        situation:
          'Two attackers are running at you. You are the last defender, and your teammates ' +
          'are sprinting back to help.',
        question: 'What should you do?',
        scene: {
          goal: 'bottom',
          you: { x: 52, y: 48 },
          ball: { x: 43, y: 30 },
          teammates: [
            { x: 32, y: 8 },
            { x: 62, y: 6 },
          ],
          opponents: [
            { x: 40, y: 26 },
            { x: 68, y: 22 },
          ],
          arrows: [
            { from: { x: 32, y: 11.5 }, to: { x: 34, y: 19 }, kind: 'run' },
            { from: { x: 62, y: 9.5 }, to: { x: 63, y: 17 }, kind: 'run' },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Dive in and tackle straight away',
            correct: false,
            feedback:
              'If you miss, they are through on goal. And if you go to the ball, they just ' +
              'pass to the free attacker.',
          },
          {
            id: 'B',
            label: 'Delay: back off slowly, stay goal-side and wait for help',
            correct: true,
            feedback:
              'Slow them down! Every second helps your teammates get back. Stay on your feet ' +
              'and try to block the pass.',
          },
          {
            id: 'C',
            label: 'Run back and stand on your goal line',
            correct: false,
            feedback: 'Too deep. That gives them a free shot from the edge of the box.',
          },
        ],
        cue: "Outnumbered? Delay, don't dive. Buy time for your teammates to get back.",
      },
      {
        id: 'press-too-far',
        title: 'Too far away',
        situation:
          'An opponent has the ball far away from you. They are facing forward with lots of ' +
          'time. Behind you, their striker is waiting for a pass.',
        question: 'Press or hold?',
        scene: {
          goal: 'bottom',
          you: { x: 46, y: 40 },
          ball: { x: 50, y: 14.5 },
          teammates: [
            { x: 20, y: 44 },
            { x: 76, y: 44 },
            { x: 36, y: 62 },
          ],
          opponents: [
            { x: 50, y: 10 },
            { x: 60, y: 58 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Sprint to press them on your own',
            correct: false,
            feedback:
              'You will arrive too late, and the space you leave is exactly where they will ' +
              'pass.',
          },
          {
            id: 'B',
            label: 'Drop all the way back into your own box',
            correct: false,
            feedback: 'Too deep! You give them loads of space to run into.',
          },
          {
            id: 'C',
            label: 'Hold your position and block the pass to the striker',
            correct: true,
            feedback:
              "If you can't get there in time, stay in shape. Cutting out the pass is as good " +
              'as a tackle.',
          },
        ],
        cue: 'Can you get there while the ball is still rolling? Yes: press. No: hold and cover.',
      },
      {
        id: 'press-sideline',
        title: 'Trapped by the sideline',
        situation:
          'An opponent gets the ball right next to the sideline. A teammate is close by to ' +
          'help you.',
        question: 'What is the best way to defend?',
        scene: {
          goal: 'bottom',
          you: { x: 26, y: 44 },
          ball: { x: 11, y: 38 },
          teammates: [
            { x: 12, y: 56 },
            { x: 62, y: 50 },
          ],
          opponents: [
            { x: 8, y: 34 },
            { x: 44, y: 28 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Press from the inside and show them down the line',
            correct: true,
            feedback:
              'The sideline is like an extra defender. Block the inside, and with your ' +
              "teammate's help you can trap them.",
          },
          {
            id: 'B',
            label: 'Stay in the middle and let them come to you',
            correct: false,
            feedback: 'That gives them time to look up and pass into the middle.',
          },
          {
            id: 'C',
            label: 'Press from the outside and force them inside',
            correct: false,
            feedback:
              'Forcing them inside opens up the middle of the pitch, where they have more ' +
              'passing options.',
          },
        ],
        cue: 'Use the sideline as an extra defender: block the inside, show them outside.',
      },
    ],
    pitchGames: [
      {
        name: '5-Second Hunt',
        players: '8 players (4 v 4)',
        setup: 'A small pitch, about 30 by 20 big steps, with a small goal at each end.',
        howToPlay:
          'Play a normal game. When your team loses the ball, you have 5 seconds to win it ' +
          "back. Win it back in time and your team gets a bonus point. If you can't, " +
          'everyone drops back into position and defends together.',
        focus: 'Closest player presses straight away. Everyone else closes the nearby gaps.',
        harder: 'The bonus point only counts if you win the ball back within 3 seconds.',
      },
      {
        name: 'Delay Duel',
        players: '3 players',
        setup:
          'A channel about 10 steps wide and 20 steps long with a small goal at one end. One ' +
          'attacker, one defender, and a helper who starts next to the attacker.',
        howToPlay:
          'The attacker dribbles at the defender and tries to score. The defender must not ' +
          'dive in: stay on your feet, back off slowly and show the attacker towards the ' +
          'side. Count to 3, then the helper sprints back to make it 2 v 1. Defenders score a ' +
          'point if they win the ball or stop the shot.',
        focus: "Delay, don't dive. Buy time until help arrives.",
        harder: 'Add a second attacker, so the defender has to block a pass too.',
      },
    ],
  },
];

export function getTheme(id: DecisionThemeId): DecisionTheme {
  const theme = DECISION_THEMES.find((t) => t.id === id);
  if (!theme) throw new Error(`Unknown decision theme: ${id}`);
  return theme;
}
