using DemoCrudBackend.Common;
using Microsoft.AspNetCore.Mvc;

namespace DemoCrudBackend.Controllers
{
    [ApiController]
    public abstract class ApiControllerBase : ControllerBase
    {
        protected ActionResult<ApiResponse<T>> ApiOk<T>(T data, string message)
        {
            return Ok(ApiResponse<T>.Ok(data, message));
        }

        protected ActionResult<PagedApiResponse<T>> ApiOkPaged<T>(
            T data,
            string message,
            PaginationMetadata pagination)
        {
            return Ok(PagedApiResponse<T>.Ok(data, message, pagination));
        }

        protected ActionResult ApiOkMessage(string message)
        {
            return Ok(ApiResponse.Ok(message));
        }

        protected ActionResult<ApiResponse<T>> ApiCreated<T>(
            string actionName,
            object routeValues,
            T data,
            string message)
        {
            return CreatedAtAction(actionName, routeValues, ApiResponse<T>.Ok(data, message));
        }

        protected ActionResult ApiFail(
            int statusCode,
            string message,
            IReadOnlyDictionary<string, string[]>? errors = null)
        {
            return StatusCode(statusCode, ApiResponse.Fail(message, errors));
        }

        protected ActionResult ApiNotFound(string message)
        {
            return ApiFail(StatusCodes.Status404NotFound, message);
        }

        protected ActionResult ApiBadRequest(
            string message,
            IReadOnlyDictionary<string, string[]>? errors = null)
        {
            return ApiFail(StatusCodes.Status400BadRequest, message, errors);
        }

        protected ActionResult ApiConflict(string message)
        {
            return ApiFail(StatusCodes.Status409Conflict, message);
        }

        protected ActionResult ApiForbidden(string message)
        {
            return ApiFail(StatusCodes.Status403Forbidden, message);
        }

        protected ActionResult ApiUnauthorized(string message)
        {
            return ApiFail(StatusCodes.Status401Unauthorized, message);
        }
    }
}
