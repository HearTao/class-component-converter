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
    WithBody,
    ClassLifeCycleDeclaration,
    ClassComputedDeclaration,
    ValidClassComputedDeclaration,
    Getter,
    Setter,
    Body,
    Initializer,
    WithInitializer
} from './types';
import { some, find, first, firstOrUndefined } from './utils';
import { contextProperty } from './constant';

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
): ClassStateDeclaration | undefined {
    if (
        ts.isPropertyDeclaration(node) &&
        !node.decorators &&
        ts.isIdentifier(node.name)
    ) {
        return {
            decl: node,
            name: node.name
        };
    }
    return undefined;
}

export function withBody<T extends Partial<Body>>(v: T): v is WithBody<T> {
    return !!v.body;
}

export function withInitializer<T extends Partial<Initializer>>(
    v: T
): v is WithInitializer<T> {
    return !!v.initializer;
}

export function isClassMethodDeclaration(
    node: ts.ClassElement
): ClassMethodDeclaration | undefined {
    if (
        ts.isMethodDeclaration(node) &&
        withBody(node) &&
        !node.decorators &&
        ts.isIdentifier(node.name)
    ) {
        return {
            decl: node,
            name: node.name
        };
    }
    return undefined;
}

export function isRenderFunction(
    node: ts.ClassElement
): ClassMethodDeclaration | undefined {
    const result = isClassMethodDeclaration(node);
    if (result && result.name.text === 'render') {
        return result;
    }
    return undefined;
}

export function isClassWatchDeclaration(
    checker: ts.TypeChecker,
    node: ts.ClassElement
): ClassWatchDeclaration | undefined {
    const type = checker.getTypeAtLocation(node.parent);

    if (
        ts.isMethodDeclaration(node) &&
        withBody(node) &&
        ts.isIdentifier(node.name)
    ) {
        const watch = find(node.decorators, isWatchDecorator);
        if (watch && ts.isCallExpression(watch.expression)) {
            const watchValue = firstOrUndefined(watch.expression.arguments);
            if (watchValue && ts.isStringLiteralLike(watchValue)) {
                return {
                    decl: node,
                    name: node.name,
                    watch: checkWatchValue(watchValue.text)
                };
            }
        }
    }
    return undefined;

    function checkWatchValue(propName: string) {
        if (contextProperty.includes(propName)) {
            return ts.createPropertyAccess(
                ts.createIdentifier('context'),
                ts.createIdentifier(propName)
            );
        }
        const prop = type.getProperty(propName);
        if (
            prop &&
            prop.valueDeclaration &&
            ts.isClassElement(prop.valueDeclaration) &&
            isClassPropDeclaration(prop.valueDeclaration)
        ) {
            return ts.createPropertyAccess(
                ts.createIdentifier('props'),
                ts.createIdentifier(propName)
            );
        }

        return ts.createIdentifier(propName);
    }
}

export function isClassEemitDeclaration(
    node: ts.ClassElement
): ClassEmitDeclaration | undefined {
    if (
        ts.isMethodDeclaration(node) &&
        withBody(node) &&
        ts.isIdentifier(node.name)
    ) {
        const emit = find(node.decorators, isEmitDecorator);
        if (emit && ts.isCallExpression(emit.expression)) {
            const name = firstOrUndefined(emit.expression.arguments);
            return {
                decl: node,
                name: node.name,
                emit:
                    name && ts.isStringLiteral(name)
                        ? name.text
                        : node.name.text
            };
        }
    }
    return undefined;
}

export function isClassPropDeclaration(
    node: ts.ClassElement
): ClassPropDeclaration | undefined {
    if (
        ts.isPropertyDeclaration(node) &&
        some(node.decorators, isPropsDecorator) &&
        ts.isIdentifier(node.name)
    ) {
        return {
            decl: node,
            name: node.name
        };
    }
}

export function isClassProviderDeclaration(
    node: ts.ClassElement
): ClassProviderDeclaration | undefined {
    if (
        ts.isPropertyDeclaration(node) &&
        withInitializer(node) &&
        ts.isIdentifier(node.name)
    ) {
        const provider = find(node.decorators, isProviderDecorator);
        if (provider && ts.isCallExpression(provider.expression)) {
            const name = firstOrUndefined(provider.expression.arguments);
            return {
                decl: node,
                name: node.name,
                provide:
                    name && ts.isStringLiteral(name)
                        ? name.text
                        : node.name.text
            };
        }
    }
    return undefined;
}

export function isClassInjectionDeclaration(
    node: ts.ClassElement
): ClassInjectDeclaration | undefined {
    if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
        const injection = find(node.decorators, isInjectionDecorator);
        if (injection && ts.isCallExpression(injection.expression)) {
            const name = firstOrUndefined(injection.expression.arguments);
            return {
                decl: node,
                name: node.name,
                inject:
                    name && ts.isStringLiteral(name)
                        ? name.text
                        : node.name.text
            };
        }
    }
    return undefined;
}

export function isClassComputedDeclaration(
    node: ts.ClassElement
): Getter | Setter | undefined {
    if (ts.isAccessor(node) && withBody(node) && ts.isIdentifier(node.name)) {
        return {
            decl: node,
            name: node.name
        } as Getter | Setter;
    }
    return undefined;
}

export function isGetter(v: Getter | Setter): v is Getter {
    return ts.isGetAccessor(v.decl);
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
): ClassLifeCycleDeclaration | undefined {
    if (
        ts.isMethodDeclaration(node) &&
        withBody(node) &&
        ts.isIdentifier(node.name) &&
        lifecycles.includes(node.name.text)
    ) {
        return {
            decl: node,
            name: node.name
        };
    }
    return undefined;
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

export function findParents<T extends ts.Node>(
    node: ts.Node,
    cb: (v: ts.Node) => v is T
): T | undefined {
    while (node) {
        if (cb(node)) {
            return node;
        }
        node = node.parent;
    }
    return undefined;
}
