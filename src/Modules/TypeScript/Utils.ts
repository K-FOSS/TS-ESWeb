// src/Modules/TypeScript/Utils.ts
import { plainToClass, Transform } from 'class-transformer';
import {
  IsObject,
  isString,
  IsString,
  validateOrReject,
} from 'class-validator';
import { parse } from 'path';
import * as ts from 'typescript';

class CreateTypeScriptProgramInput {
  @IsString()
  @Transform(({ value }) => {
    if (isString(value)) {
      const parsedPath = parse(value);

      if (parsedPath.ext.length > 0) {
        return parsedPath.dir;
      } else {
        return value;
      }
    }

    throw new Error('Invalid string');
  })
  public rootDir: string;

  @IsString({
    each: true,
  })
  public rootNames: string[];

  @IsObject()
  public compilerOptions: ts.CompilerOptions;
}

export async function createTypeScriptProgram(
  inputParams: CreateTypeScriptProgramInput,
): Promise<ts.Program> {
  const input = plainToClass(CreateTypeScriptProgramInput, inputParams);
  await validateOrReject(input);

  const defaultOptions = ts.getDefaultCompilerOptions();
  const options: ts.CompilerOptions = {
    ...defaultOptions,
    ...inputParams.compilerOptions,
  };

  const compilierHost = ts.createCompilerHost({
    ...options,
    rootDir: inputParams.rootDir,
  });

  return ts.createProgram({
    rootNames: inputParams.rootNames,
    options,
    host: compilierHost,
  });
}

type NonPartial<T> = { [P in keyof T]: T[P] };

export function isCommonJSImportSplit(
  input: [string, ts.ResolvedModuleFull][],
): input is [
  [string, NonPartial<ts.ResolvedModuleFull>],
  [string, NonPartial<ts.ResolvedModuleFull>],
] {
  if (
    input.length === 2 &&
    input.every(([_path, resolvedModule]) =>
      resolvedModule.packageId?.subModuleName.includes('cjs'),
    )
  ) {
    return true;
  }

  return false;
}
