using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace DemoCrudBackend.Migrations
{
    /// <inheritdoc />
    public partial class SeedRoleManagementRights : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Rights",
                columns: new[] { "Id", "Name" },
                values: new object[,]
                {
                    { 9, "RoleRight_Assign" },
                    { 10, "Right_View" }
                });

            migrationBuilder.InsertData(
                table: "RoleRights",
                columns: new[] { "RightId", "RoleId" },
                values: new object[,]
                {
                    { 5, 2 },
                    { 6, 2 },
                    { 7, 2 },
                    { 8, 2 },
                    { 9, 1 },
                    { 10, 1 },
                    { 9, 2 },
                    { 10, 2 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "RoleRights",
                keyColumns: new[] { "RightId", "RoleId" },
                keyValues: new object[] { 9, 1 });

            migrationBuilder.DeleteData(
                table: "RoleRights",
                keyColumns: new[] { "RightId", "RoleId" },
                keyValues: new object[] { 10, 1 });

            migrationBuilder.DeleteData(
                table: "RoleRights",
                keyColumns: new[] { "RightId", "RoleId" },
                keyValues: new object[] { 5, 2 });

            migrationBuilder.DeleteData(
                table: "RoleRights",
                keyColumns: new[] { "RightId", "RoleId" },
                keyValues: new object[] { 6, 2 });

            migrationBuilder.DeleteData(
                table: "RoleRights",
                keyColumns: new[] { "RightId", "RoleId" },
                keyValues: new object[] { 7, 2 });

            migrationBuilder.DeleteData(
                table: "RoleRights",
                keyColumns: new[] { "RightId", "RoleId" },
                keyValues: new object[] { 8, 2 });

            migrationBuilder.DeleteData(
                table: "RoleRights",
                keyColumns: new[] { "RightId", "RoleId" },
                keyValues: new object[] { 9, 2 });

            migrationBuilder.DeleteData(
                table: "RoleRights",
                keyColumns: new[] { "RightId", "RoleId" },
                keyValues: new object[] { 10, 2 });

            migrationBuilder.DeleteData(
                table: "Rights",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Rights",
                keyColumn: "Id",
                keyValue: 10);
        }
    }
}
