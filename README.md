# class-component-converter

## WARNING: [WIP]

class-component-converter is a transformer to convert your Vue component to Vue functional api.

## Example

### Before

```tsx
import { Component as Comp } from 'vue-tsx-support'
import { Component, Prop, Emit, Inject, Provide, Watch }  from 'vue-property-decorator'

@Component
export default class YourComponent extends Comp<{}> {
    @Prop(Number) readonly propsA: number | undefined

    @Emit()
    test () {
        this.data1++
    }

    @Emit('testtest')
    testt () {
        this.data1++
    }

    @Emit()
    test1 (v: number) {
        this.data1++
    }

    @Emit()
    test2 (v: number) {
        this.data1++
        return v + 1
    }

    @Inject() readonly foo: string
    @Inject('bar') readonly injectionBar: string
  
    @Provide() provideFoo = 'foo'
    @Provide('baz') provideBaz = 'baz'

    data1 = 123
    data2 = 234

    get what() {
        return this.data1
    }

    get why() {
        return this.data2 + this.propsA + 1
    }

    set why (value) {
        this.data2 = value - 1
        console.log(this.foo, this.injectionBar)
    }

    hehe() {
        this.data1++
        console.log(this.data1, this.propsA)

        this.$emit('123', this.data1)
    }

    fooo () {
        const { propsA, data1, data2, what, why, hehe } = this
        const { fff } = foo()

        console.log(propsA, data1, data2, what, why, hehe)
    }

    @Watch('propsA')
    handlePropsAChanged(value: number, oldValue: number) {
        console.log(this.propsA, value, oldValue)
    }

    @Watch('data1')
    handleData1Changed() {
        console.log(this.propsA, this.data1, this.data2, this.what, this.why, this.hehe())
    }

    @Watch('$route')
    handleRouteChanged () {
        console.log(this.$router, this.$route, this.$store, this.$store.getters)
    }

    mounted () {
        if (this.$slots.default) {
            this.$slots.defalult(this.$refs.node)
        }
        console.log(123)

        const self = this
        self.fooo()
        console.log(self.propsA)
        console.log(self.$route)
    }

    render () {
        return (
            <div>{this.data1}</div>
        )
    }
}
```

### After

```tsx
import { Component as Comp } from "vue-tsx-support";
import {
  Component,
  Prop,
  Emit,
  Inject,
  Provide,
  Watch
} from "vue-property-decorator";
const YourComponent = {
  steup(
    props: {
      propsA: number | undefined;
    },
    context
  ) {
    const foo: string = inject("foo");
    const injectionBar: string = inject("bar");
    const data1 = value(123);
    const data2 = value(234);
    const test = () => {
      data1.value++;
      context.$emit("test");
    };
    const testt = () => {
      data1.value++;
      context.$emit("testtest");
    };
    const test1 = (v: number) => {
      data1.value++;
      context.$emit("test1", v);
    };
    const test2 = (v: number) => {
      data1.value++;
      context.$emit("test2", v + 1, v);
    };
    const hehe = () => {
      data1.value++;
      console.log(data1.value, props.propsA);
      context.$emit("123", data1.value);
    };
    const fooo = () => {
      const { fff } = foo();
      console.log(
        props.propsA,
        data1.value,
        data2.value,
        what.value,
        why.value,
        hehe
      );
    };
    const what = computed(() => {
      return data1.value;
    });
    const why = computed(
      () => {
        return data2.value + props.propsA + 1;
      },
      value => {
        data2.value = value - 1;
        console.log(foo, injectionBar);
      }
    );
    onMounted(() => {
      if (context.$slots.default) {
        context.$slots.defalult(context.$refs.node);
      }
      console.log(123);
      fooo();
      console.log(props.propsA);
      console.log(context.$route);
    });
    watch(props.propsA, (value: number, oldValue: number) => {
      console.log(props.propsA, value, oldValue);
    });
    watch(data1, () => {
      console.log(
        props.propsA,
        data1.value,
        data2.value,
        what.value,
        why.value,
        hehe()
      );
    });
    watch(context.$route, () => {
      console.log(
        context.$router,
        context.$route,
        context.$store,
        context.$store.getters
      );
    });
    provide({ provideFoo: "foo", baz: "baz" });
    return { foo, injectionBar, data1, data2, hehe, fooo, what, why };
  },
  render() {
    return <div>{this.data1}</div>;
  }
};
```

## TODO:
- [x] Full Vue feature support
    <details>
    
    - [x] data
    - [x] props
    - [x] computed
    - [x] methods
    - [x] lifecycle
    - [x] emits
    - [x] slots
    - [x] ref
    - [x] provide / inject
    - [x] watch
    - [x] render
    
    </details>

- [ ] Vue instance transform
    <details>
    
    - [x] Decorator arguments
    - [x] Wrapper value
    - [x] Property access
    - [x] Destruction
    - [x] This assignment
    - [ ] Emits to callback
    - [ ] Listeners to callback
    - [ ] Slots to callack
    - [ ] Re-order declarations
    - [ ] Full project support
    - [ ] Strict import track
    
    </details>

- [ ] RFC support
    <details>
    
    - [x] vue-function-api
    - [ ] vue-next
    
    </details>

- [ ] Better TypeScript support
    <details>
    
    - [x] Compiler Host
    - [ ] JavaScript support
    
    </details>

- [ ] External libs support
    <details>
    
    - [ ] raw vue
    - [x] vue-class-component
    - [x] vue-property-decorator
    - [x] vue-tsx-support
    - [ ] vuex-class
    
    </details>

- [x] Vuex & Vue router support
    <details>
    
    - [x] vuex
    - [x] vue-router
    
    </details>

- [ ] Vue file support
    <details>
    
    - [ ] Template SFC
    - [ ] Tsx
    
    </details>

- [ ] Usages
    <details>
    
    - [X] Cli
    - [ ] Libs
    - [ ] Webpack
    
    </details>

- [ ] DevOps
    <details>
    
    - [ ] Tests
    - [ ] Codecov
    - [ ] CI
    - [x] Lint && Prettier
    - [ ] Update readme automatic
    
    </details>
