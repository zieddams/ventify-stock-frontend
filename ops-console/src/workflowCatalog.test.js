import { describe, expect, it } from 'vitest'
import { WORKFLOW_CATALOG, buildInitialWorkflowInputs } from './workflowCatalog'

describe('workflowCatalog', () => {
  it('defines a deploy action for every managed surface', () => {
    expect(WORKFLOW_CATALOG.map((item) => item.key)).toEqual(['ops', 'web', 'api', 'mobile'])
  })

  it('builds default form values with a main ref', () => {
    const defaults = buildInitialWorkflowInputs()

    expect(defaults.ops).toEqual({
      ref: 'main',
      version_bump: 'none',
    })
    expect(defaults.mobile).toEqual({
      ref: 'main',
      version_bump: 'patch',
      version_code_increment: '1',
    })
  })
})
