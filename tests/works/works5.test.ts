import { convert } from '../../src';
import * as prettier from 'prettier';

const code = `
import Component, { Vue } from 'vue-class-component'
import { Prop }  from 'vue-property-decorator'

@Component
export default class YourComponent extends Vue {
    @Prop(Number) readonly propsA: number | undefined
}
`;

test(`snap`, () => {
    const ret = prettier.format(convert(code), { parser: `typescript` });
    expect(ret).toMatchSnapshot();
});
