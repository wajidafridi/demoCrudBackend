namespace DemoCrudBackend.Common
{
    public static class DateOfBirthRules
    {
        public const string FutureMessage = "Date of birth cannot be in the future.";

        public static bool IsFuture(DateTime? value, DateTime utcNow)
        {
            if (value is null)
            {
                return false;
            }

            return DateOnly.FromDateTime(value.Value) > DateOnly.FromDateTime(utcNow);
        }
    }
}
