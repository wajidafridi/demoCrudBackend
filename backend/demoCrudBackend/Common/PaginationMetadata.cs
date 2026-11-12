namespace DemoCrudBackend.Common
{
    public sealed class PaginationMetadata
    {
        public int PageNumber { get; init; }

        public int PageSize { get; init; }

        public int TotalCount { get; init; }

        public int TotalPages { get; init; }

        public bool HasPreviousPage => PageNumber > 1 && TotalPages > 0;

        public bool HasNextPage => PageNumber < TotalPages;

        public static PaginationMetadata Create(int pageNumber, int pageSize, int totalCount)
        {
            var totalPages = totalCount == 0
                ? 0
                : (int)Math.Ceiling(totalCount / (double)pageSize);

            return new PaginationMetadata
            {
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };
        }
    }
}
