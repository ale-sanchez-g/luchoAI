/** Names of the leaf icons in `public/icons`. Source files live in `iconography/leaf`. */
export const ICON_NAMES = [
  'ball', 'basketball', 'bed', 'bolt', 'books', 'brain', 'butterfly', 'chat', 'check-circle',
  'clipboard', 'confused', 'dumbbell', 'eyes', 'flame', 'glove', 'goal', 'grin', 'gymnast',
  'heart', 'hug', 'medal', 'neutral', 'palette', 'people', 'refresh', 'robot', 'runner', 'sad',
  'shield', 'shuffle', 'sleepy', 'smile', 'smile-happy', 'smile-soft', 'sneaker', 'sparkles',
  'speaking', 'sprout', 'stadium', 'star', 'stopwatch', 'target', 'thinking', 'trophy', 'wall',
  'whirl', 'wind', 'worried',
] as const;

export type IconName = (typeof ICON_NAMES)[number];
