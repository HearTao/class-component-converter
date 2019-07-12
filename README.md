# class-component-converter

## WARNING: [WIP]

class-component-converter is a transformer to convert your Vue component to Vue functional api.

## Example

### Before

```tsx
@Component
export default class YourComponent extends Vue {
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
        console.log(this.foo, this.bar)
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

    mounted () {
        if (this.$slots.default) {
            this.$slots.defalult(this.$refs.node)
        }
        console.log(123)
    }
}
```

### After

```tsx
const YourComponent = {
  steup(
    props: {
      propsA: number | undefined;
    },
    context
  ) {
    const foo: string = inject("foo");
    const bar: string = inject("bar");
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
      const { propsA, data1, data2, what, why, hehe } = this;
      const { fff } = foo();
      console.log(propsA, data1, data2, what, why, hehe);
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
        console.log(foo, this.bar);
      }
    );
    onMounted(() => {
      if (context.$slots.default) {
        context.$slots.defalult(context.$refs.node);
      }
      console.log(123);
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
    provide({ provideFoo: "foo", baz: "baz" });
    return { foo, bar, data1, data2, hehe, fooo, what, why };
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
    - [ ] Destruction
    - [ ] Emits to callback
    - [ ] Listeners to callback
    - [ ] Slots to callack
    - [ ] Re-order declarations
    
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
    - [ ] Type annotation transform
    
    </details>

- [ ] External libs support
    <details>
    
    - [ ] raw vue
    - [ ] vue-class-component
    - [x] vue-property-decorator
    - [ ] vue-tsx-support
    
    </details>

- [ ] Vuex & Vue router support
    <details>
    
    - [ ] vuex
    - [ ] vue-router
    - [ ] vuex-class
    
    </details>

- [ ] Vue file support
    <details>
    
    - [ ] Template SFC
    - [ ] Tsx
    
    </details>

- [ ] Usages
    <details>
    
    - [ ] Cli
    - [ ] Libs
    
    </details>

- [ ] DevOps
    <details>
    
    - [ ] Tests
    - [ ] Codecov
    - [ ] CI
    - [ ] Lint && Prettier
    
    </details>
