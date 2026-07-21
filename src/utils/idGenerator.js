import { v4 as uuidv4 } from 'uuid';

export function generateTransactionId() {
  return uuidv4();
}
