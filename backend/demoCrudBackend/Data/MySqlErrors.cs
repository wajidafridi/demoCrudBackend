using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace DemoCrudBackend.Data
{
    public static class MySqlErrors
    {
        public static bool IsDuplicateKey(DbUpdateException exception)
        {
            for (var current = exception.InnerException; current is not null; current = current.InnerException)
            {
                if (current is MySqlException mysql
                    && mysql.ErrorCode == MySqlErrorCode.DuplicateKeyEntry)
                {
                    return true;
                }
            }

            return false;
        }

        public static bool IsDeleteRestricted(DbUpdateException exception)
        {
            for (var current = exception.InnerException; current is not null; current = current.InnerException)
            {
                if (current is MySqlException mysql
                    && (mysql.ErrorCode == MySqlErrorCode.RowIsReferenced
                        || mysql.ErrorCode == MySqlErrorCode.RowIsReferenced2))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
