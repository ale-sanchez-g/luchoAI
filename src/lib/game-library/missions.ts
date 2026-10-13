import type { MatchMission } from '@/types';

// A mission is one small thing a player controls and can notice for themselves. None of them
// depend on the score, a goal or the result, so a bad day on the scoreboard can't spoil one.
export const MATCH_MISSIONS: MatchMission[] = [
  {
    id: 'first-touch-away-from-trouble',
    title: 'Touch away from trouble',
    mission:
      'When an opponent is close, try to use your first touch to move the ball away from them.',
    why: 'A touch away from the opponent gives you time to look up and choose.',
    afterMatch: 'Can you remember one time it worked? What did you see before it arrived?',
    skill: 'first-touch',
    ages: [8, 10],
  },
  {
    id: 'first-touch-scan-then-touch',
    title: 'Scan twice, then touch',
    mission:
      'In the three seconds before the ball reaches you, try to look around twice. Then use ' +
      'your first touch to move away from the nearest opponent.',
    why: 'Knowing what is around you makes your first touch quicker and safer.',
    afterMatch: 'Which look came easiest? What did you notice when you looked?',
    skill: 'first-touch',
    ages: [11, 13],
  },
  {
    id: 'first-touch-decide-early',
    title: 'Decide before it arrives',
    mission:
      'Try to choose where your next touch will go before the ball reaches you, and then do it.',
    why: 'Players who decide early look calm because they already have time.',
    afterMatch:
      'When you decided early, what did you notice? When you did not, what got in the way?',
    skill: 'first-touch',
    ages: [14, 18],
  },
  {
    id: 'passing-weaker-foot-three',
    title: 'Three passes, weaker foot',
    mission: 'Try to make three passes with your weaker foot during the match, when it is safe.',
    why: 'Each time you use your weaker foot, it gets a little stronger.',
    afterMatch: 'How did your last weaker-foot pass feel compared with the first?',
    skill: 'passing',
    ages: [8, 10],
  },
  {
    id: 'passing-look-forward-first',
    title: 'Look forward first',
    mission:
      'Each time you get the ball, try to look for a forward pass first. Pass sideways or ' +
      'back only if forward is not on.',
    why: 'Forward passes move your team closer to goal and make the other team work harder.',
    afterMatch: 'How often was a forward pass on? What stopped you when it was not?',
    skill: 'passing',
    ages: [11, 13],
  },
  {
    id: 'passing-pass-and-join-in',
    title: 'Pass, then join in',
    mission:
      'After each pass, try to move into a new space where your teammate could pass to you ' +
      'again.',
    why: 'A pass followed by a run gives your team a second option and keeps defenders moving.',
    afterMatch: 'Which of your runs got the best response from your teammate?',
    skill: 'passing',
    ages: [14, 18],
  },
  {
    id: 'dribbling-head-up-three',
    title: 'Look up three times',
    mission: 'Try to look up three times during every dribble, before you pass or shoot.',
    why: 'Looking up lets you see teammates and gaps, not just the ball.',
    afterMatch: 'What did you see when you looked up that you would have missed?',
    skill: 'dribbling',
    ages: [8, 10],
  },
  {
    id: 'dribbling-slow-then-go',
    title: 'Slow, then go',
    mission:
      'When you dribble at a defender, try slowing down a little and then speeding up past ' +
      'them.',
    why: 'A sudden change of speed is hard for a defender to read.',
    afterMatch: 'Did you slow down enough? What happened when you sped up?',
    skill: 'dribbling',
    ages: [11, 13],
  },
  {
    id: 'dribbling-protect-then-turn',
    title: 'Protect it, then turn',
    mission:
      'When a defender is close behind you, try to keep your body between them and the ball, ' +
      'then turn when there is space.',
    why: 'Protecting the ball gives you time, and the turn is quicker when you pick your moment.',
    afterMatch: 'How did you know it was the right moment to turn?',
    skill: 'dribbling',
    ages: [14, 18],
  },
  {
    id: 'taking-on-be-brave-once',
    title: 'Be brave once',
    mission:
      'Try one dribble past an opponent in the other team’s half. It is okay if it does not ' +
      'work.',
    why: 'Every great dribbler tried it and missed first. Trying is how you get better.',
    afterMatch: 'What did you try? What would you do the same, or differently, next time?',
    skill: 'taking-on',
    ages: [8, 10],
  },
  {
    id: 'taking-on-pick-your-moment',
    title: 'Pick your moment',
    mission:
      'Try one take-on when you have space around you and a teammate behind you for support.',
    why: 'The best time to dribble is when losing the ball would not leave your team in trouble.',
    afterMatch: 'How did you choose your moment? Was a teammate close enough to help?',
    skill: 'taking-on',
    ages: [11, 13],
  },
  {
    id: 'taking-on-have-a-plan-b',
    title: 'Have a plan B',
    mission:
      'Before you take someone on, quickly notice where you would pass if it goes wrong.',
    why: 'Knowing your plan B lets you attack with confidence.',
    afterMatch: 'When you had a plan B, did you feel braver? Did you need to use it?',
    skill: 'taking-on',
    ages: [14, 18],
  },
  {
    id: 'defending-1v1-stand-tall-and-wait',
    title: 'Stay on your feet and wait',
    mission:
      'When you defend, try to stand between the attacker and the goal, wait, and not lunge ' +
      'in.',
    why: 'Patient defenders stay on their feet, so one slip does not leave a gap behind them.',
    afterMatch: 'What happened when you were patient?',
    skill: 'defending-1v1',
    ages: [8, 10],
  },
  {
    id: 'defending-1v1-close-at-an-angle',
    title: 'Close down at an angle',
    mission: 'Try to close down an attacker at an angle and stop one step away from them.',
    why: 'Stopping a step away lets you react if they move, without being easily beaten.',
    afterMatch: 'Where did you stop? How did the attacker react?',
    skill: 'defending-1v1',
    ages: [11, 13],
  },
  {
    id: 'defending-1v1-show-them-one-way',
    title: 'Show them one way',
    mission:
      'Try to show an attacker one way (usually towards the sideline) and stay on your feet ' +
      'as they go.',
    why: 'If an attacker has only one way to go, the defender can plan for it.',
    afterMatch: 'Which side did you show them? Did it help your teammates?',
    skill: 'defending-1v1',
    ages: [14, 18],
  },
  {
    id: 'finishing-pick-a-corner',
    title: 'Pick a corner first',
    mission:
      'Each time you have a shot, pick the corner you will aim for before you hit it.',
    why: 'Having a plan makes your shot more accurate and your decision quicker.',
    afterMatch: 'Where did you aim? Did you pick a corner early enough?',
    skill: 'finishing',
    ages: [8, 10],
  },
  {
    id: 'finishing-shoot-early-and-low',
    title: 'Early and low',
    mission:
      'When you have a clear chance, try to shoot within two touches and keep the ball low.',
    why: 'An early, low shot gives the goalkeeper less time to get set.',
    afterMatch: 'Did you shoot early? What did you notice about the keeper?',
    skill: 'finishing',
    ages: [11, 13],
  },
  {
    id: 'finishing-follow-your-shot',
    title: 'Follow your shot',
    mission:
      'After every shot, try to run towards the goal in case the ball comes back out, and keep ' +
      'clear of the goalkeeper.',
    why: 'Rebounds happen a lot, and the player who is already there gets the next chance.',
    afterMatch: 'Did a rebound come to you? What did you notice as you ran in?',
    skill: 'finishing',
    ages: [14, 18],
  },
  {
    id: 'goalkeeping-be-the-loudest-voice',
    title: 'Be the loudest voice',
    mission:
      'Try to call “keeper!” or “away!” every time there is a loose ball or a cross in your ' +
      'area.',
    why: 'Loud, early calls help your defenders know exactly what to do.',
    afterMatch: 'How did your calls help your teammates? What was the best one?',
    skill: 'goalkeeping',
    ages: [8, 10],
  },
  {
    id: 'goalkeeping-ready-before-every-shot',
    title: 'Ready before every shot',
    mission:
      'When the ball comes near your box, try to get into your ready position: feet apart, ' +
      'knees bent, hands up.',
    why: 'A good ready position lets you move quickly in any direction.',
    afterMatch: 'What helped you get ready in time?',
    skill: 'goalkeeping',
    ages: [11, 13],
  },
  {
    id: 'goalkeeping-start-the-attack-quickly',
    title: 'Start the attack quickly',
    mission:
      'After you win the ball, try to look up and choose a teammate in space before you throw or ' +
      'pass.',
    why: 'A quick, accurate throw or pass can turn defending into attacking.',
    afterMatch: 'Which distribution worked best? What did you see just before you released it?',
    skill: 'goalkeeping',
    ages: [14, 18],
  },
  {
    id: 'movement-move-after-passing',
    title: 'Move after every pass',
    mission: 'Try to move to a new open space straight after each pass.',
    why: 'A moving player is easier to find, and defenders have to follow.',
    afterMatch: 'Where did you move to? When did your teammates find you?',
    skill: 'movement',
    ages: [8, 10],
  },
  {
    id: 'movement-show-at-an-angle',
    title: 'Show at an angle',
    mission: 'Try to show for the ball at an angle, so your passer has a clear line to you.',
    why: 'Standing behind a teammate or a defender makes you hard to pass to.',
    afterMatch: 'How did you find a clear line? Where was the defender?',
    skill: 'movement',
    ages: [11, 13],
  },
  {
    id: 'movement-adjust-when-the-ball-switches',
    title: 'Adjust when the ball switches',
    mission: 'Try to adjust your position each time the ball switches sides of the pitch.',
    why: 'Good positions in the next phase start with a small move in this one.',
    afterMatch: 'When did you adjust well? What did you see that told you to move?',
    skill: 'movement',
    ages: [14, 18],
  },
  {
    id: 'team-defending-get-goal-side',
    title: 'Get behind the ball',
    mission:
      'When your team loses the ball, try to run back to stand between the ball and your goal.',
    why: 'Getting goal-side quickly helps your whole team defend.',
    afterMatch: 'What helped you get back? What slowed you down?',
    skill: 'team-defending',
    ages: [8, 10],
  },
  {
    id: 'team-defending-press-together',
    title: 'Press together',
    mission:
      'When a teammate goes to press the ball, try to move close to the nearest opponent they ' +
      'could pass to.',
    why:
      'When one player presses and others close the passing lanes, the ball carrier has fewer ' +
      'options.',
    afterMatch: 'When you helped a teammate press, what happened next?',
    skill: 'team-defending',
    ages: [11, 13],
  },
  {
    id: 'team-defending-keep-the-gaps-small',
    title: 'Keep the gaps small',
    mission:
      'Try to keep the space between you and your nearest teammates small, sliding together ' +
      'as the ball moves.',
    why: 'A compact team has no easy gaps for the other team to pass through.',
    afterMatch: 'When were your team’s gaps smallest? What helped you slide together?',
    skill: 'team-defending',
    ages: [14, 18],
  },
  {
    id: 'transitions-win-it-look-up',
    title: 'Win it, look up, go',
    mission:
      'When your team wins the ball, try to look for a forward pass first, before anything else.',
    why: 'The other team is out of shape for a few seconds, and a forward pass uses them.',
    afterMatch: 'What did you see when you looked forward first?',
    skill: 'transitions',
    ages: [8, 10],
  },
  {
    id: 'transitions-find-a-teammate-first',
    title: 'Find a teammate first',
    mission: 'After you win the ball, try to find a teammate before you pass or dribble.',
    why: 'A quick look first stops a rushed pass that gives the ball straight back.',
    afterMatch: 'What did you notice when you looked first?',
    skill: 'transitions',
    ages: [11, 13],
  },
  {
    id: 'transitions-recover-in-five',
    title: 'Start your run back',
    mission:
      'After your team loses the ball, try to start your run back behind the ball straight away.',
    why: 'A fast recovery run helps the whole team, even if you do not win the ball.',
    afterMatch: 'What helped you start the run back, and what slowed you down?',
    skill: 'transitions',
    ages: [14, 18],
  },
  {
    id: 'vision-glance-twice',
    title: 'Glance over your shoulder',
    mission: 'Try to glance over your shoulder twice before each pass arrives.',
    why: 'Knowing what is around you helps you choose your first touch.',
    afterMatch: 'What did you see when you looked?',
    skill: 'vision',
    ages: [8, 10],
  },
  {
    id: 'vision-notice-three-things',
    title: 'Notice three things',
    mission:
      'At a quiet moment, try to notice where the nearest opponent, your nearest teammate and ' +
      'the open space are.',
    why: 'Players who know what is around them decide faster, and with less panic.',
    afterMatch: 'What did you notice that you would normally miss?',
    skill: 'vision',
    ages: [11, 13],
  },
  {
    id: 'vision-scan-before-receiving',
    title: 'Scan before you receive',
    mission:
      'For one half, try to scan before every time you receive the ball. Afterwards, notice ' +
      'how often you managed it.',
    why: 'Scanning is a habit, and habits are built one match at a time.',
    afterMatch: 'How did scanning change your first touch? What would help you do it more?',
    skill: 'vision',
    ages: [14, 18],
  },
  {
    id: 'creativity-enjoy-a-skill',
    title: 'Try a skill you enjoy',
    mission:
      'Try one skill you have been practising, somewhere on the pitch where it is safe to ' +
      'try, and enjoy it.',
    why:
      'Practising is how skills become part of your game, and trying them in a match is the next ' +
      'step.',
    afterMatch: 'What did you try? What did you enjoy about it?',
    skill: 'creativity',
    ages: [8, 10],
  },
  {
    id: 'creativity-try-one-new-move',
    title: 'Try one new move',
    mission:
      'Try one new move in a safe area of the pitch. It is okay if it does not work, because ' +
      'that is how you learn.',
    why: 'Good players try new things in safe spaces first, then use them when it counts.',
    afterMatch: 'What did you try? What happened, and what did you learn from it?',
    skill: 'creativity',
    ages: [11, 13],
  },
  {
    id: 'creativity-one-surprise',
    title: 'One surprise',
    mission:
      'Try one thing the other team does not expect, such as a disguised pass or a change of ' +
      'direction.',
    why: 'Defenders prepare for what they expect. A little surprise creates space.',
    afterMatch: 'What was your surprise? How did the defender react?',
    skill: 'creativity',
    ages: [14, 18],
  },
  {
    id: 'athleticism-warm-up-properly',
    title: 'Warm up properly',
    mission:
      'Do a full warm-up before kick-off: join your team’s, or jog, stretch and touch the ball ' +
      'for ten minutes.',
    why: 'A good warm-up can lower the chance of getting hurt and helps your body feel ready.',
    afterMatch: 'How did your body feel in the first ten minutes? Would you change your warm-up?',
    skill: 'athleticism',
    ages: [8, 18],
  },
  {
    id: 'athleticism-drink-at-breaks',
    title: 'Drink at every break',
    mission: 'Take a drink of water at every break in the game.',
    why: 'Small, regular drinks help you keep your energy and your focus.',
    afterMatch: 'Did you feel different when you drank? What helped you remember?',
    skill: 'athleticism',
    ages: [8, 18],
  },
  {
    id: 'athleticism-first-three-steps',
    title: 'Win the first three steps',
    mission: 'Try to start every sprint with quick, strong first steps.',
    why: 'The first three steps decide most races to the ball.',
    afterMatch: 'When did your first steps help you? What got you started best?',
    skill: 'athleticism',
    ages: [11, 13],
  },
  {
    id: 'teamwork-say-yours-or-time',
    title: 'Say “yours” or “time”',
    mission:
      'Try to say “yours” or “time” to a teammate three times, so they know what is happening ' +
      'behind them.',
    why: 'A short call tells a teammate they are free and gives them confidence.',
    afterMatch: 'How did your teammates react to the calls? Which one was the best?',
    skill: 'teamwork',
    ages: [8, 10],
  },
  {
    id: 'teamwork-warn-the-player-on-the-ball',
    title: 'Warn them early',
    mission: 'Try to warn the player on the ball early, with calls like “player on” or “turn”.',
    why: 'Players with the ball cannot see behind them, so your voice is their eyes.',
    afterMatch: 'When did a call help a teammate? What would you say next time?',
    skill: 'teamwork',
    ages: [11, 13],
  },
  {
    id: 'teamwork-one-organising-call',
    title: 'One organising call',
    mission: 'Try to give one useful call each phase of play, such as “squeeze up” or “step out”.',
    why: 'Clear calls from many players help a team move as one.',
    afterMatch: 'Which call changed what your team did? How did you know to make it?',
    skill: 'teamwork',
    ages: [14, 18],
  },
  {
    id: 'teamwork-next-ball',
    title: 'Say “next ball”',
    mission: 'After a mistake, take one slow breath and say “next ball” before you carry on.',
    why: 'The next ball is the only one you can still change.',
    afterMatch: 'How did saying it feel? What happened on the next ball?',
    skill: 'teamwork',
    ages: [8, 10],
  },
  {
    id: 'teamwork-three-second-reset',
    title: 'Three-second reset',
    mission:
      'After a mistake, try a three-second reset: breathe out, drop your shoulders and name ' +
      'your next job.',
    why: 'A short routine stops one mistake becoming three.',
    afterMatch: 'How did the reset help? What was your next job each time?',
    skill: 'teamwork',
    ages: [11, 13],
  },
  {
    id: 'teamwork-talk-like-a-coach',
    title: 'Talk to yourself like a coach',
    mission: 'When you are annoyed with yourself, ask: what is the next useful thing to do?',
    why: 'A kind, practical voice helps you recover faster than a harsh one.',
    afterMatch: 'What did you say to yourself? How did it change what you did next?',
    skill: 'teamwork',
    ages: [14, 18],
  },
  {
    id: 'teamwork-cheer-a-teammate',
    title: 'Cheer up a teammate',
    mission: 'After a teammate makes a mistake, try to say something kind or helpful to them.',
    why: 'Teammates play better when they feel supported.',
    afterMatch: 'What did you say? How did it help?',
    skill: 'teamwork',
    ages: [8, 10],
  },
  {
    id: 'teamwork-fair-play',
    title: 'Play fair and say thanks',
    mission:
      'Thank the referee once. If an opponent falls, ask if they are okay, and if they look ' +
      'hurt, call the referee or a grown-up instead of moving them.',
    why: 'Fair play is part of being a good teammate and a good competitor.',
    afterMatch: 'How did it feel? How did the other player or the referee react?',
    skill: 'teamwork',
    ages: [11, 13],
  },
  {
    id: 'teamwork-encourage-the-bench',
    title: 'Encourage the bench first',
    mission:
      'Try to encourage a substitute or a teammate who is not playing before you talk to anyone ' +
      'else.',
    why: 'A good team culture includes everyone, on and off the pitch.',
    afterMatch: 'What did you say? How did the teammate react?',
    skill: 'teamwork',
    ages: [14, 18],
  },
  {
    id: 'teamwork-slow-breathing',
    title: 'One minute of slow breathing',
    mission:
      'Before kick-off, take one minute of slow breathing: in for four, out for six.',
    why: 'Slow breathing helps your body settle, so you can think clearly when the game starts.',
    afterMatch: 'How did you feel at kick-off? Would you do it again?',
    skill: 'teamwork',
    ages: [8, 18],
  },
  {
    id: 'teamwork-share-your-mission',
    title: 'Share your mission',
    mission: 'Tell one teammate your mission before kick-off, and ask them what theirs is.',
    why: 'Saying it out loud makes it more real, and you can help each other.',
    afterMatch: 'What was your teammate’s mission? How could you help each other next time?',
    skill: 'teamwork',
    ages: [11, 18],
  },
  {
    id: 'teamwork-one-fun-moment',
    title: 'One fun moment, one lesson',
    mission: 'After the game, name one fun moment and one thing you learned.',
    why: 'Remembering the good parts and the lessons helps you enjoy football and keep growing.',
    afterMatch: 'What was your fun moment? What was your lesson?',
    skill: 'teamwork',
    ages: [8, 10],
  },
  {
    id: 'teamwork-tell-a-trusted-adult',
    title: 'Tell someone what went well',
    mission:
      'After the match, tell a trusted adult what went well and one thing you will try next ' +
      'time.',
    why: 'Talking about it helps you remember what worked and feel supported.',
    afterMatch: 'What did you tell them? How did they respond?',
    skill: 'teamwork',
    ages: [11, 13],
  },
  {
    id: 'teamwork-three-lines',
    title: 'Three lines after the match',
    mission:
      'After the match, write three lines: your effort, what you learned and one thing to try ' +
      'next time. No scores.',
    why: 'A few honest lines turn every match, whatever the result, into progress.',
    afterMatch: 'What did you notice when you wrote it down? Did anything surprise you?',
    skill: 'teamwork',
    ages: [14, 18],
  },
];
