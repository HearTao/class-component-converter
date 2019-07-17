export const contextProperty = [
    '$slots',
    '$scopedSlots',
    '$refs',
    '$emit',
    '$route',
    '$router',
    '$store'
];

export const vueClassSupport = ['vue', 'vue-tsx-support'];

export const vuePropertyDecorator = 'vue-property-decorator';

export const vueComponentSupport = [
    'vue-class-component',
    vuePropertyDecorator
];

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
