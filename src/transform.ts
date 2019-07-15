import * as ts from 'typescript';
import { some, or } from './utils';
import { isVueClass, isComponentDecorator } from './helper';

export function classNeedTransform(
    node: ts.ClassLikeDeclaration,
    checker: ts.TypeChecker
): boolean {
    return (
        some(
            node.heritageClauses,
            x =>
                x.token === ts.SyntaxKind.ExtendsKeyword &&
                some(x.types, type => isVueClass(type, checker))
        ) &&
        some(node.decorators, decorator =>
            isComponentDecorator(decorator, checker)
        )
    );
}
