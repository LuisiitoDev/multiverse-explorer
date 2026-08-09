type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

type PageToken = number | 'ellipsis'

function getPageTokens(current: number, total: number): PageToken[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const tokens: PageToken[] = [1]

  if (current > 3) {
    tokens.push('ellipsis')
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let page = start; page <= end; page += 1) {
    tokens.push(page)
  }

  if (current < total - 2) {
    tokens.push('ellipsis')
  }

  tokens.push(total)

  return tokens
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const tokens = getPageTokens(page, totalPages)

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__arrow"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        &#8249;
      </button>

      {tokens.map((token, index) =>
        token === 'ellipsis' ? (
          <span className="pagination__ellipsis" key={`ellipsis-${index}`} aria-hidden="true">
            &#8230;
          </span>
        ) : (
          <button
            type="button"
            key={token}
            className={`pagination__page ${token === page ? 'pagination__page--active' : ''}`}
            onClick={() => onPageChange(token)}
            aria-current={token === page ? 'page' : undefined}
          >
            {token}
          </button>
        ),
      )}

      <button
        type="button"
        className="pagination__arrow"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        &#8250;
      </button>
    </nav>
  )
}

export default Pagination
