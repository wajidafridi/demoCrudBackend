namespace DemoCrudBackend.Common
{
    public sealed class PagedResult<T>
    {
        public required IReadOnlyList<T> Items { get; init; }

        public required PaginationMetadata Pagination { get; init; }
    }
}
