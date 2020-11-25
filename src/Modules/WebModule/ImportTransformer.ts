// src/Modules/WebModule/ImportTransformer
import * as ts from 'typescript';
import { Transformer } from '../../Library/Transformers';
import { resolve, dirname } from 'path';

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
            return ts.updateCall(node, node.expression, node.typeArguments, [
              ts.createStringLiteral(
                `/Static/import?specifier=${resolve(
                  dirname(sourceFile.fileName),
                  argument.text,
                )}`,
              ),
            ]);
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

          let specifier: string;
          if (relativeTest.test(node.moduleSpecifier.text)) {
            specifier = resolve(
              dirname(sourceFile.fileName),
              node.moduleSpecifier.text,
            );
          } else {
            specifier = node.moduleSpecifier.text;
          }

          let importClause: ts.ImportClause | undefined;
          if (
            pushDefault.includes(node.moduleSpecifier.text) &&
            node.importClause &&
            ts.isImportClause(node.importClause) &&
            node.importClause.name
          ) {
            importClause = ts.updateImportClause(
              node.importClause,
              undefined,
              ts.createNamespaceImport(
                ts.createIdentifier(
                  node.importClause.name.escapedText.toString(),
                ),
              ),
              node.importClause?.isTypeOnly,
            );
          }

          if (!importClause) {
            importClause = node.importClause;
          }

          return ts.updateImportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            importClause,
            ts.createLiteral(`/Static/import?specifier=${specifier}`),
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
          return ts.updateExportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.exportClause,
            ts.createLiteral(`/Static/import?specifier=${specifier}`),
            node.isTypeOnly,
          );
        }

        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode<ts.SourceFile>(sourceFile, visitor);
    };
  };
}
