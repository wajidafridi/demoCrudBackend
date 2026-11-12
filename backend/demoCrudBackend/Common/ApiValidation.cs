using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace DemoCrudBackend.Common
{
    public static class ApiValidation
    {
        public static IReadOnlyDictionary<string, string[]> ToErrorDictionary(ModelStateDictionary modelState)
        {
            return modelState
                .Where(entry => entry.Value is { Errors.Count: > 0 })
                .ToDictionary(
                    entry => entry.Key,
                    entry => entry.Value!.Errors
                        .Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage)
                            ? "Invalid value."
                            : error.ErrorMessage)
                        .ToArray());
        }

        public static IActionResult InvalidModelStateResponse(ActionContext context)
        {
            var errors = ToErrorDictionary(context.ModelState);
            return new BadRequestObjectResult(
                ApiResponse.Fail("Validation failed", errors));
        }
    }
}
