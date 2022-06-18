import {CascaderOption} from 'naive-ui'
export interface MyTreeSelectOption extends CascaderOption{
    label: string
    value: string
    depth: number
    isLeaf: boolean
}