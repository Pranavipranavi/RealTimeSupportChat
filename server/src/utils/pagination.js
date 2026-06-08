export function getPagination(query, defaults = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaults.limit || 25, 1), defaults.maxLimit || 100);
  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

export function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    pages: Math.max(Math.ceil(total / limit), 1),
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1
  };
}
