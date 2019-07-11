import * as ts from 'typescript';
import { some, or } from './utils';
import {
    isVueClass,
    isComponentDecorator,
    isClassComputedDeclaration,
    isClassStateDeclaration,
    isClassMethodDeclaration,
    isClassPropDeclaration,
    isClassInjectionDeclaration,
    skipParens
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

export function propertyAccessNeedTransform(
    node: ts.PropertyAccessExpression,
    checker: ts.TypeChecker
): boolean {
    if (node.expression.kind === ts.SyntaxKind.ThisKeyword) {
        if (
            node.name.text === '$emit' ||
            node.name.text === '$refs' ||
            node.name.text === '$slots'
        ) {
            return true;
        }
        const symbol = checker.getSymbolAtLocation(node);
        if (
            symbol &&
            symbol.valueDeclaration &&
            ts.isClassElement(symbol.valueDeclaration)
        ) {
            const declaration = symbol.valueDeclaration;
            if (
                or(
                    isClassComputedDeclaration,
                    isClassStateDeclaration,
                    isClassMethodDeclaration,
                    isClassPropDeclaration,
                    isClassInjectionDeclaration
                )(declaration)
            ) {
                return true;
            }
        }
    }
    return false;
}

export function variableNeedTransform(node: ts.VariableDeclaration): boolean {
    return !!(
        node.initializer &&
        ts.isObjectBindingPattern(node.name) &&
        skipParens(node.initializer).kind === ts.SyntaxKind.ThisKeyword
    );
}

export function variableStatementNeedTransform(
    stmt: ts.VariableStatement
): boolean {
    return stmt.declarationList.declarations.some(variableNeedTransform);
}

export function identifierNeedTransform(
    node: ts.Identifier,
    checker: ts.TypeChecker
): boolean {
    const symbol = checker.getSymbolAtLocation(node);
    if (
        symbol &&
        symbol.valueDeclaration &&
        ts.isClassElement(symbol.valueDeclaration) &&
        symbol.valueDeclaration.name !== node
    ) {
        if (
            ts.isPropertyAccessExpression(node.parent) &&
            node.parent.name === node
        ) {
            return or(isClassComputedDeclaration, isClassStateDeclaration)(
                symbol.valueDeclaration
            );
        } else {
            return or(
                isClassComputedDeclaration,
                isClassStateDeclaration,
                isClassPropDeclaration
            )(symbol.valueDeclaration);
        }
    }
    return false;
}
