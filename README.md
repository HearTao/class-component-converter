<br/>

<div align=center>

<img src="./assets/logo.svg" width="120" alt="class-component-convert" />

# class-component-converter

_Transform your vue class component to functional api_

[![Build Status](https://travis-ci.org/HearTao/class-component-converter.svg?branch=master)](https://travis-ci.org/HearTao/class-component-converter)
[![codecov](https://codecov.io/gh/HearTao/class-component-converter/branch/master/graph/badge.svg)](https://codecov.io/gh/HearTao/class-component-converter)
[![npm version](https://badge.fury.io/js/class-component-converter.svg)](https://badge.fury.io/js/class-component-converter)

_`npm i class-component-converter`_

</div>

<br/>

## WARNING: [WIP]

class-component-converter is a transformer to convert your Vue component to Vue functional api.

## Example

### Before

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

@Component
export default class YourComponent extends Comp<{}> {
  @Prop(Number) readonly propsA: number | undefined;

  @Emit()
  test() {
    this.data1++;
  }

  @Emit("testtest")
  testt() {
    this.data1++;
  }

  @Emit()
  test1(v: number) {
    this.data1++;
  }

  @Emit()
  test2(v: number) {
    this.data1++;
    return v + 1;
  }

  @Inject() readonly foo: string;
  @Inject("bar") readonly injectionBar: string;

  @Provide() provideFoo = "foo";
  @Provide("baz") provideBaz = "baz";

  data1 = 123;
  data2 = 234;

  get what() {
    return this.data1;
  }

  get why() {
    return this.data2 + this.propsA + 1;
  }

  set why(value) {
    this.data2 = value - 1;
    console.log(this.foo, this.injectionBar);
  }

  hehe() {
    this.data1++;
    console.log(this.data1, this.propsA);

    this.$emit("123", this.data1);
  }

  fooo() {
    const { propsA, data1, data2, what, why, hehe } = this;
    const { fff } = foo();

    console.log(propsA, data1, data2, what, why, hehe);
  }

  @Watch("propsA")
  handlePropsAChanged(value: number, oldValue: number) {
    console.log(this.propsA, value, oldValue);
  }

  @Watch("data1")
  handleData1Changed() {
    console.log(
      this.propsA,
      this.data1,
      this.data2,
      this.what,
      this.why,
      this.hehe()
    );
  }

  @Watch("$route")
  handleRouteChanged() {
    console.log(this.$router, this.$route, this.$store, this.$store.getters);
  }

  mounted() {
    if (this.$slots.default) {
      this.$slots.defalult(this.$refs.node);
    }
    console.log(123);

    const self = this;
    self.fooo();
    console.log(self.propsA);
    console.log(self.$route);
  }

  render() {
    return <div>{this.data1}</div>;
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