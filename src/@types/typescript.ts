// src/@types/typescript.ts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ResolvedModuleFull, SourceFile as TSSource } from 'typescript';

type ResolvedModuleMap = Map<string, ResolvedModuleFull>;

declare module 'typescript' {
  interface SourceFile extends TSSource {
    imports: Token<SyntaxKind.ImportClause>[];
    resolvedModules: ResolvedModuleMap;
  }
}
