using DemoCrudBackend.Dtos;

namespace DemoCrudBackend.Services
{
    public enum UserWriteStatus
    {
        Success,
        NotFound,
        Forbidden,
        ValidationFailed,
        Conflict
    }

    public sealed class UserWriteResult
    {
        public UserWriteStatus Status { get; private init; }

        public UserResponseDto? User { get; private init; }

        public string? Message { get; private init; }

        public static UserWriteResult Success(UserResponseDto? user = null)
        {
            return new UserWriteResult
            {
                Status = UserWriteStatus.Success,
                User = user
            };
        }

        public static UserWriteResult NotFound(string? message = null)
        {
            return new UserWriteResult
            {
                Status = UserWriteStatus.NotFound,
                Message = message
            };
        }

        public static UserWriteResult Forbidden(string? message = null)
        {
            return new UserWriteResult
            {
                Status = UserWriteStatus.Forbidden,
                Message = message
            };
        }

        public static UserWriteResult ValidationFailed(string message)
        {
            return new UserWriteResult
            {
                Status = UserWriteStatus.ValidationFailed,
                Message = message
            };
        }

        public static UserWriteResult Conflict(string message)
        {
            return new UserWriteResult
            {
                Status = UserWriteStatus.Conflict,
                Message = message
            };
        }
    }
}
