namespace DemoCrudBackend.Common
{
    /// <summary>
    /// Date of birth is a calendar date, not a timestamp.
    /// "Today" is the current UTC calendar date. A value is in the future when its
    /// year-month-day is after that UTC date. The time of day is ignored, and the
    /// birth date is not shifted into another timezone, so the browser and the API
    /// accept the same <c>YYYY-MM-DD</c> value.
    /// </summary>
    public static class DateOfBirthRules
    {
        public const string FutureMessage = "Date of birth cannot be in the future.";

        public static bool IsFuture(DateTime? value, DateTime utcNow)
        {
            if (value is null)
            {
                return false;
            }

            var birthDate = DateOnly.FromDateTime(value.Value);
            return birthDate > UtcCalendarDate(utcNow);
        }

        public static DateOnly UtcCalendarDate(DateTime clock)
        {
            var utc = clock.Kind switch
            {
                DateTimeKind.Utc => clock,
                DateTimeKind.Local => clock.ToUniversalTime(),
                _ => DateTime.SpecifyKind(clock, DateTimeKind.Utc),
            };

            return DateOnly.FromDateTime(utc);
        }
    }
}
