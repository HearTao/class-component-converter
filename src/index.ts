import * as ts from 'typescript';
import {
    some,
    append,
    not,
    or,
    cast,
    first,
    assertDef,
    pickOut,
    isDef
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
    isWatchDecorator,
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
    isValidComputedDeclaration
} from './helper';
import {
    classNeedTransform,
    propertyAccessNeedTransform,
    identifierNeedTransform
} from './transform';

function collectClassDeclarationInfo(node: ts.ClassDeclaration): ComponentInfo {
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

    node.members.forEach(member => {
        switch (member.kind) {
            case ts.SyntaxKind.PropertyDeclaration:
                if (isClassStateDeclaration(member)) {
                    states.push(member);
                } else if (isClassPropDeclaration(member)) {
                    props.push(member);
                } else if (isClassProviderDeclaration(member)) {
                    providers.push(member);
                } else if (isClassInjectionDeclaration(member)) {
                    injections.push(member);
                } else {
                    ignored.push(member);
                }
                break;
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
                if (isClassComputedDeclaration(member)) {
                    const name = member.name.text;
                    let value:
                        | ClassComputedDeclaration
                        | undefined = computed.get(name);
                    if (ts.isGetAccessor(member)) {
                        value = { ...value, getter: member };
                    } else {
                        value = { ...value, setter: member };
                    }
                    computed.set(name, value);
                } else {
                    ignored.push(member);
                }
                break;
            case ts.SyntaxKind.MethodDeclaration:
                if (isRenderFunction(member)) {
                    render = member;
                } else if (isClassWatchDeclaration(member)) {
                    watchers.push(member);
                } else if (isClassEemitDeclaration(member)) {
                    emits.push(member);
                } else if (isClassLifeCycleDeclaration(member)) {
                    lifecycles.push(member);
                } else if (isClassMethodDeclaration(member)) {
                    methods.push(member);
                } else {
                    ignored.push(member);
                }
                break;
            default:
                ignored.push(member);
                break;
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
                default:
                    return ts.visitEachChild(node, visitor, context);
            }
        };
        return n => ts.visitNode(n, visitor);

        function classDeclarationVisitor(declaration: ts.ClassDeclaration) {
            if (classNeedTransform(declaration)) {
                return ts.visitEachChild(
                    transformClassDeclaration(declaration),
                    visitor,
                    context
                );
            }
            return ts.visitEachChild(declaration, visitor, context);
        }

        function propertyAccessExpressionVisitor(
            declaration: ts.PropertyAccessExpression
        ) {
            if (propertyAccessNeedTransform(declaration, checker)) {
                return transformPropertyAccessExpression(
                    ts.visitEachChild(declaration, visitor, context),
                    checker
                );
            }
            return ts.visitEachChild(declaration, visitor, context);
        }

        function identifierVisitor(declaration: ts.Identifier) {
            if (identifierNeedTransform(declaration, checker)) {
                return transformIdentifier(
                    ts.visitEachChild(declaration, visitor, context),
                    checker
                );
            }
            return ts.visitEachChild(declaration, visitor, context);
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
                                state.type,
                                ts.createCall(
                                    ts.createIdentifier(stateIdentifier),
                                    undefined,
                                    state.initializer && [
                                        ts.visitEachChild(
                                            state.initializer,
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
                            prop.questionToken,
                            prop.type,
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
                                    comp.getter.type,
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
                                                        comp.getter.body,
                                                        visitor,
                                                        context
                                                    )
                                                )
                                            ],
                                            comp.setter &&
                                                ts.createArrowFunction(
                                                    undefined,
                                                    undefined,
                                                    comp.setter.parameters,
                                                    undefined,
                                                    ts.createToken(
                                                        ts.SyntaxKind
                                                            .EqualsGreaterThanToken
                                                    ),
                                                    ts.visitEachChild(
                                                        comp.setter.body,
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
                                    lifecycle.body,
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
                                    method.typeParameters,
                                    method.parameters,
                                    undefined,
                                    ts.createToken(
                                        ts.SyntaxKind.EqualsGreaterThanToken
                                    ),
                                    ts.visitEachChild(
                                        method.body,
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
            return watchers.map(watcher =>
                ts.createExpressionStatement(
                    ts.createCall(ts.createIdentifier('watch'), undefined, [
                        ts.createIdentifier(
                            cast(
                                first(
                                    cast(
                                        watcher.decorators.find(
                                            isWatchDecorator
                                        )!.expression,
                                        ts.isCallExpression
                                    ).arguments
                                ),
                                ts.isStringLiteral
                            ).text
                        ),
                        ts.createArrowFunction(
                            undefined,
                            undefined,
                            watcher.parameters,
                            undefined,
                            ts.createToken(
                                ts.SyntaxKind.EqualsGreaterThanToken
                            ),
                            ts.visitEachChild(watcher.body, visitor, context)
                        )
                    ])
                )
            );
        }

        function transformClassEmitDeclaration(
            emits: ReadonlyArray<ClassEmitDeclaration>
        ): ts.VariableStatement[] {
            return emits.map(emit => {
                const parameters = emit.parameters;
                const body = ts.visitEachChild(emit.body, visitor, context);
                const stmts: ReadonlyArray<ts.Statement> = body
                    ? body.statements
                    : [];
                const [returnArgs, others] = pickOut(
                    stmts,
                    ts.isReturnStatement
                );
                const args = [
                    ts.createStringLiteral(emit.name.text),
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
                                    provider.name,
                                    ts.visitEachChild(
                                        assertDef(provider.initializer),
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
                                injection.type,
                                ts.createCall(
                                    ts.createIdentifier('inject'),
                                    undefined,
                                    [
                                        ts.createStringLiteral(
                                            injection.name.text
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
            } = collectClassDeclarationInfo(node);

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
                                                ...transformClassStates(states),
                                                ...transformClassComputedDeclaration(
                                                    computed
                                                ),
                                                ...transformClassMethodDeclaration(
                                                    methods
                                                ),
                                                ...transformClassLifeCycleDeclaration(
                                                    lifecycles
                                                ),
                                                ...transformClassWatchDeclaration(
                                                    watchers
                                                ),
                                                ...transformClassEmitDeclaration(
                                                    emits
                                                ),
                                                ...transformClassProviderDeclaration(
                                                    providers
                                                ),
                                                ...transformClassInjectionDeclaration(
                                                    injections
                                                ),
                                                ...transformClassDeclarationReturn(
                                                    [
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
                                    render
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
                if (
                    node.name.text === '$emit' ||
                    node.name.text === '$refs' ||
                    node.name.text === '$slots'
                ) {
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
            if (
                symbol &&
                symbol.valueDeclaration &&
                ts.isClassElement(symbol.valueDeclaration) &&
                symbol.valueDeclaration.name !== node
            ) {
                const declaration = symbol.valueDeclaration;
                if (
                    or(isClassComputedDeclaration, isClassStateDeclaration)(
                        declaration
                    )
                ) {
                    return ts.createPropertyAccess(
                        cast(declaration.name!, ts.isIdentifier),
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
                        cast(declaration.name!, ts.isIdentifier)
                    );
                }
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
