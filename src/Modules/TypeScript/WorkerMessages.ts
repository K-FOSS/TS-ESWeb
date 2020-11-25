// src/Modules/TypeScript/WorkerMessages.ts
export enum TranspileWorkerMessageType {
  READY,
  PUSH_OUTPUT,
  PUSH_DEPENDENCY,
  PUSH_HMR,
}

interface TranspileWorkerPushOutputMessage {
  type: TranspileWorkerMessageType.PUSH_OUTPUT;

  filePath: string;

  outputCode: string;
}

interface TranspileWorkerPushDependencyMessage {
  type: TranspileWorkerMessageType.PUSH_DEPENDENCY;

  specifier: string;

  filePath: string;
}

interface TranspileWorkerPushHMRMessage {
  type: TranspileWorkerMessageType.PUSH_HMR;

  filePath: string;
}

interface TranspileWorkerReadyMessage {
  type: TranspileWorkerMessageType.READY;
}

export type TranspileWorkerMessage =
  | TranspileWorkerPushOutputMessage
  | TranspileWorkerReadyMessage
  | TranspileWorkerPushHMRMessage
  | TranspileWorkerPushDependencyMessage;
