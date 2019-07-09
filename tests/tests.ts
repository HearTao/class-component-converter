import { convert } from '../src';
import * as prettier from 'prettier';

const code = `
@Component
export default class YourComponent extends Vue {
    @Prop(Number) readonly propsA: number | undefined

    data1 = 123
    data2 = 234

    get what() {
        return this.data1
    }

    get why() {
        return this.data2 + 1
    }

    set why (value) {
        this.data2 = value - 1
    }

    hehe() {
        this.data1++
        console.log(this.data1, this.propsA)
    }

    fooo () {
        const { propsA, data1, data2, what, why, hehe } = this

        console.log(propsA, data1, data2, what, why, hehe)
    }

    mounted () {
        console.log(123)
    }
}
`;

const result = prettier.format(convert(code), {
    parser: 'typescript'
});
console.log(result);
