# UI/UX Performance Notes

## Reusable utilities

- `src/shared/hooks/useDebouncedValue.ts` delays derived search updates until the user pauses typing. Search delay is configured to 300 ms on the optimized list pages.
- `src/shared/ui/Pagination.tsx` provides a responsive pagination footer with item counts, previous/next controls, and first/last-page controls on wider screens.
- `src/app/index.css` includes a short, low-cost result entrance animation and respects `prefers-reduced-motion`.

## Pages updated

- Quotation list: 10 records per page, debounced and memoized search/filtering.
- Customer list: 10 customers per page; filtering, sorting, and summary statistics are memoized.
- Warranty/control list: 10 records per page, debounced search, memoized filtering and summary statistics.
- Number-letter log: 10 records per page, including the responsive mobile card view.
- Status & deal pipeline: 10 records per page and debounced search.
- Order tracking: 10 records per page and debounced search.
- Field work orders: 8 cards per page and debounced search.
- Inventory: 10 stock items, projects, or stock movements per page; item search is debounced.
- Admin dashboard: existing server-side pagination is retained; report/project search refresh delay is standardized to 300 ms.

Pagination limits the number of rendered records per view. Existing data-loading methods and role-based access rules are retained; the list pages that load their source data in full still paginate on the client.
