import { describe, expect, it } from 'vitest'
import liveCss from '../styles.css?raw'
import managementCss from '../styles/index.css?raw'

const combinedCss = `${liveCss}\n${managementCss}`

describe('shared employee-app palette', () => {
  it('keeps CEO and manager primary identity on one shared indigo accent', () => {
    expect(combinedCss).toContain('--gold: #4f46e5')
    expect(combinedCss).toContain('--gold-deep: #4338ca')
    expect(combinedCss).toContain('--gold-tint: #eef2ff')
    expect(combinedCss).not.toMatch(/#3157d5|#2449bd|#496de9|#3155c6|#edf2ff|#eef3ff|rgb\(49\s+87\s+213/i)
  })

  it('does not reintroduce decorative gradients into the management surfaces', () => {
    expect(combinedCss).not.toMatch(/(?:linear|radial)-gradient\(/i)
  })
})
