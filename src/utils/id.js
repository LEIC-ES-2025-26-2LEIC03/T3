import 'react-native-get-random-values'; // polyfill must come before uuid import
import { v4 as uuidv4 } from 'uuid';

export function generateId() {
  return uuidv4();
}
