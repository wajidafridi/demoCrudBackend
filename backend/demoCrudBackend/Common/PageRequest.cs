namespace DemoCrudBackend.Common
{
    public static class PageRequest
    {
        public const int DefaultPageNumber = 1;

        public const int DefaultPageSize = 20;

        public const int MaxPageSize = 100;

        public static (int PageNumber, int PageSize) Normalize(int pageNumber, int pageSize)
        {
            var normalizedPageNumber = pageNumber < 1 ? DefaultPageNumber : pageNumber;
            var normalizedPageSize = pageSize < 1
                ? DefaultPageSize
                : Math.Min(pageSize, MaxPageSize);

            return (normalizedPageNumber, normalizedPageSize);
        }
    }
}
