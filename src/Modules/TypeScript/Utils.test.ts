// src/Modules/TypeScript/Utils.test.ts
import { TestSuite } from '@k-foss/ts-estests';
import { dirname } from 'path';
import * as ts from 'typescript';
import { fileURLToPath } from 'url';
import { createTypeScriptProgram } from './Utils';

export class TypeScriptUtilsSuite extends TestSuite {
  public testName = 'TypeScript Utils Test Suite';

  public async relativeFile(): Promise<void> {
    const filePathURI = await import.meta.resolve('./TSConfig.ts');
    const filePath = fileURLToPath(filePathURI);

    await createTypeScriptProgram({
      rootNames: [],
      rootDir: filePath,
      compilerOptions: {
        jsxFragmentFactory: 'Fragment',
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        allowJs: true,
        checkJs: false,
        noEmit: true,
        noEmitHelpers: true,
        sourceMap: false,
        inlineSourceMap: false,
      },
    });
  }

  public async relativePath(): Promise<void> {
    const filePathURI = await import.meta.resolve('./TSConfig.ts');
    const filePath = fileURLToPath(filePathURI);
    const rootDir = dirname(filePath);

    await createTypeScriptProgram({
      rootNames: [],
      rootDir,
      compilerOptions: {
        jsxFragmentFactory: 'Fragment',
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        allowJs: true,
        checkJs: false,
        noEmit: true,
        noEmitHelpers: true,
        sourceMap: false,
        inlineSourceMap: false,
      },
    });
  }

  public async test(): Promise<void> {
    await Promise.all([this.relativePath(), this.relativeFile()]);
  }
}
