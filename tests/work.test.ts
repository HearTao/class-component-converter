import { convert } from '../src';
import * as prettier from 'prettier';

const code = `
import * as tsx from 'vue-tsx-support'
import { Component, Prop, Emit, Inject, Provide, Watch }  from 'vue-property-decorator'

@Component
export default class YourComponent extends tsx.Component<{}> {
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

        const self = (this)
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
`;

test(`snap`, () => {
    const ret = prettier.format(convert(code), { parser: `typescript` });
    expect(ret).toMatchSnapshot();
});
