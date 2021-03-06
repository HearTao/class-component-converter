import * as ts from 'typescript';
import {
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
import { some, find, first, firstOrUndefined, length } from './utils';
import {
    contextProperty,
    Libs,
    lifecycles,
    Identifiers,
    Decorators
} from './constant';
import { classNeedTransform } from './transform';

function namedImportsContains(
    declaration: ts.ImportDeclaration,
    specifier: ts.Declaration
) {
    if (declaration.importClause && declaration.importClause.namedBindings) {
        if (ts.isNamedImports(declaration.importClause.namedBindings)) {
            return !!find(
                declaration.importClause.namedBindings.elements,
                x => x === specifier
            );
        }
    }
    return false;
}

function defaultImportsEqual(
    declaration: ts.ImportDeclaration,
    specifier: ts.Declaration
) {
    if (declaration.importClause && declaration.importClause === specifier) {
        return true;
    }
    return false;
}

function namespaceImportsEqual(
    declaration: ts.ImportDeclaration,
    specifier: ts.Declaration
) {
    if (declaration.importClause && declaration.importClause.namedBindings) {
        if (ts.isNamespaceImport(declaration.importClause.namedBindings)) {
            return declaration.importClause.namedBindings === specifier;
        }
    }
    return false;
}

export function isVueClass(
    type: ts.ExpressionWithTypeArguments,
    checker: ts.TypeChecker
): boolean {
    if (ts.isPropertyAccessExpression(type.expression)) {
        const symbol = checker.getSymbolAtLocation(type.expression.expression);
        if (symbol && length(symbol.declarations)) {
            const declaration = first(symbol.declarations);
            const importDeclaration = findParents(
                declaration,
                ts.isImportDeclaration
            );
            if (
                importDeclaration &&
                importDeclaration.importClause &&
                ts.isStringLiteral(importDeclaration.moduleSpecifier)
            ) {
                if (namespaceImportsEqual(importDeclaration, declaration)) {
                    return true;
                }
            }
        }
    }
    const symbol = checker.getSymbolAtLocation(type.expression);
    if (symbol && length(symbol.declarations)) {
        const declaration = first(symbol.declarations);
        const importDeclaration = findParents(
            declaration,
            ts.isImportDeclaration
        );
        if (
            importDeclaration &&
            importDeclaration.importClause &&
            ts.isStringLiteral(importDeclaration.moduleSpecifier)
        ) {
            const specifier = importDeclaration.moduleSpecifier.text;
            switch (specifier) {
                case Libs.vue:
                    return defaultImportsEqual(importDeclaration, declaration);
                case Libs.vueTsx:
                case Libs.vueClassComponent:
                case Libs.vuePropertyDecorator:
                    if (namedImportsContains(importDeclaration, declaration)) {
                        return true;
                    }
            }
        }
    }
    return false;
}

export function isComponentDecorator(
    expr: ts.Decorator,
    checker: ts.TypeChecker
): boolean {
    const symbol = checker.getSymbolAtLocation(expr.expression);
    if (symbol && length(symbol.declarations)) {
        const declaration = first(symbol.declarations);
        const importDeclaration = findParents(
            declaration,
            ts.isImportDeclaration
        );
        if (
            importDeclaration &&
            ts.isStringLiteral(importDeclaration.moduleSpecifier)
        ) {
            const specifier = importDeclaration.moduleSpecifier.text;
            switch (specifier) {
                case Libs.vueClassComponent:
                    return defaultImportsEqual(importDeclaration, declaration);
                case Libs.vuePropertyDecorator:
                    if (namedImportsContains(importDeclaration, declaration)) {
                        return true;
                    }
            }
        }
    }

    return false;
}

export function isInsidePropertyDecorator(
    expr: ts.Expression,
    checker: ts.TypeChecker
): boolean {
    const symbol = checker.getSymbolAtLocation(expr);
    if (symbol && length(symbol.declarations)) {
        const importDeclaration = findParents(
            first(symbol.declarations),
            ts.isImportDeclaration
        );
        if (
            importDeclaration &&
            ts.isStringLiteral(importDeclaration.moduleSpecifier) &&
            importDeclaration.moduleSpecifier.text === Libs.vuePropertyDecorator
        ) {
            return true;
        }
    }
    return false;
}

export function isPropsDecorator(
    expr: ts.Decorator,
    checker: ts.TypeChecker
): boolean {
    return (
        ts.isCallExpression(expr.expression) &&
        ts.isIdentifier(expr.expression.expression) &&
        expr.expression.expression.text === Decorators.Prop &&
        isInsidePropertyDecorator(expr.expression.expression, checker)
    );
}

export function isWatchDecorator(
    expr: ts.Decorator,
    checker: ts.TypeChecker
): boolean {
    return (
        ts.isCallExpression(expr.expression) &&
        ts.isIdentifier(expr.expression.expression) &&
        expr.expression.expression.text === Decorators.Watch &&
        isInsidePropertyDecorator(expr.expression.expression, checker)
    );
}

export function isEmitDecorator(
    expr: ts.Decorator,
    checker: ts.TypeChecker
): boolean {
    return (
        ts.isCallExpression(expr.expression) &&
        ts.isIdentifier(expr.expression.expression) &&
        expr.expression.expression.text === Decorators.Emit &&
        isInsidePropertyDecorator(expr.expression.expression, checker)
    );
}

export function isProviderDecorator(
    expr: ts.Decorator,
    checker: ts.TypeChecker
): boolean {
    return (
        ts.isCallExpression(expr.expression) &&
        ts.isIdentifier(expr.expression.expression) &&
        expr.expression.expression.text === Decorators.Provide &&
        isInsidePropertyDecorator(expr.expression.expression, checker)
    );
}

export function isInjectionDecorator(
    expr: ts.Decorator,
    checker: ts.TypeChecker
): boolean {
    return (
        ts.isCallExpression(expr.expression) &&
        ts.isIdentifier(expr.expression.expression) &&
        expr.expression.expression.text === Decorators.Inject &&
        isInsidePropertyDecorator(expr.expression.expression, checker)
    );
}

export function isClassStateDeclaration(
    checker: ts.TypeChecker,
    node: ts.ClassElement
): ClassStateDeclaration | undefined {
    if (
        ts.isPropertyDeclaration(node) &&
        !node.decorators &&
        ts.isIdentifier(node.name) &&
        isComponentMember(checker, node)
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
    checker: ts.TypeChecker,
    node: ts.ClassElement
): ClassMethodDeclaration | undefined {
    if (
        ts.isMethodDeclaration(node) &&
        withBody(node) &&
        !node.decorators &&
        ts.isIdentifier(node.name) &&
        isComponentMember(checker, node)
    ) {
        return {
            decl: node,
            name: node.name
        };
    }
    return undefined;
}

export function isRenderFunction(
    checker: ts.TypeChecker,
    node: ts.ClassElement
): ClassMethodDeclaration | undefined {
    const result = isClassMethodDeclaration(checker, node);
    if (result && result.name.text === Identifiers.render) {
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
        const watch = find(node.decorators, decorator =>
            isWatchDecorator(decorator, checker)
        );
        if (watch && ts.isCallExpression(watch.expression)) {
            const watchValue = firstOrUndefined(watch.expression.arguments);
            if (watchValue && ts.isStringLiteralLike(watchValue)) {
                return {
                    decl: node,
                    name: node.name,
                    watch: checkWatchValue(watchValue.text, checker)
                };
            }
        }
    }
    return undefined;

    function checkWatchValue(propName: string, checker: ts.TypeChecker) {
        if (contextProperty.includes(propName)) {
            return ts.createPropertyAccess(
                ts.createIdentifier(Identifiers.context),
                ts.createIdentifier(propName)
            );
        }
        const prop = type.getProperty(propName);
        if (
            prop &&
            prop.valueDeclaration &&
            ts.isClassElement(prop.valueDeclaration) &&
            isClassPropDeclaration(checker, prop.valueDeclaration)
        ) {
            return ts.createPropertyAccess(
                ts.createIdentifier(Identifiers.props),
                ts.createIdentifier(propName)
            );
        }

        return ts.createIdentifier(propName);
    }
}

export function isClassEemitDeclaration(
    checker: ts.TypeChecker,
    node: ts.ClassElement
): ClassEmitDeclaration | undefined {
    if (
        ts.isMethodDeclaration(node) &&
        withBody(node) &&
        ts.isIdentifier(node.name) &&
        isComponentMember(checker, node)
    ) {
        const emit = find(node.decorators, decorator =>
            isEmitDecorator(decorator, checker)
        );
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
    checker: ts.TypeChecker,
    node: ts.ClassElement
): ClassPropDeclaration | undefined {
    if (
        ts.isPropertyDeclaration(node) &&
        some(node.decorators, decorator =>
            isPropsDecorator(decorator, checker)
        ) &&
        ts.isIdentifier(node.name) &&
        isComponentMember(checker, node)
    ) {
        return {
            decl: node,
            name: node.name
        };
    }
}

export function isClassProviderDeclaration(
    checker: ts.TypeChecker,
    node: ts.ClassElement
): ClassProviderDeclaration | undefined {
    if (
        ts.isPropertyDeclaration(node) &&
        withInitializer(node) &&
        ts.isIdentifier(node.name) &&
        isComponentMember(checker, node)
    ) {
        const provider = find(node.decorators, decorator =>
            isProviderDecorator(decorator, checker)
        );
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
    checker: ts.TypeChecker,
    node: ts.ClassElement
): ClassInjectDeclaration | undefined {
    if (
        ts.isPropertyDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        isComponentMember(checker, node)
    ) {
        const injection = find(node.decorators, decorator =>
            isInjectionDecorator(decorator, checker)
        );
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

export function isComponentMember(
    checker: ts.TypeChecker,
    node: ts.ClassElement
): boolean {
    return (
        ts.isClassDeclaration(node.parent) &&
        classNeedTransform(checker, node.parent)
    );
}

export function isClassComputedDeclaration(
    checker: ts.TypeChecker,
    node: ts.ClassElement
): Getter | Setter | undefined {
    if (
        ts.isAccessor(node) &&
        withBody(node) &&
        ts.isIdentifier(node.name) &&
        isComponentMember(checker, node)
    ) {
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

export function isClassLifeCycleDeclaration(
    checker: ts.TypeChecker,
    node: ts.ClassElement
): ClassLifeCycleDeclaration | undefined {
    if (
        ts.isMethodDeclaration(node) &&
        withBody(node) &&
        ts.isIdentifier(node.name) &&
        lifecycles.includes(node.name.text) &&
        isComponentMember(checker, node)
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
