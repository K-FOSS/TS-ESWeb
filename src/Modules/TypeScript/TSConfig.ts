/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
// src/Modules/TypeScript/TSConfig.ts
import { dirname as pathDirname, isAbsolute as isAbsolutePath } from 'path';
import {
  CompilerOptions,
  convertCompilerOptionsFromJson,
  findConfigFile,
  JsxEmit,
  ModuleKind,
  ModuleResolutionKind,
  readConfigFile,
  ScriptTarget,
  sys,
} from 'typescript';

let tsConfigCache: CompilerOptions;

export function getTSConfig(modulePath: string): CompilerOptions {
  if (tsConfigCache) return tsConfigCache;

  const tsConfigPath = findConfigFile(modulePath, sys.fileExists);

  if (!tsConfigPath || !isAbsolutePath(tsConfigPath)) {
    // If no `tsconfig.json` then we force the module to be transpiled as `ESNext`
    tsConfigCache = {
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.NodeJs,
      outDir: 'dist',

      jsx: JsxEmit.React,
      allowJs: true,
    };
  } else {
    const tsConfigFile = readConfigFile(tsConfigPath, sys.readFile).config;
    tsConfigCache = convertCompilerOptionsFromJson(
      tsConfigFile.compilerOptions,
      pathDirname(tsConfigPath),
    ).options;
  }

  return tsConfigCache;
}
