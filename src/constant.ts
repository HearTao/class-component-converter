export const contextProperty = [
    '$slots',
    '$scopedSlots',
    '$refs',
    '$emit',
    '$route',
    '$router',
    '$store'
];

export enum Libs {
    vue = 'vue',
    vueTsx = 'vue-tsx-support',
    vuePropertyDecorator = 'vue-property-decorator',
    vueClassComponent = 'vue-class-component'
}

export const lifecycles = [
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

export enum Decorators {
    Prop = 'Prop',
    Watch = 'Watch',
    Emit = 'Emit',
    Provide = 'Provide',
    Inject = 'Inject'
}

export enum Identifiers {
    steup = 'steup',
    render = 'render',
    context = 'context',
    props = 'props',
    value = 'value',
    computed = 'computed',
    watch = 'watch',
    $emit = '$emit',
    provide = 'provide',
    inject = 'inject'
}
