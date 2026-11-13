namespace DemoCrudBackend.Services
{
    public enum WriteStatus
    {
        Success,
        NotFound,
        Forbidden,
        ValidationFailed,
        Conflict
    }

    public sealed class WriteResult<T>
    {
        public WriteStatus Status { get; private init; }

        public T? Data { get; private init; }

        public string? Message { get; private init; }

        public IReadOnlyDictionary<string, string[]>? Errors { get; private init; }

        public static WriteResult<T> Success(T? data = default)
        {
            return new WriteResult<T>
            {
                Status = WriteStatus.Success,
                Data = data
            };
        }

        public static WriteResult<T> NotFound(string? message = null)
        {
            return new WriteResult<T>
            {
                Status = WriteStatus.NotFound,
                Message = message
            };
        }

        public static WriteResult<T> Forbidden(string? message = null)
        {
            return new WriteResult<T>
            {
                Status = WriteStatus.Forbidden,
                Message = message
            };
        }

        public static WriteResult<T> ValidationFailed(
            string message,
            IReadOnlyDictionary<string, string[]>? errors = null)
        {
            return new WriteResult<T>
            {
                Status = WriteStatus.ValidationFailed,
                Message = message,
                Errors = errors
            };
        }

        public static WriteResult<T> Conflict(string message)
        {
            return new WriteResult<T>
            {
                Status = WriteStatus.Conflict,
                Message = message
            };
        }
    }
}
