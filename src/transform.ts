import * as ts from 'typescript';
import { some, append, pickOut, isDef, mapDef, push, matcher } from './utils';
import {
    isVueClass,
    isComponentDecorator,
    isValidComputedDeclaration,
    isComponentMember,
    isClassComputedDeclaration,
    isClassStateDeclaration,
    isClassMethodDeclaration,
    isClassInjectionDeclaration,
    isClassPropDeclaration,
    skipParens,
    isClassProviderDeclaration,
    isGetter,
    isRenderFunction,
    isClassWatchDeclaration,
    isClassEemitDeclaration,
    isClassLifeCycleDeclaration
} from './helper';
import {
    ClassStateDeclaration,
    ClassPropDeclaration,
    ClassComputedDeclaration,
    ClassLifeCycleDeclaration,
    ClassMethodDeclaration,
    ClassWatchDeclaration,
    ClassEmitDeclaration,
    ClassProviderDeclaration,
    ClassInjectDeclaration,
    IdentifierName,
    ComponentInfo
} from './types';
import { Identifiers, contextProperty } from './constant';

export function classNeedTransform(
    checker: ts.TypeChecker,
    node: ts.ClassLikeDeclaration
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

function collectClassDeclarationInfo(
    node: ts.ClassDeclaration,
    checker: ts.TypeChecker
): ComponentInfo {
    let render: ClassMethodDeclaration | undefined = undefined;
    const computed = new Map<string, ClassComputedDeclaration>();
    const states: ClassStateDeclaration[] = [];
    const props: ClassPropDeclaration[] = [];
    const methods: ClassMethodDeclaration[] = [];
    const emits: ClassEmitDeclaration[] = [];
    const watchers: ClassWatchDeclaration[] = [];
    const lifecycles: ClassLifeCycleDeclaration[] = [];
    const providers: ClassProviderDeclaration[] = [];
    const injections: ClassInjectDeclaration[] = [];
    const ignored: ts.ClassElement[] = [];

    const pushIgnored = push(ignored);
    node.members.forEach(member => {
        switch (member.kind) {
            case ts.SyntaxKind.PropertyDeclaration:
                return matcher(member)
                    .case(
                        isClassStateDeclaration.bind(null, checker),
                        push(states)
                    )
                    .case(
                        isClassPropDeclaration.bind(null, checker),
                        push(props)
                    )
                    .case(
                        isClassProviderDeclaration.bind(null, checker),
                        push(providers)
                    )
                    .case(
                        isClassInjectionDeclaration.bind(null, checker),
                        push(injections)
                    )
                    .otherwise(pushIgnored)
                    .exec();
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
                return matcher(member)
                    .case(
                        isClassComputedDeclaration.bind(null, checker),
                        mem => {
                            const name = mem.name.text;
                            let value = computed.get(name);
                            if (isGetter(mem)) {
                                value = { ...value, getter: mem };
                            } else {
                                value = { ...value, setter: mem };
                            }
                            computed.set(name, value);
                        }
                    )
                    .otherwise(pushIgnored)
                    .exec();
            case ts.SyntaxKind.MethodDeclaration:
                return matcher(member)
                    .case(
                        isRenderFunction.bind(null, checker),
                        mem => (render = mem)
                    )
                    .case(
                        isClassWatchDeclaration.bind(null, checker),
                        push(watchers)
                    )
                    .case(
                        isClassEemitDeclaration.bind(null, checker),
                        push(emits)
                    )
                    .case(
                        isClassLifeCycleDeclaration.bind(null, checker),
                        push(lifecycles)
                    )
                    .case(
                        isClassMethodDeclaration.bind(null, checker),
                        push(methods)
                    )
                    .otherwise(pushIgnored)
                    .exec();
            default:
                return pushIgnored(member);
        }
    });
    return {
        render,
        computed,
        states,
        props,
        methods,
        emits,
        watchers,
        lifecycles,
        providers,
        injections,
        ignored
    };
}

export function transformClassStates(
    visitor: ts.Visitor,
    context: ts.TransformationContext,
    states: ReadonlyArray<ClassStateDeclaration>
): ts.VariableStatement[] {
    return states.map(state =>
        ts.createVariableStatement(
            undefined,
            ts.createVariableDeclarationList(
                [
                    ts.createVariableDeclaration(
                        state.name,
                        state.decl.type,
                        ts.createCall(
                            ts.createIdentifier(Identifiers.value),
                            undefined,
                            state.decl.initializer && [
                                ts.visitEachChild(
                                    state.decl.initializer,
                                    visitor,
                                    context
                                )
                            ]
                        )
                    )
                ],
                ts.NodeFlags.Const
            )
        )
    );
}

export function transformClassProps(
    props: ReadonlyArray<ClassPropDeclaration>
): ts.ParameterDeclaration {
    return ts.createParameter(
        undefined,
        undefined,
        undefined,
        ts.createIdentifier(Identifiers.props),
        undefined,
        ts.createTypeLiteralNode(
            props.map(prop =>
                ts.createPropertySignature(
                    undefined,
                    prop.name.text,
                    prop.decl.questionToken,
                    prop.decl.type,
                    undefined
                )
            )
        ),
        undefined
    );
}

export function transformInstanceMethods() {
    return ts.createParameter(
        undefined,
        undefined,
        undefined,
        ts.createIdentifier(Identifiers.context),
        undefined,
        undefined,
        undefined
    );
}

export function transformClassComputedDeclaration(
    visitor: ts.Visitor,
    context: ts.TransformationContext,
    computed: Map<string, ClassComputedDeclaration>
): ts.VariableStatement[] {
    return Array.from(computed.values())
        .filter(isValidComputedDeclaration)
        .map(comp =>
            ts.createVariableStatement(
                undefined,
                ts.createVariableDeclarationList(
                    [
                        ts.createVariableDeclaration(
                            comp.getter.name.text,
                            comp.getter.decl.type,
                            ts.createCall(
                                ts.createIdentifier(Identifiers.computed),
                                undefined,
                                append(
                                    [
                                        ts.createArrowFunction(
                                            undefined,
                                            undefined,
                                            [],
                                            undefined,
                                            ts.createToken(
                                                ts.SyntaxKind
                                                    .EqualsGreaterThanToken
                                            ),
                                            ts.visitEachChild(
                                                comp.getter.decl.body,
                                                visitor,
                                                context
                                            )
                                        )
                                    ],
                                    comp.setter &&
                                        ts.createArrowFunction(
                                            undefined,
                                            undefined,
                                            comp.setter.decl.parameters,
                                            undefined,
                                            ts.createToken(
                                                ts.SyntaxKind
                                                    .EqualsGreaterThanToken
                                            ),
                                            ts.visitEachChild(
                                                comp.setter.decl.body,
                                                visitor,
                                                context
                                            )
                                        )
                                )
                            )
                        )
                    ],
                    ts.NodeFlags.Const
                )
            )
        );
}

export function transformClassLifeCycleName(name: string): string {
    return `on${name[0].toUpperCase()}${name.slice(1)}`;
}

export function transformClassLifeCycleDeclaration(
    visitor: ts.Visitor,
    context: ts.TransformationContext,
    lifecycles: ReadonlyArray<ClassLifeCycleDeclaration>
): ts.ExpressionStatement[] {
    return lifecycles.map(lifecycle =>
        ts.createExpressionStatement(
            ts.createCall(
                ts.createIdentifier(
                    transformClassLifeCycleName(lifecycle.name.text)
                ),
                undefined,
                [
                    ts.createArrowFunction(
                        undefined,
                        undefined,
                        [],
                        undefined,
                        ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                        ts.visitEachChild(lifecycle.decl.body, visitor, context)
                    )
                ]
            )
        )
    );
}

export function transformClassMethodDeclaration(
    visitor: ts.Visitor,
    context: ts.TransformationContext,
    methods: ReadonlyArray<ClassMethodDeclaration>
): ts.VariableStatement[] {
    return methods.map(method =>
        ts.createVariableStatement(
            undefined,
            ts.createVariableDeclarationList(
                [
                    ts.createVariableDeclaration(
                        method.name,
                        undefined,
                        ts.createArrowFunction(
                            undefined,
                            method.decl.typeParameters,
                            method.decl.parameters,
                            undefined,
                            ts.createToken(
                                ts.SyntaxKind.EqualsGreaterThanToken
                            ),
                            ts.visitEachChild(
                                method.decl.body,
                                visitor,
                                context
                            )
                        )
                    )
                ],
                ts.NodeFlags.Const
            )
        )
    );
}

export function transformClassWatchDeclaration(
    visitor: ts.Visitor,
    context: ts.TransformationContext,
    watchers: ReadonlyArray<ClassWatchDeclaration>
): ts.ExpressionStatement[] {
    return watchers.map(watcher => {
        return ts.createExpressionStatement(
            ts.createCall(ts.createIdentifier(Identifiers.watch), undefined, [
                watcher.watch,
                ts.createArrowFunction(
                    undefined,
                    undefined,
                    watcher.decl.parameters,
                    undefined,
                    ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                    ts.visitEachChild(watcher.decl.body, visitor, context)
                )
            ])
        );
    });
}

export function transformClassEmitDeclaration(
    visitor: ts.Visitor,
    context: ts.TransformationContext,
    emits: ReadonlyArray<ClassEmitDeclaration>
): ts.VariableStatement[] {
    return emits.map(emit => {
        const parameters = emit.decl.parameters;
        const body = ts.visitEachChild(emit.decl.body, visitor, context);
        const stmts: ReadonlyArray<ts.Statement> = body ? body.statements : [];
        const [returnArgs, others] = pickOut(stmts, ts.isReturnStatement);
        const args = [
            ts.createStringLiteral(emit.emit),
            ...returnArgs.map(x => x.expression).filter(isDef),
            ...parameters.map(x => x.name).filter(ts.isIdentifier)
        ];
        return ts.createVariableStatement(
            undefined,
            ts.createVariableDeclarationList(
                [
                    ts.createVariableDeclaration(
                        emit.name,
                        undefined,
                        ts.createArrowFunction(
                            undefined,
                            undefined,
                            parameters,
                            undefined,
                            ts.createToken(
                                ts.SyntaxKind.EqualsGreaterThanToken
                            ),
                            ts.createBlock([
                                ...others,
                                ts.createExpressionStatement(
                                    ts.createCall(
                                        ts.createPropertyAccess(
                                            ts.createIdentifier(
                                                Identifiers.context
                                            ),
                                            ts.createIdentifier(
                                                Identifiers.$emit
                                            )
                                        ),
                                        undefined,
                                        args
                                    )
                                )
                            ])
                        )
                    )
                ],
                ts.NodeFlags.Const
            )
        );
    });
}

export function transformClassProviderDeclaration(
    visitor: ts.Visitor,
    context: ts.TransformationContext,
    providers: ReadonlyArray<ClassProviderDeclaration>
): ts.ExpressionStatement[] {
    return [
        ts.createExpressionStatement(
            ts.createCall(ts.createIdentifier(Identifiers.provide), undefined, [
                ts.createObjectLiteral(
                    providers.map(provider =>
                        ts.createPropertyAssignment(
                            provider.provide,
                            ts.visitEachChild(
                                provider.decl.initializer,
                                visitor,
                                context
                            )
                        )
                    )
                )
            ])
        )
    ];
}

export function transformClassInjectionDeclaration(
    injections: ReadonlyArray<ClassInjectDeclaration>
): ts.VariableStatement[] {
    return injections.map(injection =>
        ts.createVariableStatement(
            undefined,
            ts.createVariableDeclarationList(
                [
                    ts.createVariableDeclaration(
                        injection.name,
                        injection.decl.type,
                        ts.createCall(
                            ts.createIdentifier(Identifiers.inject),
                            undefined,
                            [ts.createStringLiteral(injection.inject)]
                        )
                    )
                ],
                ts.NodeFlags.Const
            )
        )
    );
}

export function transformClassDeclarationReturn<T extends IdentifierName>(
    nodes: T[]
): [ts.ReturnStatement] {
    return [
        ts.createReturn(
            ts.createObjectLiteral(
                nodes.map(node =>
                    ts.createShorthandPropertyAssignment(node.name)
                )
            )
        )
    ];
}

export function transformRenderDeclaration(render: ClassMethodDeclaration) {
    // TODO: transform tsx
    return render.decl;
}

export function transformClassDeclaration(
    checker: ts.TypeChecker,
    visitor: ts.Visitor,
    context: ts.TransformationContext,
    node: ts.ClassDeclaration
): ts.VariableStatement {
    const {
        render,
        computed,
        states,
        props,
        methods,
        emits,
        watchers,
        lifecycles,
        providers,
        injections,
        ignored
    } = collectClassDeclarationInfo(node, checker);

    return ts.createVariableStatement(
        undefined,
        ts.createVariableDeclarationList(
            [
                ts.createVariableDeclaration(
                    node.name!,
                    undefined,
                    ts.createObjectLiteral(
                        append(
                            [
                                ts.createMethod(
                                    undefined,
                                    undefined,
                                    undefined,
                                    Identifiers.steup,
                                    undefined,
                                    undefined,
                                    [
                                        transformClassProps(props),
                                        transformInstanceMethods()
                                    ],
                                    undefined,
                                    ts.createBlock([
                                        ...transformClassMethodDeclaration(
                                            visitor,
                                            context,
                                            methods
                                        ),
                                        ...transformClassEmitDeclaration(
                                            visitor,
                                            context,
                                            emits
                                        ),
                                        ...transformClassLifeCycleDeclaration(
                                            visitor,
                                            context,
                                            lifecycles
                                        ),

                                        ...transformClassInjectionDeclaration(
                                            injections
                                        ),
                                        ...transformClassStates(
                                            visitor,
                                            context,
                                            states
                                        ),
                                        ...transformClassComputedDeclaration(
                                            visitor,
                                            context,
                                            computed
                                        ),
                                        ...transformClassProviderDeclaration(
                                            visitor,
                                            context,
                                            providers
                                        ),
                                        ...transformClassWatchDeclaration(
                                            visitor,
                                            context,
                                            watchers
                                        ),
                                        ...transformClassDeclarationReturn([
                                            ...injections,
                                            ...states,
                                            ...methods,
                                            ...Array.from(computed.keys()).map(
                                                x => ({
                                                    name: ts.createIdentifier(x)
                                                })
                                            )
                                        ])
                                    ])
                                )
                            ],
                            render && transformRenderDeclaration(render)
                        )
                    )
                )
            ],
            ts.NodeFlags.Const
        )
    );
}

export function transformPropertyAccessName(
    checker: ts.TypeChecker,
    node: ts.PropertyAccessExpression,
    declaration: ts.Declaration | undefined
) {
    if (
        declaration &&
        ts.isClassElement(declaration) &&
        isComponentMember(checker, declaration)
    ) {
        if (contextProperty.includes(node.name.text)) {
            return ts.createPropertyAccess(
                ts.createIdentifier(Identifiers.context),
                node.name
            );
        }
        if (
            isClassComputedDeclaration(checker, declaration) ||
            isClassStateDeclaration(checker, declaration) ||
            isClassMethodDeclaration(checker, declaration) ||
            isClassInjectionDeclaration(checker, declaration)
        ) {
            return node.name;
        } else if (isClassPropDeclaration(checker, declaration)) {
            return ts.createPropertyAccess(
                ts.createIdentifier(Identifiers.props),
                node.name
            );
        }
    }

    return node;
}

export function trackOriginalFromAssignment(
    checker: ts.TypeChecker,
    node: ts.VariableDeclaration
): ts.Declaration | undefined {
    while (node && ts.isVariableDeclaration(node) && node.initializer) {
        const symbol = checker.getSymbolAtLocation(node.initializer);
        if (symbol && symbol.valueDeclaration) {
            if (ts.isVariableDeclaration(symbol.valueDeclaration)) {
                node = symbol.valueDeclaration;
            } else {
                return node;
            }
        }
    }
    return undefined;
}

export function declarationNeedTransform(
    checker: ts.TypeChecker,
    declaration: ts.Declaration
): boolean {
    return (
        ts.isClassDeclaration(declaration) &&
        classNeedTransform(checker, declaration)
    );
}

export function transformPropertyAccessExpression(
    checker: ts.TypeChecker,
    node: ts.PropertyAccessExpression
): ts.Node {
    if (node.expression.kind === ts.SyntaxKind.ThisKeyword) {
        return transformPropertyAccessName(
            checker,
            node,
            mapDef(
                checker.getSymbolAtLocation(node),
                symbol => symbol.valueDeclaration
            )
        );
    }

    const symbol = checker.getSymbolAtLocation(node.expression);
    if (
        symbol &&
        symbol.valueDeclaration &&
        ts.isVariableDeclaration(symbol.valueDeclaration)
    ) {
        const original = trackOriginalFromAssignment(
            checker,
            symbol.valueDeclaration
        );
        if (
            original &&
            ts.isVariableDeclaration(original) &&
            original.initializer &&
            original.initializer.kind === ts.SyntaxKind.ThisKeyword
        ) {
            const componentSymbol = checker.getSymbolAtLocation(
                original.initializer
            );
            if (
                componentSymbol &&
                componentSymbol.valueDeclaration &&
                declarationNeedTransform(
                    checker,
                    componentSymbol.valueDeclaration
                )
            )
                return transformPropertyAccessName(
                    checker,
                    node,
                    mapDef(
                        checker.getSymbolAtLocation(original.initializer),
                        symbol =>
                            mapDef(
                                symbol.members &&
                                    symbol.members.get(node.name
                                        .text as ts.__String),
                                s => s.valueDeclaration
                            )
                    )
                );
        }
    }

    return node;
}

export function transformIdentifier(
    node: ts.Identifier,
    checker: ts.TypeChecker
): ts.Node {
    const symbol = checker.getSymbolAtLocation(node);
    if (symbol && symbol.valueDeclaration) {
        const declaration = symbol.valueDeclaration;
        if (ts.isClassElement(declaration) && declaration.name !== node) {
            return transformIdentifierMembers(checker, node, declaration);
        } else if (
            ts.isBindingElement(declaration) &&
            ts.isObjectBindingPattern(declaration.parent) &&
            ts.isVariableDeclaration(declaration.parent.parent) &&
            declaration.parent.parent.name === declaration.parent &&
            declaration.parent.parent.initializer &&
            skipParens(declaration.parent.parent.initializer).kind ===
                ts.SyntaxKind.ThisKeyword
        ) {
            const typeOfObjectLiteral = checker.getTypeAtLocation(
                declaration.parent.parent.initializer
            );
            const originalSymbol =
                typeOfObjectLiteral &&
                checker.getPropertyOfType(typeOfObjectLiteral, node.text);
            if (
                originalSymbol &&
                originalSymbol.valueDeclaration &&
                ts.isClassElement(originalSymbol.valueDeclaration)
            ) {
                return transformIdentifierMembers(
                    checker,
                    node,
                    originalSymbol.valueDeclaration
                );
            }
        }
    }

    return node;
}

export function transformVariableStatement(
    checker: ts.TypeChecker,
    node: ts.VariableStatement
) {
    const list = node.declarationList.declarations
        .map(transformVariableDeclaration.bind(null, checker))
        .filter(isDef);
    if (list.length) {
        return ts.createVariableStatement(
            node.modifiers,
            ts.createVariableDeclarationList(list, node.declarationList.flags)
        );
    }
    return ts.createEmptyStatement();
}

export function transformVariableDeclaration(
    checker: ts.TypeChecker,
    node: ts.VariableDeclaration
) {
    if (
        node.initializer &&
        skipParens(node.initializer).kind === ts.SyntaxKind.ThisKeyword
    ) {
        const symbol = checker.getSymbolAtLocation(node.initializer);
        if (
            symbol &&
            symbol.valueDeclaration &&
            declarationNeedTransform(checker, symbol.valueDeclaration)
        ) {
            return undefined;
        }
    }
    return node;
}

export function transformIdentifierMembers(
    checker: ts.TypeChecker,
    node: ts.Identifier,
    declaration: ts.ClassElement
) {
    if (
        isClassComputedDeclaration(checker, declaration) ||
        isClassStateDeclaration(checker, declaration)
    ) {
        return ts.createPropertyAccess(
            ts.createIdentifier(node.text),
            ts.createIdentifier(Identifiers.value)
        );
    } else if (
        !(
            ts.isPropertyAccessExpression(node.parent) &&
            node.parent.name === node
        ) &&
        isClassPropDeclaration(checker, declaration)
    ) {
        return ts.createPropertyAccess(
            ts.createIdentifier(Identifiers.props),
            ts.createIdentifier(node.text)
        );
    }
    return node;
}
