// src/Library/Transformers.ts
import {
  CustomTransformers,
  Program,
  TransformerFactory,
  SourceFile,
  Bundle,
} from 'typescript';
import { findModuleFiles } from '../Utils/moduleFileFinder';
import { cjsToEsmTransformerFactory } from '@wessberg/cjs-to-esm-transformer';

let customTransformers: CustomTransformers;

/**
 * TypeScript Transformer
 */
export abstract class Transformer {
  /**
   * TypeScript Program
   */
  public program: Program;

  constructor(program: Program) {
    this.program = program;
  }

  /**
   * Transformer before the TypeScript ones (code has not been compiled)
   */
  before?: TransformerFactory<SourceFile>;

  /**
   *  transformers after the TypeScript ones (code has been compiled)
   */
  after?: TransformerFactory<SourceFile>;

  /**
   * Custom transformers to evaluate after built-in .d.ts transformations.
   */
  afterDeclarations?: TransformerFactory<Bundle | SourceFile>;
}

/**
 * Example Transformer so the findModuleFiles returns non abstract
 */
class ExampleTransformer extends Transformer {
  public program: Transformer['program'];

  after: Transformer['after'] = (context) => {
    return (sourceFile: SourceFile) => {
      return sourceFile;
    };
  };
}

type TransformerModule = {
  [key: string]: typeof ExampleTransformer;
};

/**
 *
 * @param compilerProgram TypeScript CompilerProgram
 */
export async function getTransformers(
  compilerProgram: Program,
): Promise<CustomTransformers> {
  if (!customTransformers) {
    const transformerFiles = await findModuleFiles<TransformerModule>(
      /.*Transformer\.ts/gm,
    );

    customTransformers = {
      before: [cjsToEsmTransformerFactory()],
      after: [],
      afterDeclarations: [],
    };

    transformerFiles.map((transformerExports) =>
      Object.entries(transformerExports).map(([string, TransformerClass]) => {
        const transformerClass = new TransformerClass(compilerProgram);

        for (const [key, value] of Object.entries(transformerClass) as [
          keyof CustomTransformers,
          Transformer[keyof CustomTransformers],
        ][]) {
          const transformerArray = customTransformers[key];

          if (transformerArray) {
            transformerArray.push(value as any);
          }
        }

        return transformerClass;
      }),
    );
  } else {
    console.log('Cached');
  }

  return customTransformers;
}
