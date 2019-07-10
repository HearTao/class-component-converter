import { convert } from '../src';
import * as prettier from 'prettier';

const code = `
@Component
export default class YourComponent extends Vue {
    @Prop(Number) readonly propsA: number | undefined

    @Emit()
    test () {
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
        console.log(this.propsA, this.data1, this.data2, this.what, this.why, this.hehe)
    }

    @Watch('propsA')
    handlePropsAChanged(value: number, oldValue: number) {
        console.log(this.propsA, value, oldValue)
    }

    mounted () {
        if (this.$slots.default) {
            this.$slots.defalult(this.$refs.node)
        }
        console.log(123)
    }
}
`;

const result = prettier.format(convert(code), {
    parser: 'typescript'
});
console.log(result);
