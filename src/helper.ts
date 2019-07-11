import * as ts from 'typescript';
import {
    IdentifierName,
    ClassStateDeclaration,
    ClassMethodDeclaration,
    ClassWatchDeclaration,
    ClassEmitDeclaration,
    ClassPropDeclaration,
    ClassProviderDeclaration,
    ClassInjectDeclaration,
    BodyDeclaration,
    ClassLifeCycleDeclaration,
    ClassComputedDeclaration,
    ValidClassComputedDeclaration
} from './types';
import { some } from './utils';

export function isVueClass(type: ts.ExpressionWithTypeArguments): boolean {
    return ts.isIdentifier(type.expression) && type.expression.text === 'Vue';
}

export function isComponentDecorator(expr: ts.Decorator): boolean {
    return (
        ts.isIdentifier(expr.expression) && expr.expression.text === 'Component'
    );
}

export function isPropsDecorator(expr: ts.Decorator): boolean {
    return (
        ts.isCallExpression(expr.expression) &&
        ts.isIdentifier(expr.expression.expression) &&
        expr.expression.expression.text === 'Prop'
    );
}

export function isWatchDecorator(expr: ts.Decorator): boolean {
    return (
        ts.isCallExpression(expr.expression) &&
        ts.isIdentifier(expr.expression.expression) &&
        expr.expression.expression.text === 'Watch'
    );
}

export function isEmitDecorator(expr: ts.Decorator): boolean {
    return (
        ts.isCallExpression(expr.expression) &&
        ts.isIdentifier(expr.expression.expression) &&
        expr.expression.expression.text === 'Emit'
    );
}

export function isProviderDecorator(expr: ts.Decorator): boolean {
    return (
        ts.isCallExpression(expr.expression) &&
        ts.isIdentifier(expr.expression.expression) &&
        expr.expression.expression.text === 'Provide'
    );
}

export function isInjectionDecorator(expr: ts.Decorator): boolean {
    return (
        ts.isCallExpression(expr.expression) &&
        ts.isIdentifier(expr.expression.expression) &&
        expr.expression.expression.text === 'Inject'
    );
}

export function isClassStateDeclaration(
    node: ts.ClassElement
): node is ClassStateDeclaration {
    return (
        ts.isPropertyDeclaration(node) &&
        !node.decorators &&
        ts.isIdentifier(node.name)
    );
}

export function isClassMethodDeclaration(
    node: ts.ClassElement
): node is ClassMethodDeclaration {
    return (
        ts.isMethodDeclaration(node) &&
        !node.decorators &&
        ts.isIdentifier(node.name)
    );
}

export function isRenderFunction(
    node: ts.ClassElement
): node is ClassMethodDeclaration {
    return isClassMethodDeclaration(node) && node.name.text === 'render';
}

export function isClassWatchDeclaration(
    node: ts.ClassElement
): node is ClassWatchDeclaration {
    return (
        ts.isMethodDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        some(node.decorators, isWatchDecorator)
    );
}

export function isClassEemitDeclaration(
    node: ts.ClassElement
): node is ClassEmitDeclaration {
    return (
        ts.isMethodDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        some(node.decorators, isEmitDecorator)
    );
}

export function isClassPropDeclaration(
    node: ts.ClassElement
): node is ClassPropDeclaration {
    return (
        ts.isPropertyDeclaration(node) &&
        some(node.decorators, isPropsDecorator) &&
        ts.isIdentifier(node.name)
    );
}

export function isClassProviderDeclaration(
    node: ts.ClassElement
): node is ClassProviderDeclaration {
    return (
        ts.isPropertyDeclaration(node) &&
        some(node.decorators, isProviderDecorator) &&
        ts.isIdentifier(node.name)
    );
}

export function isClassInjectionDeclaration(
    node: ts.ClassElement
): node is ClassInjectDeclaration {
    return (
        ts.isPropertyDeclaration(node) &&
        some(node.decorators, isInjectionDecorator) &&
        ts.isIdentifier(node.name)
    );
}

export function isClassComputedDeclaration(
    node: ts.ClassElement
): node is ts.AccessorDeclaration &
    IdentifierName &
    BodyDeclaration<ts.AccessorDeclaration> {
    return ts.isAccessor(node) && ts.isIdentifier(node.name) && !!node.body;
}

const lifecycles = [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeUpdate',
    'updated',
    'activated',
    'deactivated',
    'beforeDestroy',
    'destroyed',
    'errorCaptured'
];
export function isClassLifeCycleDeclaration(
    node: ts.ClassElement
): node is ClassLifeCycleDeclaration {
    return (
        ts.isMethodDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        lifecycles.includes(node.name.text)
    );
}

export function isValidComputedDeclaration(
    decl: ClassComputedDeclaration
): decl is ValidClassComputedDeclaration {
    return !!decl.getter;
}

export function skipParens(node: ts.Expression): ts.Expression {
    while (node && ts.isParenthesizedExpression(node)) {
        node = node.expression;
    }
    return node;
}
