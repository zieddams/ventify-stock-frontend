import { describe, expect, it } from 'vitest'

import { buildClientPaginationMeta, extractPaginationMeta, paginateItems } from './pagination'

describe('pagination helpers', () => {
  it('builds stable client pagination metadata', () => {
    expect(buildClientPaginationMeta(42, 2, 10)).toEqual({
      current_page: 2,
      last_page: 5,
      per_page: 10,
      total: 42,
      from: 11,
      to: 20,
    })
  })

  it('slices item collections using the computed page window', () => {
    expect(paginateItems([1, 2, 3, 4, 5], 2, 2)).toEqual({
      items: [3, 4],
      meta: {
        current_page: 2,
        last_page: 3,
        per_page: 2,
        total: 5,
        from: 3,
        to: 4,
      },
    })
  })

  it('extracts API pagination metadata with sane fallbacks', () => {
    expect(extractPaginationMeta({}, { current_page: 3, per_page: 25, total: 0 })).toEqual({
      current_page: 1,
      last_page: 1,
      per_page: 25,
      total: 0,
      from: 0,
      to: 0,
    })

    expect(extractPaginationMeta({
      meta: {
        current_page: 4,
        last_page: 8,
        per_page: 15,
        total: 120,
        from: 46,
        to: 60,
      },
    })).toEqual({
      current_page: 4,
      last_page: 8,
      per_page: 15,
      total: 120,
      from: 46,
      to: 60,
    })
  })
})
