import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import MyNote from './MyNote.vue'

describe('頁面初始化', () => {
  it('送出按鈕', () => {
    const wrapper = mount(MyNote)
    expect(wrapper.text()).toContain('送出')
  })
})