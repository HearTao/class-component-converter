import * as ts from 'typescript';
import { some, append, not } from './utils';
import createVHost from './host';

function isVueClass(type: ts.ExpressionWithTypeArguments): boolean {
    return ts.isIdentifier(type.expression) && type.expression.text === 'Vue';
}

function isComponentDecorator(expr: ts.Decorator): boolean {
    return (
        ts.isIdentifier(expr.expression) && expr.expression.text === 'Component'
    );
}

function isPropsDecorator(expr: ts.Decorator): boolean {
    return (
        ts.isCallExpression(expr.expression) &&
        ts.isIdentifier(expr.expression.expression) &&
        expr.expression.expression.text === 'Prop'
    );
}

function classNeedTransform(node: ts.ClassLikeDeclaration): boolean {
    return (
        some(
            node.heritageClauses,
            x =>
                x.token === ts.SyntaxKind.ExtendsKeyword &&
                some(x.types, isVueClass)
        ) && some(node.decorators, isComponentDecorator)
    );
}

function propertyAccessNeedTransform(
    node: ts.PropertyAccessExpression,
    checker: ts.TypeChecker
): boolean {
    if (node.expression.kind === ts.SyntaxKind.ThisKeyword) {
        const symbol = checker.getSymbolAtLocation(node.name);
        if (symbol && symbol.valueDeclaration) {
            const property = symbol.valueDeclaration;
            if (ts.isPropertyDeclaration(property)) {
                return classNeedTransform(property.parent);
            }
        }
    }
    return false;
}

function skipParent(node: ts.Expression): ts.Expression {
    while (node && ts.isParenthesizedExpression(node)) {
        node = node.expression;
    }
    return node;
}

function variableNeedTransform(node: ts.VariableDeclaration): boolean {
    return !!(
        node.initializer &&
        ts.isObjectBindingPattern(node.name) &&
        skipParent(node.initializer).kind === ts.SyntaxKind.ThisKeyword)
}

function variableStatementNeedTransform(stmt: ts.VariableStatement): boolean {
    return stmt.declarationList.declarations.some(variableNeedTransform);
}

function isClassStateDeclaration(
    node: ts.ClassElement
): node is ClassStateDeclaration {
    return (
        ts.isPropertyDeclaration(node) &&
        !node.decorators &&
        ts.isIdentifier(node.name)
    );
}

function isClassMethodDeclaration(
    node: ts.ClassElement
): node is ClassMethodDeclaration {
    return (
        ts.isMethodDeclaration(node) &&
        !node.decorators &&
        ts.isIdentifier(node.name)
    );
}

function isRenderFunction(
    node: ts.ClassElement
): node is ClassMethodDeclaration {
    return (
        isClassMethodDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === 'render'
    );
}

function isClassPropDeclaration(
    node: ts.ClassElement
): node is ClassPropDeclaration {
    return (
        ts.isPropertyDeclaration(node) &&
        some(node.decorators, isPropsDecorator) &&
        ts.isIdentifier(node.name)
    );
}

function isClassComputedDeclaration(
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
function isClassLifeCycleDeclaration(
    node: ts.ClassElement
): node is ClassLifeCycleDeclaration {
    return (
        ts.isMethodDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        lifecycles.includes(node.name.text)
    );
}

function isValidComputedDeclaration(
    decl: ClassComputedDeclaration
): decl is ValidClassComputedDeclaration {
    return !!decl.getter;
}

type IdentifierName = { name: ts.Identifier };

type ClassStateDeclaration = ts.PropertyDeclaration & IdentifierName;
type ClassPropDeclaration = ts.PropertyDeclaration & IdentifierName;
type ClassLifeCycleDeclaration = ts.MethodDeclaration &
    IdentifierName &
    BodyDeclaration<ts.MethodDeclaration>;
type ClassMethodDeclaration = ts.MethodDeclaration &
    IdentifierName &
    BodyDeclaration<ts.MethodDeclaration>;

type BodyDeclaration<
    T extends ts.AccessorDeclaration | ts.MethodDeclaration
> = { body: Pick<T, 'body'> };
type Getter = ts.GetAccessorDeclaration &
    IdentifierName &
    BodyDeclaration<ts.GetAccessorDeclaration>;
type Setter = ts.SetAccessorDeclaration &
    IdentifierName &
    BodyDeclaration<ts.SetAccessorDeclaration>;

type ValidClassComputedDeclaration = {
    getter: Getter;
    setter?: Setter;
};
type ClassComputedDeclaration =
    | ValidClassComputedDeclaration
    | {
          getter?: Getter;
          setter: Setter;
      };

interface ComponentInfo {
    render: ClassMethodDeclaration | undefined;
    computed: Map<string, ClassComputedDeclaration>;
    states: ClassStateDeclaration[];
    props: ClassPropDeclaration[];
    methods: ClassMethodDeclaration[];
    lifecycles: ClassLifeCycleDeclaration[];
    ignored: ts.ClassElement[];
}

function collectClassDeclarationInfo(node: ts.ClassDeclaration): ComponentInfo {
    let render: ClassMethodDeclaration | undefined = undefined;
    const computed = new Map<string, ClassComputedDeclaration>();
    const states: ClassStateDeclaration[] = [];
    const props: ClassPropDeclaration[] = [];
    const methods: ClassMethodDeclaration[] = [];
    const lifecycles: ClassLifeCycleDeclaration[] = [];
    const ignored: ts.ClassElement[] = [];

    node.members.forEach(member => {
        switch (member.kind) {
            case ts.SyntaxKind.PropertyDeclaration:
                if (isClassStateDeclaration(member)) {
                    states.push(member);
                } else if (isClassPropDeclaration(member)) {
                    props.push(member);
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
        lifecycles,
        ignored
    };
}

const stateIdentifier = 'value';
const computedIdentifier = 'computed';

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
                            state.initializer && [state.initializer]
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
                                            comp.getter.body
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
                                            comp.setter.body
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
                        ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                        lifecycle.body
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
                            method.body
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
): ts.ReturnStatement {
    return ts.createReturn(
        ts.createObjectLiteral(
            nodes.map(node => ts.createShorthandPropertyAssignment(node.name))
        )
    );
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
        lifecycles,
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
                                    [transformClassProps(props)],
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
                                        transformClassDeclarationReturn([
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
    node: ts.PropertyAccessExpression
): ts.Node {
    return ts.createPropertyAccess(node.name, ts.createIdentifier('value'));
}

function transformVariableStatement(node: ts.VariableStatement): ts.Node {
    const newDeclList = node.declarationList.declarations.filter(not(variableNeedTransform))
    return newDeclList.length ? ts.createVariableStatement(
        node.modifiers,
        ts.createVariableDeclarationList(
            newDeclList
        )
    ) : ts.createEmptyStatement()
}

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
                case ts.SyntaxKind.VariableStatement:
                    return variableStatementVisitor(
                        node as ts.VariableStatement
                    );
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
                return ts.visitEachChild(
                    transformPropertyAccessExpression(declaration),
                    visitor,
                    context
                );
            }
            return ts.visitEachChild(declaration, visitor, context);
        }

        function variableStatementVisitor(
            declaration: ts.VariableStatement
        ) {
            if (variableStatementNeedTransform(declaration)) {
                return ts.visitEachChild(
                    transformVariableStatement(declaration),
                    visitor,
                    context
                );
            }
            return ts.visitEachChild(declaration, visitor, context);
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
