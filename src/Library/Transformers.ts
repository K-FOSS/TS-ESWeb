// src/Library/Transformers.ts
import {
  CustomTransformers,
  Program,
  TransformerFactory,
  SourceFile,
  Bundle,
} from 'typescript';
import { findModuleFiles } from '../Utils/moduleFileFinder';
import { cjsToEsmTransformerFactory } from 'cjstoesm';
import { logger } from './Logger';
import { ClassType } from 'type-graphql';

let customTransformers: CustomTransformers;

/**
 * TypeScript Transformer
 */
export abstract class Transformer {
  /**
   * TypeScript Program
   */
  public program: Program;

  public constructor(program: Program) {
    this.program = program;
  }

  /**
   * Transformer before the TypeScript ones (code has not been compiled)
   */
  public before?: TransformerFactory<SourceFile>;

  /**
   *  transformers after the TypeScript ones (code has been compiled)
   */
  public after?: TransformerFactory<SourceFile>;

  /**
   * Custom transformers to evaluate after built-in .d.ts transformations.
   */
  public afterDeclarations?: TransformerFactory<Bundle | SourceFile>;
}

interface TransformersObject {
  before: TransformerFactory<SourceFile>[];

  after: TransformerFactory<SourceFile>[];
}

/**
 * Example Transformer so the findModuleFiles returns non abstract
 */
class ExampleTransformer extends Transformer {
  public program: Transformer['program'];

  public after: Transformer['after'] = () => {
    return (sourceFile: SourceFile): SourceFile => {
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

    /**
     * For each found transformer module push all exported functions into our array
     */
    transformerFiles.map((transformerExports) =>
      Object.entries(transformerExports).map(([, TransformerClass]) => {
        const transformerClass = new TransformerClass(compilerProgram);

        for (const [key, value] of Object.entries(transformerClass) as [
          keyof CustomTransformers,
          Transformer[keyof CustomTransformers],
        ][]) {
          const transformerArray = customTransformers[key];

          if (transformerArray) {
            transformerArray.push(value as never);
          }
        }

        return transformerClass;
      }),
    );
  }

  return customTransformers;
}

export class TypeScriptTransformerController {
  public transformers: Transformer[];

  private async findTransformers(): Promise<Transformer[]> {
    const modules = await findModuleFiles<{
      [key: string]: ClassType<Transformer>;
    }>(/.*Transformer\.(js|ts)/);

    return modules.flatMap((moduleExports) =>
      Object.values(moduleExports).map(
        (TransformerClass) => new TransformerClass(),
      ),
    );
  }

  /**
   * Load transformer modules and return the transformers object
   */
  public async loadTransformers(): Promise<TransformersObject> {
    const transformers = await this.findTransformers();

    return transformers.reduce<TransformersObject>(
      (accumulator, currentValue) => {
        const returned = Object.fromEntries(
          (Object.keys(accumulator) as ['before', 'after']).map((key) =>
            typeof currentValue[key] !== 'undefined'
              ? [key, [...accumulator[key], currentValue[key]]]
              : [key, accumulator[key]],
          ),
        ) as TransformersObject;

        logger.silly('transformers reduce: ', {
          transformers,
          accumulator,
          currentValue,
        });

        return returned;
      },
      {
        before: [cjsToEsmTransformerFactory()],
        after: [],
      } as TransformersObject,
    );
  }
}
