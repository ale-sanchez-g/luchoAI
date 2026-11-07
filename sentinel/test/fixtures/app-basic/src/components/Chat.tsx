import { call } from '../lib/api';

export default function Chat() {
  void call('/chat');
  return null;
}
