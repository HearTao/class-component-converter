import { convert } from '../src'

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

    }

    mounted () {
        console.log(123)
    }
}
`

const result = convert(code)
console.log(result)