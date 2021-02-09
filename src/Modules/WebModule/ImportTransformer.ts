// src/Modules/WebModule/ImportTransformer
import { dirname, resolve } from 'path';
import * as ts from 'typescript';
import { logger } from '../../Library/Logger';
import { Transformer } from '../../Library/Transformers';

const pushDefault = ['react', 'react-dom', 'scheduler', 'scheduler/tracing'];

export class ImportTransformer extends Transformer {
  public after: Transformer['before'] = (context) => {
    // const relativePathRegex = /^\.{1,2}[/]/;

    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      const visitor: ts.Visitor = (node) => {
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          const argument = node.arguments[0];

          if (ts.isStringLiteral(argument)) {
            return context.factory.updateCallExpression(
              node,
              node.expression,
              node.typeArguments,
              [
                context.factory.createStringLiteral(
                  `/Static/import?specifier=${resolve(
                    dirname(sourceFile.fileName),
                    argument.text,
                  )}`,
                ),
              ],
            );
          }
        }

        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          // let specifier: string;
          // if (relativePathRegex.test(node.moduleSpecifier.text)) {
          //   specifier = resolvePath(
          //     node.moduleSpecifier.text,
          //     pathToFileURL(sourceFile.fileName).href,
          //   );
          //   return node;
          // } else {
          //   specifier =
          //   console.log(
          //     `Set new specififer to '/Static/import?specifier=${node.moduleSpecifier.text}'`,
          //   );
          // }
          const relativeTest = /^\.{0,2}[/]/gm;

          logger.debug(
            `ImportTransformer Import declaration: ${node.moduleSpecifier.text}`,
          );

          let specifier: string;
          if (relativeTest.test(node.moduleSpecifier.text)) {
            specifier = resolve(
              dirname(sourceFile.fileName),
              node.moduleSpecifier.text,
            );
          } else {
            if (node.moduleSpecifier.text === 'react/jsx-dev-runtime') {
              specifier = 'react/cjs/react-jsx-dev-runtime.development';
            } else {
              specifier = node.moduleSpecifier.text;
            }
          }

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

          return context.factory.updateImportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            importClause,
            context.factory.createStringLiteral(
              `/Static/import?specifier=${specifier}`,
            ),
          );
        }

        if (
          ts.isExportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const relativeTest = /^\.{0,2}[/]/gm;

          let specifier: string;
          if (relativeTest.test(node.moduleSpecifier.text)) {
            specifier = resolve(
              dirname(sourceFile.fileName),
              node.moduleSpecifier.text,
            );
          } else {
            specifier = node.moduleSpecifier.text;
          }

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
              `/Static/import?specifier=${specifier}`,
            ),
          );
        }

        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode<ts.SourceFile>(sourceFile, visitor);
    };
  };
}
