// src/Modules/Queues/QueueToken.ts
import { Token } from 'typedi';

export const queueToken = new Token<string>('queueToken');
