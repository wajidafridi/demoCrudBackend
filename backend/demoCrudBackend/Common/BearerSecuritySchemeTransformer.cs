using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace DemoCrudBackend.Common
{
    /// <summary>
    /// Adds one HTTP Bearer scheme named <see cref="SchemeId"/> to the OpenAPI document.
    /// Scalar uses that name for its Authorize control.
    /// </summary>
    public sealed class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
    {
        public const string SchemeId = "Bearer";

        public Task TransformAsync(
            OpenApiDocument document,
            OpenApiDocumentTransformerContext context,
            CancellationToken cancellationToken)
        {
            document.Components ??= new OpenApiComponents();
            document.AddComponent(SchemeId, new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Paste the access token from POST /api/auth/login. Do not include the Bearer prefix."
            });

            return Task.CompletedTask;
        }
    }

    /// <summary>
    /// Marks authorized operations with the Bearer scheme. Anonymous endpoints, including login, stay unmarked.
    /// </summary>
    public sealed class BearerSecurityRequirementTransformer : IOpenApiOperationTransformer
    {
        public Task TransformAsync(
            OpenApiOperation operation,
            OpenApiOperationTransformerContext context,
            CancellationToken cancellationToken)
        {
            if (!RequiresBearer(context))
            {
                return Task.CompletedTask;
            }

            operation.Security ??= [];
            operation.Security.Add(new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference(BearerSecuritySchemeTransformer.SchemeId, context.Document)] = []
            });

            return Task.CompletedTask;
        }

        private static bool RequiresBearer(OpenApiOperationTransformerContext context)
        {
            var metadata = context.Description.ActionDescriptor.EndpointMetadata;
            if (metadata.OfType<IAllowAnonymous>().Any())
            {
                return false;
            }

            return metadata.OfType<IAuthorizeData>().Any();
        }
    }
}
