import * as ts from 'typescript';
import {
    append,
    or,
    assertDef,
    pickOut,
    isDef,
    push,
    match,
    id,
    find
} from './utils';
import createVHost from './host';
import {
    IdentifierName,
    ClassStateDeclaration,
    ClassMethodDeclaration,
    ClassWatchDeclaration,
    ClassEmitDeclaration,
    ClassPropDeclaration,
    ClassProviderDeclaration,
    ClassInjectDeclaration,
    ClassLifeCycleDeclaration,
    ClassComputedDeclaration,
    ComponentInfo
} from './types';
import {
    isClassComputedDeclaration,
    isClassStateDeclaration,
    isClassMethodDeclaration,
    isClassPropDeclaration,
    isClassInjectionDeclaration,
    isClassProviderDeclaration,
    isRenderFunction,
    isClassWatchDeclaration,
    isClassEemitDeclaration,
    isClassLifeCycleDeclaration,
    isValidComputedDeclaration,
    isGetter,
    skipParens
} from './helper';
import { classNeedTransform } from './transform';
import { contextProperty } from './constant';

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
                return match(member)(isClassStateDeclaration, push(states))(
                    isClassPropDeclaration,
                    push(props)
                )(isClassProviderDeclaration, push(providers))(
                    isClassInjectionDeclaration,
                    push(injections)
                )(id, pushIgnored);

            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
                return match(member)(isClassComputedDeclaration, mem => {
                    const name = mem.name.text;
                    let value = computed.get(name);
                    if (isGetter(mem)) {
                        value = { ...value, getter: mem };
                    } else {
                        value = { ...value, setter: mem };
                    }
                    computed.set(name, value);
                })(id, pushIgnored);
            case ts.SyntaxKind.MethodDeclaration:
                return match(member)(isRenderFunction, mem => (render = mem))(
                    isClassWatchDeclaration.bind(null, checker),
                    push(watchers)
                )(isClassEemitDeclaration, push(emits))(
                    isClassLifeCycleDeclaration,
                    push(lifecycles)
                )(isClassMethodDeclaration, push(methods))(id, pushIgnored);
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

const stateIdentifier = 'value';
const computedIdentifier = 'computed';

function classTransformer(
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
            if (classNeedTransform(declaration)) {
                return transformClassDeclaration(declaration);
            }
            return ts.visitEachChild(declaration, visitor, context);
        }

        function propertyAccessExpressionVisitor(
            declaration: ts.PropertyAccessExpression
        ) {
            return transformPropertyAccessExpression(
                ts.visitEachChild(declaration, visitor, context),
                checker
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
                ts.visitEachChild(declaration, visitor, context)
            );
        }

        function transformClassStates(
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
                                    ts.createIdentifier(stateIdentifier),
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

        function transformClassProps(
            props: ReadonlyArray<ClassPropDeclaration>
        ): ts.ParameterDeclaration {
            return ts.createParameter(
                undefined,
                undefined,
                undefined,
                ts.createIdentifier('props'),
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

        function transformInstanceMethods() {
            return ts.createParameter(
                undefined,
                undefined,
                undefined,
                ts.createIdentifier('context'),
                undefined,
                undefined,
                undefined
            );
        }

        function transformClassComputedDeclaration(
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
                                        ts.createIdentifier(computedIdentifier),
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

        function transformClassLifeCycleName(name: string): string {
            return `on${name[0].toUpperCase()}${name.slice(1)}`;
        }

        function transformClassLifeCycleDeclaration(
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
                                ts.createToken(
                                    ts.SyntaxKind.EqualsGreaterThanToken
                                ),
                                ts.visitEachChild(
                                    lifecycle.decl.body,
                                    visitor,
                                    context
                                )
                            )
                        ]
                    )
                )
            );
        }

        function transformClassMethodDeclaration(
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

        function transformClassWatchDeclaration(
            watchers: ReadonlyArray<ClassWatchDeclaration>
        ): ts.ExpressionStatement[] {
            return watchers.map(watcher => {
                return ts.createExpressionStatement(
                    ts.createCall(ts.createIdentifier('watch'), undefined, [
                        watcher.watch,
                        ts.createArrowFunction(
                            undefined,
                            undefined,
                            watcher.decl.parameters,
                            undefined,
                            ts.createToken(
                                ts.SyntaxKind.EqualsGreaterThanToken
                            ),
                            ts.visitEachChild(
                                watcher.decl.body,
                                visitor,
                                context
                            )
                        )
                    ])
                );
            });
        }

        function transformClassEmitDeclaration(
            emits: ReadonlyArray<ClassEmitDeclaration>
        ): ts.VariableStatement[] {
            return emits.map(emit => {
                const parameters = emit.decl.parameters;
                const body = ts.visitEachChild(
                    emit.decl.body,
                    visitor,
                    context
                );
                const stmts: ReadonlyArray<ts.Statement> = body
                    ? body.statements
                    : [];
                const [returnArgs, others] = pickOut(
                    stmts,
                    ts.isReturnStatement
                );
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
                                                        'context'
                                                    ),
                                                    ts.createIdentifier('$emit')
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

        function transformClassProviderDeclaration(
            providers: ReadonlyArray<ClassProviderDeclaration>
        ): ts.ExpressionStatement[] {
            return [
                ts.createExpressionStatement(
                    ts.createCall(ts.createIdentifier('provide'), undefined, [
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

        function transformClassInjectionDeclaration(
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
                                    ts.createIdentifier('inject'),
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

        function transformClassDeclarationReturn<T extends IdentifierName>(
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

        function transformRenderDeclaration(render: ClassMethodDeclaration) {
            // TODO: transform tsx
            return render.decl;
        }

        function transformClassDeclaration(
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
                                            'steup',
                                            undefined,
                                            undefined,
                                            [
                                                transformClassProps(props),
                                                transformInstanceMethods()
                                            ],
                                            undefined,
                                            ts.createBlock([
                                                ...transformClassInjectionDeclaration(
                                                    injections
                                                ),
                                                ...transformClassStates(states),
                                                ...transformClassEmitDeclaration(
                                                    emits
                                                ),
                                                ...transformClassMethodDeclaration(
                                                    methods
                                                ),
                                                ...transformClassComputedDeclaration(
                                                    computed
                                                ),
                                                ...transformClassLifeCycleDeclaration(
                                                    lifecycles
                                                ),
                                                ...transformClassWatchDeclaration(
                                                    watchers
                                                ),
                                                ...transformClassProviderDeclaration(
                                                    providers
                                                ),
                                                ...transformClassDeclarationReturn(
                                                    [
                                                        ...injections,
                                                        ...states,
                                                        ...methods,
                                                        ...Array.from(
                                                            computed.keys()
                                                        ).map(x => ({
                                                            name: ts.createIdentifier(
                                                                x
                                                            )
                                                        }))
                                                    ]
                                                )
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

        function transformPropertyAccessExpression(
            node: ts.PropertyAccessExpression,
            checker: ts.TypeChecker
        ): ts.Node {
            if (node.expression.kind === ts.SyntaxKind.ThisKeyword) {
                if (contextProperty.includes(node.name.text)) {
                    return ts.createPropertyAccess(
                        ts.createIdentifier('context'),
                        node.name
                    );
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
                            isClassInjectionDeclaration
                        )(declaration)
                    ) {
                        return node.name;
                    } else if (isClassPropDeclaration(declaration)) {
                        return ts.createPropertyAccess(
                            ts.createIdentifier('props'),
                            node.name
                        );
                    }
                }
            }

            return node;
        }

        function transformIdentifier(
            node: ts.Identifier,
            checker: ts.TypeChecker
        ): ts.Node {
            const symbol = checker.getSymbolAtLocation(node);
            if (symbol && symbol.valueDeclaration) {
                const declaration = symbol.valueDeclaration;
                if (
                    ts.isClassElement(declaration) &&
                    declaration.name !== node
                ) {
                    return transformIdentifierMembers(node, declaration);
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
                        checker.getPropertyOfType(
                            typeOfObjectLiteral,
                            node.text
                        );
                    if (
                        originalSymbol &&
                        originalSymbol.valueDeclaration &&
                        ts.isClassElement(originalSymbol.valueDeclaration)
                    ) {
                        return transformIdentifierMembers(
                            node,
                            originalSymbol.valueDeclaration
                        );
                    }
                }
            }

            return node;
        }

        function transformVariableStatement(node: ts.VariableStatement) {
            const list = node.declarationList.declarations
                .map(transformVariableDeclaration)
                .filter(isDef);
            if (list.length) {
                return ts.createVariableStatement(
                    node.modifiers,
                    ts.createVariableDeclarationList(
                        list,
                        node.declarationList.flags
                    )
                );
            }
            return ts.createEmptyStatement();
        }

        function transformVariableDeclaration(node: ts.VariableDeclaration) {
            if (
                node.initializer &&
                skipParens(node.initializer).kind === ts.SyntaxKind.ThisKeyword
            ) {
                return undefined;
            }
            return node;
        }

        function transformIdentifierMembers(
            node: ts.Identifier,
            declaration: ts.ClassElement
        ) {
            if (
                or(isClassComputedDeclaration, isClassStateDeclaration)(
                    declaration
                )
            ) {
                return ts.createPropertyAccess(
                    ts.createIdentifier(node.text),
                    ts.createIdentifier('value')
                );
            } else if (
                !(
                    ts.isPropertyAccessExpression(node.parent) &&
                    node.parent.name === node
                ) &&
                isClassPropDeclaration(declaration)
            ) {
                return ts.createPropertyAccess(
                    ts.createIdentifier('props'),
                    ts.createIdentifier(node.text)
                );
            }
            return node;
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
