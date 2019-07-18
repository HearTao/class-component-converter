import * as ts from 'typescript';
import createVHost from './host';
import {
    classNeedTransform,
    transformClassDeclaration,
    transformPropertyAccessExpression,
    transformIdentifier,
    transformVariableStatement
} from './transform';

export function classTransformer(
    checker: ts.TypeChecker
): ts.TransformerFactory<ts.SourceFile> {
    return context => {
        const visitor: ts.Visitor = node => {
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                    return classDeclarationVisitor(node as ts.ClassDeclaration);
                case ts.SyntaxKind.PropertyAccessExpression:
                    return propertyAccessExpressionVisitor(
                        node as ts.PropertyAccessExpression
                    );
                case ts.SyntaxKind.Identifier:
                    return identifierVisitor(node as ts.Identifier);
                case ts.SyntaxKind.VariableStatement:
                    return variableStatement(node as ts.VariableStatement);
                default:
                    return ts.visitEachChild(node, visitor, context);
            }
        };
        return n => ts.visitNode(n, visitor);

        function classDeclarationVisitor(declaration: ts.ClassDeclaration) {
            if (classNeedTransform(checker, declaration)) {
                return transformClassDeclaration(
                    checker,
                    visitor,
                    context,
                    declaration
                );
            }
            return ts.visitEachChild(declaration, visitor, context);
        }

        function propertyAccessExpressionVisitor(
            declaration: ts.PropertyAccessExpression
        ) {
            return transformPropertyAccessExpression(
                checker,
                ts.visitEachChild(declaration, visitor, context)
            );
        }

        function identifierVisitor(declaration: ts.Identifier) {
            return transformIdentifier(
                ts.visitEachChild(declaration, visitor, context),
                checker
            );
        }

        function variableStatement(declaration: ts.VariableStatement) {
            return transformVariableStatement(
                checker,
                ts.visitEachChild(declaration, visitor, context)
            );
        }
    };
}

export function convert(code: string): string {
    const host = createVHost();

    const filename = 'mod.tsx';

    host.writeFile(filename, code, false);

    const program = ts.createProgram(
        [filename],
        {
            jsx: ts.JsxEmit.Preserve,
            experimentalDecorators: true,
            target: ts.ScriptTarget.Latest
        },
        host
    );

    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(filename);

    const result = ts.transform(sourceFile!, [classTransformer(checker)]);

    const printer = ts.createPrinter();
    const newCode = printer.printFile(result.transformed[0]);
    return newCode;
}
