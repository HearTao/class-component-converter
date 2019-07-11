import * as ts from 'typescript';
import { some, or } from './utils';
import {
    isVueClass,
    isComponentDecorator
} from './helper';

export function classNeedTransform(node: ts.ClassLikeDeclaration): boolean {
    return (
        some(
            node.heritageClauses,
            x =>
                x.token === ts.SyntaxKind.ExtendsKeyword &&
                some(x.types, isVueClass)
        ) && some(node.decorators, isComponentDecorator)
    );
}
