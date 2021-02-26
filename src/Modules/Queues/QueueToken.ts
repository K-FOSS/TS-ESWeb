// src/Modules/Queues/QueueToken.ts
import { Token } from 'typedi';

/**
 * TypeDI Token for the label/name/key of the Workers Queue
 *
 * @default queueToken
 */
export const queueToken = new Token<string>('queueToken');
