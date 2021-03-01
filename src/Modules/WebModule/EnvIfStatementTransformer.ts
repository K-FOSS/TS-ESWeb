// src/Modules/WebModule/ImportTransformer
import * as ts from 'typescript';
import { logger } from '../../Library/Logger';
import { Transformer } from '../../Library/Transformers';

export class EnvIfStatement extends Transformer {
  public after: Transformer['after'] = (context) => {
    // const relativePathRegex = /^\.{1,2}[/]/;

    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      const visitor: ts.Visitor = (node) => {
        /**
         * Handle "Dynamic imports"
         */

        if (ts.isIfStatement(node)) {
          logger.silly(`If statement`);
        }

        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode<ts.SourceFile>(sourceFile, visitor);
    };
  };
}
