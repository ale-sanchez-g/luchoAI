import type { DecisionTheme, DecisionThemeId } from '@/types';

// Pitch coordinates use a 100 × 75 grid (see PitchDiagram). Your team always attacks up the
// screen, so y = 0 is the end you attack and y = 75 is the end you defend.

export const DECISION_THEMES: DecisionTheme[] = [
  {
    id: 'space',
    icon: 'runner',
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
    icon: 'sneaker',
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
    icon: 'shield',
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
  {
    id: 'defend-together',
    icon: 'wall',
    title: 'Defend Together',
    description: 'Ambush, lock in, cover and slide: win the ball back as a team.',
    scenarios: [
      {
        id: 'defend-ambush',
        title: 'Ambush!',
        situation:
          "An opponent has the ball facing their own goal, so they can't see you. Your " +
          "teammate is pressing them, and the player you're marking is too far away for a pass.",
        question: 'What should you do?',
        scene: {
          goal: 'bottom',
          you: { x: 66, y: 44 },
          ball: { x: 47.5, y: 30.2 },
          teammates: [
            { x: 46, y: 44 },
            { x: 22, y: 52 },
            { x: 42, y: 62 },
          ],
          opponents: [
            { x: 46, y: 36 },
            { x: 38, y: 12 },
            { x: 90, y: 20 },
            { x: 18, y: 36 },
          ],
          arrows: [{ from: { x: 39, y: 16 }, to: { x: 46.3, y: 27.2 }, kind: 'pass' }],
        },
        options: [
          {
            id: 'A',
            label: "Stay with the player you're marking",
            correct: false,
            feedback:
              "They're too far away to get a pass right now. Staying with them leaves your " +
              'teammate to win the ball on their own.',
          },
          {
            id: 'B',
            label: 'Ambush! Sprint in from their blind side to make it 2 v 1',
            correct: true,
            feedback:
              "They can't see you coming, so you and your teammate trap them 2 v 1 and win " +
              'the ball. Then look to counter!',
            marker: { x: 55.5, y: 36 },
          },
          {
            id: 'C',
            label: 'Drop back towards your own goal',
            correct: false,
            feedback:
              "There's no danger behind you right now. This is the moment to win the ball, " +
              'not to back off.',
            marker: { x: 68, y: 62 },
          },
        ],
        cue:
          'Opponent facing their own goal or head down? That is your trigger: ambush and make ' +
          'it 2 v 1.',
      },
      {
        id: 'defend-lock-in',
        title: 'The press is on: lock in',
        situation:
          'Your teammate has started pressing the player on the ball. They have their head up ' +
          'looking for a pass, and the closest player they could pass to is next to you.',
        question: 'What is your job?',
        scene: {
          goal: 'bottom',
          you: { x: 60, y: 48 },
          ball: { x: 31, y: 35 },
          teammates: [
            { x: 40, y: 48 },
            { x: 18, y: 56 },
            { x: 82, y: 54 },
          ],
          opponents: [
            { x: 30, y: 30 },
            { x: 54, y: 38 },
            { x: 46, y: 14 },
            { x: 78, y: 24 },
          ],
          arrows: [{ from: { x: 38.5, y: 44.5 }, to: { x: 34, y: 38.5 }, kind: 'run' }],
        },
        options: [
          {
            id: 'A',
            label: 'Run to the ball and press it too',
            correct: false,
            feedback:
              "Two of you on the ball leaves their teammate free. With their head up, they'll " +
              'just pass to them.',
          },
          {
            id: 'B',
            label: 'Drop back to the edge of your box',
            correct: false,
            feedback: 'Too far away. That gives them an easy pass and time to turn.',
            marker: { x: 70, y: 60 },
          },
          {
            id: 'C',
            label: 'Lock in: get tight to the player they want to pass to',
            correct: true,
            feedback:
              "Now there's no easy pass. The player on the ball is trapped, and if they force " +
              'it, you can intercept.',
            marker: { x: 50, y: 45.5 },
          },
        ],
        cue:
          'When the press starts, lock in on the closest players they could pass to. No easy ' +
          'passes!',
      },
      {
        id: 'defend-cover',
        title: 'Cover your teammate',
        situation:
          'An attacker is dribbling towards your goal, and your teammate has gone to press ' +
          'them. You are the closest player to help.',
        question: 'Where should you be?',
        scene: {
          goal: 'bottom',
          you: { x: 74, y: 42 },
          ball: { x: 48, y: 35 },
          teammates: [
            { x: 48, y: 42 },
            { x: 24, y: 50 },
            { x: 40, y: 64 },
          ],
          opponents: [
            { x: 48, y: 30 },
            { x: 84, y: 24 },
            { x: 22, y: 28 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Right next to your teammate',
            correct: false,
            feedback: 'Side by side, one dribble or one pass gets past you both at the same time.',
            marker: { x: 57, y: 42 },
          },
          {
            id: 'B',
            label: 'A few steps behind your teammate, at an angle',
            correct: true,
            feedback:
              "Perfect cover. If the attacker beats your teammate, you're ready to step in, " +
              'and you can still see their winger.',
            marker: { x: 58, y: 53 },
          },
          {
            id: 'C',
            label: 'Out wide, right next to their winger',
            correct: false,
            feedback:
              'The ball is the biggest danger. If your teammate gets beaten, nobody is between ' +
              'the attacker and your goal.',
            marker: { x: 84, y: 32 },
          },
        ],
        cue:
          'Cover the teammate who is pressing: a few steps behind them, at an angle, close ' +
          'enough to help.',
      },
      {
        id: 'defend-slide',
        title: 'Ball on the far side',
        situation:
          "The other team has the ball on the far wing. You're a defender on the other side, " +
          "and the winger you're marking is out by the sideline.",
        question: 'Where should you be?',
        scene: {
          goal: 'bottom',
          you: { x: 88, y: 54 },
          ball: { x: 14, y: 39 },
          teammates: [
            { x: 20, y: 47 },
            { x: 36, y: 56 },
            { x: 52, y: 58 },
          ],
          opponents: [
            { x: 12, y: 34 },
            { x: 92, y: 42 },
            { x: 66, y: 44 },
            { x: 32, y: 24 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Slide in towards the middle, close to your teammates',
            correct: true,
            feedback:
              'Now your defence is compact and connected. The winger is far from the ball, so ' +
              'you still have time to get to them if the ball is switched.',
            marker: { x: 68, y: 57 },
          },
          {
            id: 'B',
            label: 'Stay tight to your winger by the sideline',
            correct: false,
            feedback:
              'That leaves a huge gap between you and your teammates. One pass through it and ' +
              'their striker is in on goal.',
          },
          {
            id: 'C',
            label: 'Sprint across the pitch to press the ball',
            correct: false,
            feedback:
              'Your teammates are much closer to the ball. Running across leaves your whole ' +
              'side of the pitch empty.',
          },
        ],
        cue:
          'Ball on the far side? Slide in and stay connected. The further the ball is from your ' +
          'player, the further you can be from them.',
      },
    ],
    pitchGames: [
      {
        name: 'Rondo Hunters',
        players: '8 or 9 players (6 or 7 v 2)',
        setup:
          'Mark a square about 10 big steps wide. Six or seven players stand around it, with ' +
          'two defenders inside. Each defender holds a bib in their hand, so swapping is quick.',
        howToPlay:
          'The outside players keep the ball away from the defenders. If the ball leaves the ' +
          'square off an attacker, or the defenders win it and pass it to each other, the ' +
          'attacker who lost it swaps with the defender who has been in the middle longest. A ' +
          'coach rolls in a new ball straight away.',
        focus: 'Hunt as a pair: one defender presses, the other ambushes or blocks the next pass.',
        harder: 'Make the square bigger, so the two defenders have more space to cover together.',
      },
      {
        name: 'Defend the Half',
        players: '10+ players (two teams)',
        setup:
          'Use half a pitch with a big goal and a goalkeeper. Mark a small square in each ' +
          'corner by the halfway line.',
        howToPlay:
          'One team attacks the big goal. The other team defends as a block in its own half. ' +
          'When the defenders win the ball, they score by passing to a teammate who runs into ' +
          'one of the corner squares. Swap roles halfway through.',
        focus:
          'Compact, connected, communicate: slide together, lock in when the press starts and ' +
          'ambush when you can.',
        harder: 'Give the attacking team an extra player, so the block has to talk and slide more.',
      },
    ],
  },
  {
    id: 'counter',
    icon: 'bolt',
    title: 'Quick Counter',
    description: 'Won the ball back? Attack fast with forward passes and forward runs.',
    scenarios: [
      {
        id: 'counter-play-forward',
        title: 'Win it, play forward',
        situation:
          "You've just intercepted a pass in midfield. Your striker is free up front, and " +
          'most of their team is still out of position.',
        question: 'What should you do with the ball?',
        scene: {
          goal: 'top',
          you: { x: 50, y: 50 },
          ball: { x: 55.5, y: 47.5 },
          teammates: [
            { x: 42, y: 22 },
            { x: 82, y: 38 },
            { x: 20, y: 62 },
          ],
          opponents: [
            { x: 36, y: 46 },
            { x: 30, y: 62 },
            { x: 68, y: 58 },
            { x: 60, y: 16 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Play a quick forward pass to your striker',
            correct: true,
            feedback:
              'One quick forward pass and your striker is through before their defenders can ' +
              'get back.',
          },
          {
            id: 'B',
            label: 'Take a few touches and wait for your teammates to catch up',
            correct: false,
            feedback:
              'Every extra touch gives their players time to get back. The chance disappears.',
          },
          {
            id: 'C',
            label: 'Pass back to your goalkeeper to keep it safe',
            correct: false,
            feedback:
              'Safe, but the counter-attack is over before it starts. Their whole team gets ' +
              'back into shape.',
          },
        ],
        cue:
          'Know where your striker is BEFORE you win the ball. Win it, then play forward in ' +
          'one or two touches.',
      },
      {
        id: 'counter-find-forward',
        title: "Can't go forward? Find who can",
        situation:
          'You win the ball, but you are facing your own goal with an opponent right behind ' +
          'you. A teammate next to you is facing forward with space.',
        question: 'What is your best pass?',
        scene: {
          goal: 'top',
          you: { x: 44, y: 46 },
          ball: { x: 38, y: 49 },
          teammates: [
            { x: 61, y: 50 },
            { x: 50, y: 18 },
            { x: 84, y: 30 },
          ],
          opponents: [
            { x: 44, y: 38.5 },
            { x: 26, y: 34 },
            { x: 70, y: 38 },
            { x: 56, y: 11 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Turn and try to beat the player behind you',
            correct: false,
            feedback:
              "They're right on your back. Turning here is the quickest way to lose the ball " +
              'again.',
          },
          {
            id: 'B',
            label: 'Kick it forward over your shoulder without looking',
            correct: false,
            feedback: 'A blind kick usually goes straight back to the other team.',
          },
          {
            id: 'C',
            label: 'Pass to your teammate who is facing forward',
            correct: true,
            feedback:
              "They can see the whole pitch and play the forward pass you couldn't. Quick and " +
              'simple keeps the counter-attack alive.',
          },
        ],
        cue: "Can't play forward yourself? Pass to the teammate who can.",
      },
      {
        id: 'counter-give-and-go',
        title: 'Pass and support',
        situation:
          'You won the ball and passed it forward to your striker. They have their back to ' +
          'goal, with a defender close behind them.',
        question: 'What should you do now?',
        scene: {
          goal: 'top',
          you: { x: 40, y: 58 },
          ball: { x: 50, y: 33.5 },
          teammates: [
            { x: 50, y: 28 },
            { x: 82, y: 26 },
          ],
          opponents: [
            { x: 50, y: 20.5 },
            { x: 28, y: 36 },
            { x: 70, y: 40 },
            { x: 64, y: 12 },
          ],
          arrows: [{ from: { x: 43.5, y: 56 }, to: { x: 48.8, y: 37 }, kind: 'pass' }],
        },
        options: [
          {
            id: 'A',
            label: 'Stay where you are and watch',
            correct: false,
            feedback:
              "Your striker is under pressure with nobody close to pass to. Don't leave them " +
              'on their own!',
          },
          {
            id: 'B',
            label: 'Sprint up to support just behind them, at an angle',
            correct: true,
            feedback:
              "Give and go! Your striker lays it back to you first time, and you're facing " +
              'forward for the next pass.',
            marker: { x: 40, y: 40 },
          },
          {
            id: 'C',
            label: 'Run back to your defending position',
            correct: false,
            feedback:
              'The counter-attack needs support right now. Without you, your striker will ' +
              'probably lose the ball.',
            marker: { x: 40, y: 70 },
          },
        ],
        cue:
          'Played it forward? Follow your pass and support just behind the ball for the give ' +
          'and go.',
      },
      {
        id: 'counter-run-past',
        title: 'Support is there: run past!',
        situation:
          'Your team is counter-attacking. Your striker has the ball, and a teammate is ' +
          'already supporting just behind them.',
        question: 'What should you do?',
        scene: {
          goal: 'top',
          you: { x: 66, y: 56 },
          ball: { x: 48, y: 36.5 },
          teammates: [
            { x: 44, y: 32 },
            { x: 34, y: 44 },
          ],
          opponents: [
            { x: 44, y: 24.5 },
            { x: 24, y: 22 },
            { x: 60, y: 42 },
            { x: 50, y: 6 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Make a forward run past the ball, into the space',
            correct: true,
            feedback:
              'Now your striker has a forward pass to play. Quick forward runs make a ' +
              'counter-attack really dangerous.',
            marker: { x: 72, y: 18 },
          },
          {
            id: 'B',
            label: 'Go and support behind the ball too',
            correct: false,
            feedback:
              'A teammate is already there. Two players behind the ball and nobody ahead ' +
              'means no forward pass.',
            marker: { x: 50, y: 48 },
          },
          {
            id: 'C',
            label: 'Ask for the ball to your feet where you are',
            correct: false,
            feedback:
              'A pass back to you slows everything down and gives their defenders time to get ' +
              'back.',
          },
        ],
        cue:
          'Teammate already supporting behind the ball? Then run past it. Quick forward passes ' +
          'and quick forward runs win counter-attacks.',
      },
    ],
    pitchGames: [
      {
        name: '6-Second Counter',
        players: '10+ players (two teams)',
        setup:
          'Use half a pitch with a big goal and a goalkeeper. The defending team puts a ' +
          'target player out wide on the halfway line, one on each side of the pitch.',
        howToPlay:
          'One team attacks the big goal. When the defending team wins the ball, they count ' +
          'down from 6 out loud. Pass to one of your wide targets before you reach zero to ' +
          'score a point.',
        focus:
          'Know where your targets are before you win the ball. Then play forward in one or ' +
          'two touches.',
        harder: 'Count down from 4 instead, or only count passes made with one or two touches.',
      },
      {
        name: 'Support or Run Past?',
        players: '5 players (3 v 2)',
        setup:
          'A channel about 30 big steps long and 20 wide, with a small goal at one end. One ' +
          'defender guards the goal. A chasing defender starts at the other end, next to ' +
          'three attackers.',
        howToPlay:
          'The first attacker passes forward to the striker, and the chaser starts running. ' +
          'The passer and the third attacker decide fast: one supports just behind the ball, ' +
          'the other runs past it. Score before the chaser catches up!',
        focus:
          'Teammate already behind the ball? Run past it. Nobody there? Get behind it and ' +
          'support.',
        harder: 'The goal only counts if you score within 8 seconds of the first pass.',
      },
    ],
  },
  {
    id: 'shoot',
    icon: 'target',
    title: 'Shoot or Pass?',
    description: 'Near goal, make the call: shoot, pass to someone who can score, or get closer.',
    scenarios: [
      {
        id: 'shoot-clear-sight',
        title: 'Can you score? Shoot!',
        situation:
          'You have the ball on the edge of the box with a clear sight of goal. A defender is ' +
          'running across to block you.',
        question: 'What should you do?',
        scene: {
          goal: 'top',
          you: { x: 46, y: 22 },
          ball: { x: 51, y: 19 },
          teammates: [{ x: 82, y: 10 }],
          opponents: [
            { x: 50, y: 5 },
            { x: 64, y: 30 },
            { x: 74, y: 12 },
            { x: 28, y: 14 },
          ],
          arrows: [{ from: { x: 61, y: 28.5 }, to: { x: 55.5, y: 25 }, kind: 'run' }],
        },
        options: [
          {
            id: 'A',
            label: 'Pass across to your teammate on the right',
            correct: false,
            feedback:
              'They are at a tighter angle with a defender close by. You had the better chance.',
          },
          {
            id: 'B',
            label: 'Take one more touch to get even closer',
            correct: false,
            feedback:
              "The defender gets there and blocks it. With a clear sight of goal, don't wait.",
          },
          {
            id: 'C',
            label: 'Shoot now',
            correct: true,
            feedback:
              'If you think you can score, take the shot! Hit the target and make the keeper ' +
              'work.',
          },
        ],
        cue: 'Clear sight of goal and close enough to score? Take the shot!',
      },
      {
        id: 'shoot-square',
        title: 'Pass to someone who can score',
        situation:
          "You've dribbled into the box from the side. A defender and the goalkeeper are " +
          'blocking your shot, and a teammate is free in the middle.',
        question: 'What is the best choice?',
        scene: {
          goal: 'top',
          you: { x: 27, y: 15 },
          ball: { x: 32, y: 12.5 },
          teammates: [{ x: 56, y: 15 }],
          opponents: [
            { x: 46, y: 4.5 },
            { x: 39, y: 9 },
            { x: 72, y: 13 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Pass it across to your free teammate',
            correct: true,
            feedback:
              "They have a big gap to aim at. If you can't score, pass to someone who can!",
          },
          {
            id: 'B',
            label: 'Shoot anyway, past the defender and the keeper',
            correct: false,
            feedback:
              'The defender and the keeper are covering the angle, so your shot will probably ' +
              'be blocked.',
          },
          {
            id: 'C',
            label: 'Try to dribble around both of them',
            correct: false,
            feedback:
              'Two players to beat in a tiny space, while your teammate waits with a better ' +
              'chance.',
          },
        ],
        cue: "Can't score from where you are? Pass to a teammate who can.",
      },
      {
        id: 'shoot-get-closer',
        title: 'Too far to score',
        situation:
          'You have the ball in the middle of the pitch, a long way from goal. There is lots ' +
          'of open space in front of you.',
        question: 'What should you do?',
        scene: {
          goal: 'top',
          you: { x: 50, y: 58 },
          ball: { x: 55.5, y: 56 },
          teammates: [
            { x: 72, y: 30 },
            { x: 38, y: 70 },
          ],
          opponents: [
            { x: 50, y: 6 },
            { x: 30, y: 20 },
            { x: 46, y: 18 },
            { x: 62, y: 19 },
            { x: 78, y: 22 },
            { x: 16, y: 46 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Shoot from here',
            correct: false,
            feedback:
              "It's too far to score. The keeper catches it easily, and your team loses the " +
              'ball.',
          },
          {
            id: 'B',
            label: 'Pass back to your defender',
            correct: false,
            feedback:
              'Safe, but you had open space to attack. Now your team is even further from ' +
              'scoring.',
          },
          {
            id: 'C',
            label: 'Run with the ball into the space, towards goal',
            correct: true,
            feedback:
              'Too far to score? Get closer! Push the ball ahead of you and run, then shoot or ' +
              'pass when you get near.',
            marker: { x: 52, y: 36 },
          },
        ],
        cue:
          'Too far to score? Get the ball closer to goal, then shoot or pass to someone who ' +
          'can.',
      },
      {
        id: 'shoot-over-through-around',
        title: 'Over, through or around?',
        situation:
          'Their defence is in your way. Two of their defenders have left a gap between them, ' +
          'and your teammate is about to run through it.',
        question: 'How do you get past their defence?',
        scene: {
          goal: 'top',
          you: { x: 46, y: 56 },
          ball: { x: 51.5, y: 54 },
          teammates: [
            { x: 54, y: 34 },
            { x: 90, y: 36 },
          ],
          opponents: [
            { x: 50, y: 6 },
            { x: 18, y: 27 },
            { x: 38, y: 26 },
            { x: 64, y: 26 },
            { x: 84, y: 27 },
            { x: 82, y: 42 },
            { x: 30, y: 42 },
          ],
          arrows: [{ from: { x: 53.5, y: 30.4 }, to: { x: 52, y: 21 }, kind: 'run' }],
        },
        options: [
          {
            id: 'A',
            label: 'Over: kick it long and high over everybody',
            correct: false,
            feedback:
              'A long, high ball is hard to control, and their keeper can come out and collect ' +
              'it.',
          },
          {
            id: 'B',
            label: 'Through: pass into the gap for your runner',
            correct: true,
            feedback:
              'The gap is open and your teammate is already running. One pass through it gets ' +
              'past their whole defence!',
            marker: { x: 51.5, y: 15.5 },
          },
          {
            id: 'C',
            label: 'Around: pass out wide to your winger',
            correct: false,
            feedback:
              'Two defenders are waiting there. Going around works when the wing is free, but ' +
              'not this time.',
          },
        ],
        cue:
          "Can't shoot yet? Get past them by playing over, through or around. Pick the way " +
          "that's open.",
      },
    ],
    pitchGames: [
      {
        name: 'Three Choices',
        players: '4 players (2 v 1 + keeper)',
        setup:
          'A goal with a goalkeeper. Put cones about 20 big steps out to mark a shooting zone. ' +
          'Two attackers start about 35 big steps from goal, and a defender waits in the zone.',
        howToPlay:
          'The attackers go 2 v 1 at goal. Shots only count from inside the shooting zone, so ' +
          "if you're too far away, carry it closer first. No clear shot? Pass to your " +
          'teammate. Swap the defender every 3 goes.',
        focus: "Can I score? Shoot. Can't? Pass to someone who can. Too far? Get closer.",
        harder: 'Add a second defender, or give the attackers only 6 seconds to score.',
      },
      {
        name: 'Over, Through or Around',
        players: '8 players (4 v 4)',
        setup: 'A pitch about 40 by 30 big steps, with an end zone 5 steps deep at each end.',
        howToPlay:
          'Score by passing to a teammate who runs into the end zone you attack. Nobody can ' +
          'wait in the end zone, so time your runs. A pass through a gap between two defenders ' +
          'scores double.',
        focus: 'Before you pass, look up: is the way over, through or around them open?',
        harder: 'Allow only two touches each, so you have to see the pass before the ball arrives.',
      },
    ],
  },
  {
    id: 'combine',
    icon: 'shuffle',
    title: 'Play Together',
    description: 'Spot the free player, find the third man and switch to the open side.',
    scenarios: [
      {
        id: 'combine-spare-player',
        title: 'Find the spare player',
        situation:
          'You have the ball and one defender in front of you. Your teammate is running ' +
          'alongside, with nobody near them.',
        question: 'What is the smart play?',
        scene: {
          goal: 'top',
          you: { x: 46, y: 50 },
          ball: { x: 51.5, y: 48 },
          teammates: [{ x: 78, y: 38 }],
          opponents: [
            { x: 56, y: 32 },
            { x: 50, y: 6 },
          ],
          arrows: [{ from: { x: 74, y: 44 }, to: { x: 77, y: 41 }, kind: 'run' }],
        },
        options: [
          {
            id: 'A',
            label: 'Dribble straight at the defender and try to beat them',
            correct: false,
            feedback:
              'You are choosing the hard way. If you lose it, your free teammate never touches ' +
              'the ball.',
          },
          {
            id: 'B',
            label: 'Run at the defender to pull them in, then pass to your free teammate',
            correct: true,
            feedback:
              'Two attackers against one defender means someone is free. Make the defender ' +
              'come to you, then give the ball to the player they cannot reach.',
            marker: { x: 52, y: 41 },
          },
          {
            id: 'C',
            label: 'Stop and wait for more teammates to catch up',
            correct: false,
            feedback:
              'Waiting gives their defenders time to run back, and then the extra player ' +
              'disappears.',
          },
        ],
        cue: 'More of us than them? Draw the defender, then pass to the free player.',
      },
      {
        id: 'combine-switch',
        title: 'Switch the play',
        situation:
          'Your team has crowded the left side, and so has the other team. Your winger on the ' +
          'right has loads of room, with only one defender nearby.',
        question: 'Where is the space, and how do you get the ball there?',
        scene: {
          goal: 'top',
          you: { x: 24, y: 48 },
          ball: { x: 29.5, y: 46 },
          teammates: [
            { x: 12, y: 38 },
            { x: 28, y: 32 },
            { x: 40, y: 56 },
            { x: 90, y: 34 },
          ],
          opponents: [
            { x: 14, y: 30 },
            { x: 30, y: 38 },
            { x: 22, y: 40 },
            { x: 44, y: 34 },
            { x: 78, y: 22 },
            { x: 50, y: 6 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Keep passing in the crowd on the left',
            correct: false,
            feedback:
              'There are lots of defenders in that corner. Short passes get squeezed and you ' +
              'might lose the ball.',
          },
          {
            id: 'B',
            label: 'Dribble into the middle of the crowd',
            correct: false,
            feedback:
              'Defenders are waiting there. You would be going where the space is not.',
          },
          {
            id: 'C',
            label: 'Switch it across to your winger on the right',
            correct: true,
            feedback:
              'They all moved over to stop you, which left the far side empty. One good pass ' +
              'across and your winger is up against just one defender.',
            marker: { x: 86, y: 42 },
          },
        ],
        cue: 'Lots of players on one side? Look across: the space is usually on the other.',
      },
      {
        id: 'combine-third-man',
        title: 'The third man',
        situation:
          'Your striker is marked, and a defender stands in the passing lane between you and ' +
          'them. Your teammate in the middle is free, and another teammate is starting a run ' +
          'down the right.',
        question: 'How do you get the ball to the runner?',
        scene: {
          goal: 'top',
          you: { x: 42, y: 62 },
          ball: { x: 47.5, y: 60 },
          teammates: [
            { x: 46, y: 22 },
            { x: 56, y: 46 },
            { x: 70, y: 52 },
          ],
          opponents: [
            { x: 47, y: 42 },
            { x: 46, y: 28 },
            { x: 66, y: 40 },
            { x: 24, y: 34 },
            { x: 50, y: 6 },
          ],
          arrows: [{ from: { x: 70, y: 48.5 }, to: { x: 72, y: 34 }, kind: 'run' }],
        },
        options: [
          {
            id: 'A',
            label: 'Pass to your free teammate, who sets it back for the runner',
            correct: true,
            feedback:
              'Pass, lay-off, through ball. The defender watches the ball and loses sight of ' +
              'the runner, who gets the ball in space.',
          },
          {
            id: 'B',
            label: 'Hit the pass to your striker through the gap',
            correct: false,
            feedback: 'The defender in the lane steps across and wins it. The lane is closed.',
          },
          {
            id: 'C',
            label: 'Dribble at the defender in the lane',
            correct: false,
            feedback:
              'You would be running into the exact player you could not pass through. You ' +
              'have teammates who are free.',
          },
        ],
        cue: "Can't pass straight to them? Use a teammate as a stepping stone, and send a runner.",
      },
    ],
    pitchGames: [
      {
        name: 'Spare Player',
        players: '3 players (2 v 1)',
        setup:
          'Mark a pitch about 20 steps long and 12 steps wide, with a small goal made of two ' +
          'cones at one end. Two attackers start at the other end, and one defender waits in ' +
          'the middle.',
        howToPlay:
          'The attackers try to get the ball to the goal. Attackers cannot dribble past the ' +
          'defender, so they have to pass to get by. After 5 tries swap who defends.',
        focus: 'Who is free right now? Pull the defender in, then give it to them.',
        harder: 'Make the pitch narrower, or give the attackers only 5 seconds.',
      },
      {
        name: 'Switch to Score',
        players: '8 players (4 v 4)',
        setup:
          'A pitch about 40 steps long and 30 steps wide, with a goal at each end. Mark a ' +
          'line down the middle of the pitch, lengthways.',
        howToPlay:
          'A goal only counts if, earlier in the same attack, the ball was passed from one ' +
          'side of the line to the other. Draw the defenders to one side, then switch the ball ' +
          'across to the empty side.',
        focus: 'Where did they all move to? Where did that leave the space?',
        harder: 'Allow only three touches each before you must pass.',
      },
    ],
  },
  {
    id: 'react-fast',
    icon: 'bolt',
    title: 'React Fast',
    description: 'Lost it, left behind or loose ball: know your job in the next few seconds.',
    scenarios: [
      {
        id: 'react-win-it-back',
        title: 'Win it back, fast',
        situation:
          'You just lost the ball high up the pitch. The player who took it is only a few ' +
          'steps away, and two of your teammates are close by.',
        question: 'What do you do straight away?',
        scene: {
          goal: 'top',
          you: { x: 50, y: 33 },
          ball: { x: 51, y: 17 },
          teammates: [
            { x: 30, y: 30 },
            { x: 70, y: 30 },
            { x: 24, y: 56 },
          ],
          opponents: [
            { x: 50, y: 22 },
            { x: 22, y: 18 },
            { x: 80, y: 20 },
            { x: 42, y: 10 },
            { x: 60, y: 10 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Pounce on the ball right now, and your teammates close in too',
            correct: true,
            feedback:
              'They have just won it and are not settled. Win it back in these first few ' +
              'seconds and you are close to goal. If it takes longer, drop back into shape.',
          },
          {
            id: 'B',
            label: 'Stand still and wait to see what happens',
            correct: false,
            feedback:
              'The first seconds after you lose it are the best time to win it back. Waiting ' +
              'hands them time to look up.',
          },
          {
            id: 'C',
            label: 'Jog back to your normal position',
            correct: false,
            feedback:
              'Drop back if the first few seconds do not work, but not before you have tried. ' +
              'Right now they are easy to catch.',
            marker: { x: 50, y: 56 },
          },
        ],
        cue:
          'Lost it? Pounce right away. Not won back after about five seconds? Drop back into ' +
          'your shape.',
      },
      {
        id: 'react-rest-defence',
        title: 'Stay ready behind the ball',
        situation:
          'Your team is attacking down the right wing. You are not involved in the play. ' +
          'Their striker is waiting near halfway, hoping to break away if you lose the ball.',
        question: 'Where is the best place for you to be?',
        scene: {
          goal: 'top',
          you: { x: 46, y: 58 },
          ball: { x: 76, y: 23 },
          teammates: [
            { x: 74, y: 26 },
            { x: 88, y: 16 },
            { x: 64, y: 18 },
          ],
          opponents: [
            { x: 38, y: 44 },
            { x: 72, y: 14 },
            { x: 84, y: 20 },
            { x: 56, y: 22 },
            { x: 50, y: 6 },
          ],
        },
        options: [
          {
            id: 'A',
            label: 'Join the attack and run into their box',
            correct: false,
            feedback:
              'There are already enough of you up there. If you lose it, their striker has ' +
              'nobody to stop them.',
            marker: { x: 38, y: 14 },
          },
          {
            id: 'B',
            label: 'Hold your place behind the ball, near their striker',
            correct: true,
            feedback:
              "You are your team's insurance. If you lose the ball, you are already there to " +
              'stop the counter-attack. If you never need it, you lost nothing.',
            marker: { x: 33, y: 51 },
          },
          {
            id: 'C',
            label: 'Move over to stand near the player with the ball',
            correct: false,
            feedback:
              'Now you are in the crowd, and nobody is left to mark their striker.',
            marker: { x: 62, y: 34 },
          },
        ],
        cue: 'Not in the attack? If we lose it now, who is yours? Stay close enough to stop them.',
      },
      {
        id: 'react-second-ball',
        title: 'Beat them to the second ball',
        situation:
          'Their goalkeeper kicks the ball long. It is about to bounce in the middle, where ' +
          'their striker and your defender will both challenge for it. You are a few steps ' +
          'back, in midfield.',
        question: 'What do you do while the ball is in the air?',
        scene: {
          goal: 'top',
          you: { x: 36, y: 48 },
          ball: { x: 50, y: 40 },
          teammates: [
            { x: 52, y: 44 },
            { x: 74, y: 52 },
            { x: 20, y: 66 },
          ],
          opponents: [
            { x: 50, y: 6 },
            { x: 54, y: 36 },
            { x: 64, y: 28 },
            { x: 26, y: 30 },
          ],
          arrows: [{ from: { x: 50, y: 14 }, to: { x: 50, y: 37 }, kind: 'pass' }],
        },
        options: [
          {
            id: 'A',
            label: 'Stay where you are and see who wins it',
            correct: false,
            feedback:
              'Whoever gets there first picks up the loose ball. If you wait, that will be ' +
              'someone who is already moving.',
          },
          {
            id: 'B',
            label: 'Run back towards your own goal',
            correct: false,
            feedback:
              'Now nobody is near the ball. You gave away the middle of the pitch.',
            marker: { x: 38, y: 66 },
          },
          {
            id: 'C',
            label: 'Move to where the ball is likely to drop and be first to it',
            correct: true,
            feedback:
              'The second ball is up for grabs. Read where it will fall and get there before ' +
              'the others.',
            marker: { x: 45, y: 52 },
          },
        ],
        cue: 'Ball in the air? Watch where it will land, and move there before it does.',
      },
    ],
    pitchGames: [
      {
        name: 'Five-Second Win-Back',
        players: '6 players (3 v 3)',
        setup: 'A pitch about 25 steps long and 20 steps wide, with a small goal at each end.',
        howToPlay:
          'Play a normal game. When a team loses the ball, they have five seconds to win it ' +
          'back. If they do, their next goal is worth double. If they do not, they must ' +
          'drop back to their half.',
        focus: 'Lost it? React in the first second. Not won after five? Get into shape.',
        harder: 'Cut the time to four seconds.',
      },
      {
        name: 'Stay Behind the Ball',
        players: '8 players (4 v 4)',
        setup:
          'A pitch about 40 steps long and 30 steps wide, with a goal at each end. Mark a line ' +
          'across the middle.',
        howToPlay:
          'When your team has the ball, one player must stay behind the ball, in your own ' +
          'half. The other three can go forward. If your team loses it, the player who stayed ' +
          'back marks the nearest attacker. Swap who stays back after every goal.',
        focus: 'If we lose it now, who is mine?',
        harder: 'Make two players stay behind.',
      },
    ],
  },
];

export function getTheme(id: DecisionThemeId): DecisionTheme {
  const theme = DECISION_THEMES.find((t) => t.id === id);
  if (!theme) throw new Error(`Unknown decision theme: ${id}`);
  return theme;
}
