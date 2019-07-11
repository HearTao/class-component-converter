export type IdentifierName = { name: ts.Identifier };
export type Decorators = { decorators: ReadonlyArray<ts.Decorator> };

import * as ts from 'typescript';

export type ClassStateDeclaration = ts.PropertyDeclaration & IdentifierName;
export type ClassPropDeclaration = ts.PropertyDeclaration &
    IdentifierName &
    Decorators;
export type ClassProviderDeclaration = ts.PropertyDeclaration &
    IdentifierName &
    Decorators;
export type ClassInjectDeclaration = ts.PropertyDeclaration &
    IdentifierName &
    Decorators;

export type ClassLifeCycleDeclaration = ts.MethodDeclaration &
    IdentifierName &
    BodyDeclaration<ts.MethodDeclaration>;
export type ClassMethodDeclaration = ts.MethodDeclaration &
    IdentifierName &
    BodyDeclaration<ts.MethodDeclaration>;
export type ClassWatchDeclaration = ts.MethodDeclaration &
    IdentifierName &
    Decorators &
    BodyDeclaration<ts.MethodDeclaration>;
export type ClassEmitDeclaration = ts.MethodDeclaration &
    IdentifierName &
    Decorators &
    BodyDeclaration<ts.MethodDeclaration>;

export type BodyDeclaration<
    T extends ts.AccessorDeclaration | ts.MethodDeclaration
> = { body: Pick<T, 'body'> };
export type Getter = ts.GetAccessorDeclaration &
    IdentifierName &
    BodyDeclaration<ts.GetAccessorDeclaration>;
export type Setter = ts.SetAccessorDeclaration &
    IdentifierName &
    BodyDeclaration<ts.SetAccessorDeclaration>;

export type ValidClassComputedDeclaration = {
    getter: Getter;
    setter?: Setter;
};
export type ClassComputedDeclaration =
    | ValidClassComputedDeclaration
    | {
          getter?: Getter;
          setter: Setter;
      };

export interface ComponentInfo {
    render: ClassMethodDeclaration | undefined;
    computed: Map<string, ClassComputedDeclaration>;
    states: ClassStateDeclaration[];
    props: ClassPropDeclaration[];
    methods: ClassMethodDeclaration[];
    emits: ClassEmitDeclaration[];
    watchers: ClassWatchDeclaration[];
    lifecycles: ClassLifeCycleDeclaration[];
    ignored: ts.ClassElement[];
    providers: ClassProviderDeclaration[];
    injections: ClassInjectDeclaration[];
}
