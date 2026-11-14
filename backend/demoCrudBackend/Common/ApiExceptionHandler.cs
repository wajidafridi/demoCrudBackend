using Microsoft.AspNetCore.Diagnostics;

namespace DemoCrudBackend.Common
{
    /// <summary>
    /// Turns an unhandled exception into the API envelope.
    /// The same body is used in every environment. Exception details stay in the log.
    /// </summary>
    public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
    {
        public const string UnexpectedErrorMessage = "An unexpected error occurred.";

        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
            {
                return false;
            }

            logger.LogError(
                exception,
                "Unhandled exception processing {Method} {Path}.",
                httpContext.Request.Method,
                httpContext.Request.Path.Value);

            httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await httpContext.Response.WriteAsJsonAsync(
                ApiResponse.Fail(UnexpectedErrorMessage),
                cancellationToken);

            return true;
        }
    }
}
