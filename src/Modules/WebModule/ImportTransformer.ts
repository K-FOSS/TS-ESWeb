// src/Modules/WebModule/ImportTransformer
import { dirname, resolve } from 'path';
import * as ts from 'typescript';
import { logger } from '../../Library/Logger';
import { Transformer } from '../../Library/Transformers';

const pushDefault = ['react', 'react-dom', 'scheduler', 'scheduler/tracing'];

/**
 * TODO: Setup a type check/`node is XYZ`
 * @param node SourceFile Node to test if it's a dynamic import
 */
function isDynamicImport(node: ts.Node): node is ts.ImportCall {
  if (ts.isCallExpression(node)) {
    return node.expression.kind === ts.SyntaxKind.ImportKeyword;
  }

  return false;
}

function handleImportSpecifier(
  sourceSpecifier: string,
  sourceDirectory: string,
): string {
  let specifier: string;

  const relativeTest = /^\.{0,2}[/]/gm;

  if (relativeTest.test(sourceSpecifier)) {
    specifier = resolve(sourceDirectory, sourceSpecifier);
  } else {
    specifier = sourceSpecifier;
  }

  return `/Static/import?specifier=${specifier}`;
}

export class ImportTransformer extends Transformer {
  public after: Transformer['after'] = (context) => {
    // const relativePathRegex = /^\.{1,2}[/]/;

    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      const visitor: ts.Visitor = (node) => {
        /**
         * Handle "Dynamic imports"
         */

        if (isDynamicImport(node)) {
          const argument = node.arguments[0];

          if (ts.isStringLiteral(argument)) {
            logger.silly(`ImportTransformer isCallExpression:`, {
              argument: argument.text,
              dirName: dirname(sourceFile.fileName),
              fileName: sourceFile.fileName,
            });

            return context.factory.updateCallExpression(
              node,
              node.expression,
              node.typeArguments,
              [
                context.factory.createStringLiteral(
                  handleImportSpecifier(
                    argument.text,
                    dirname(sourceFile.fileName),
                  ),
                ),
              ],
            );
          }
        }

        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          logger.debug(
            `ImportTransformer Import declaration: ${node.moduleSpecifier.text}`,
          );

          let importClause: ts.ImportClause | undefined;
          if (
            pushDefault.includes(node.moduleSpecifier.text) &&
            node.importClause &&
            ts.isImportClause(node.importClause) &&
            node.importClause.name
          ) {
            importClause = context.factory.updateImportClause(
              node.importClause,
              node.importClause?.isTypeOnly || false,
              undefined,
              context.factory.createNamespaceImport(
                context.factory.createIdentifier(
                  node.importClause.name.escapedText.toString(),
                ),
              ),
            );
          }

          if (!importClause) {
            importClause = node.importClause;
          }

          logger.debug(
            `ImportTransformer Import declaration: ${node.moduleSpecifier.text}`,
          );

          return context.factory.updateImportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            importClause,
            context.factory.createStringLiteral(
              handleImportSpecifier(
                node.moduleSpecifier.text,
                dirname(sourceFile.fileName),
              ),
            ),
          );
        }

        if (
          ts.isExportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          /**
           * Return updated import path to use our Service Worker served path
           */
          return context.factory.updateExportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            context.factory.createStringLiteral(
              handleImportSpecifier(
                node.moduleSpecifier.text,
                dirname(sourceFile.fileName),
              ),
            ),
          );
        }

        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode<ts.SourceFile>(sourceFile, visitor);
    };
  };
}
