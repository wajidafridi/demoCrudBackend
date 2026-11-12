using System.Text.Json.Serialization;

namespace DemoCrudBackend.Common
{
    /// <summary>
    /// Standard API envelope for non-paginated endpoints.
    /// <see cref="Pagination"/> is always null in success/failure payloads.
    /// </summary>
    public sealed class ApiResponse<T>
    {
        public bool Success { get; init; }

        public string Message { get; init; } = string.Empty;

        public T? Data { get; init; }

        /// <summary>Always null for non-paginated endpoints.</summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
        public PaginationMetadata? Pagination { get; init; }

        public IReadOnlyDictionary<string, string[]>? Errors { get; init; }

        public static ApiResponse<T> Ok(T? data, string message)
        {
            return new ApiResponse<T>
            {
                Success = true,
                Message = message,
                Data = data,
                Pagination = null,
                Errors = null
            };
        }

        public static ApiResponse<T> Fail(
            string message,
            IReadOnlyDictionary<string, string[]>? errors = null)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Message = message,
                Data = default,
                Pagination = null,
                Errors = errors
            };
        }
    }

    /// <summary>
    /// Standard API envelope for paginated list endpoints.
    /// </summary>
    public sealed class PagedApiResponse<T>
    {
        public bool Success { get; init; }

        public string Message { get; init; } = string.Empty;

        public T? Data { get; init; }

        public required PaginationMetadata Pagination { get; init; }

        public IReadOnlyDictionary<string, string[]>? Errors { get; init; }

        public static PagedApiResponse<T> Ok(
            T data,
            string message,
            PaginationMetadata pagination)
        {
            return new PagedApiResponse<T>
            {
                Success = true,
                Message = message,
                Data = data,
                Pagination = pagination,
                Errors = null
            };
        }
    }

    public static class ApiResponse
    {
        public static ApiResponse<object?> Ok(string message)
        {
            return ApiResponse<object?>.Ok(null, message);
        }

        public static ApiResponse<object?> Fail(
            string message,
            IReadOnlyDictionary<string, string[]>? errors = null)
        {
            return ApiResponse<object?>.Fail(message, errors);
        }
    }
}
