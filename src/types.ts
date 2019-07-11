export type IdentifierName = { name: ts.Identifier };
export type Decorators = { decorators: ReadonlyArray<ts.Decorator> };
export type Body = { body: ts.Block };
export type Initializer = { initializer: ts.Expression };

export type WithBody<T extends Partial<Body>> = T & Body;

export type WithInitializer<T extends Partial<Initializer>> = T & Initializer;

import * as ts from 'typescript';

export interface ClassStateDeclaration {
    decl: ts.PropertyDeclaration;
    name: ts.Identifier;
}

export interface ClassPropDeclaration {
    decl: ts.PropertyDeclaration;
    name: ts.Identifier;
}

export interface ClassProviderDeclaration {
    decl: WithInitializer<ts.PropertyDeclaration>;
    name: ts.Identifier;
}

export interface ClassInjectDeclaration {
    decl: ts.PropertyDeclaration;
    name: ts.Identifier;
}

export interface ClassLifeCycleDeclaration {
    decl: WithBody<ts.MethodDeclaration>;
    name: ts.Identifier;
}

export interface ClassMethodDeclaration {
    decl: WithBody<ts.MethodDeclaration>;
    name: ts.Identifier;
}

export interface ClassWatchDeclaration {
    decl: WithBody<ts.MethodDeclaration>;
    name: ts.Identifier;
    watch: string;
}

export interface ClassEmitDeclaration {
    decl: WithBody<ts.MethodDeclaration>;
    name: ts.Identifier;
}

export interface Getter {
    decl: WithBody<ts.GetAccessorDeclaration>;
    name: ts.Identifier;
}

export interface Setter {
    decl: WithBody<ts.SetAccessorDeclaration>;
    name: ts.Identifier;
}

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
