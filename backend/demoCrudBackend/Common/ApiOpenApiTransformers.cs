using System.Text.Json.Nodes;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace DemoCrudBackend.Common
{
    /// <summary>
    /// Documents <c>pagination</c> on <see cref="ApiResponse{T}"/> as null in OpenAPI/Scalar
    /// so non-paginated endpoints do not show a fake pagination object.
    /// </summary>
    public sealed class ApiResponseSchemaTransformer : IOpenApiSchemaTransformer
    {
        public Task TransformAsync(
            OpenApiSchema schema,
            OpenApiSchemaTransformerContext context,
            CancellationToken cancellationToken)
        {
            var type = context.JsonTypeInfo.Type;
            if (!type.IsGenericType || type.GetGenericTypeDefinition() != typeof(ApiResponse<>))
            {
                return Task.CompletedTask;
            }

            if (schema.Properties is null)
            {
                return Task.CompletedTask;
            }

            var key = schema.Properties.Keys.FirstOrDefault(name =>
                string.Equals(name, "pagination", StringComparison.OrdinalIgnoreCase));

            if (key is null)
            {
                return Task.CompletedTask;
            }

            schema.Properties[key] = new OpenApiSchema
            {
                Type = JsonSchemaType.Null,
                Example = JsonValue.Create((object?)null),
                Default = JsonValue.Create((object?)null),
                Description = "Always null for non-paginated endpoints."
            };

            return Task.CompletedTask;
        }
    }
}
