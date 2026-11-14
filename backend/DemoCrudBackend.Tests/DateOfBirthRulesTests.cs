using DemoCrudBackend.Common;

namespace DemoCrudBackend.Tests
{
    public class DateOfBirthRulesTests
    {
        private static readonly DateTime LateUtc = new(2026, 11, 14, 23, 30, 0, DateTimeKind.Utc);
        private static readonly DateTime AfterUtcMidnight = new(2026, 11, 15, 0, 5, 0, DateTimeKind.Utc);

        [Fact]
        public void UtcCalendarDate_UsesUtcComponents()
        {
            Assert.Equal(new DateOnly(2026, 11, 14), DateOfBirthRules.UtcCalendarDate(LateUtc));
            Assert.Equal(new DateOnly(2026, 11, 15), DateOfBirthRules.UtcCalendarDate(AfterUtcMidnight));
        }

        [Fact]
        public void IsFuture_AcceptsYesterdayAndToday_RejectsTomorrow()
        {
            Assert.False(DateOfBirthRules.IsFuture(new DateTime(2026, 11, 13), LateUtc));
            Assert.False(DateOfBirthRules.IsFuture(new DateTime(2026, 11, 14), LateUtc));
            Assert.True(DateOfBirthRules.IsFuture(new DateTime(2026, 11, 15), LateUtc));

            Assert.False(DateOfBirthRules.IsFuture(new DateTime(2026, 11, 14), AfterUtcMidnight));
            Assert.False(DateOfBirthRules.IsFuture(new DateTime(2026, 11, 15), AfterUtcMidnight));
            Assert.True(DateOfBirthRules.IsFuture(new DateTime(2026, 11, 16), AfterUtcMidnight));
        }

        [Fact]
        public void IsFuture_DoesNotShiftAnUnspecifiedCalendarDate()
        {
            var birth = new DateTime(2026, 11, 15, 0, 0, 0, DateTimeKind.Unspecified);

            Assert.True(DateOfBirthRules.IsFuture(birth, LateUtc));
            Assert.False(DateOfBirthRules.IsFuture(birth, AfterUtcMidnight));
        }

        [Fact]
        public void IsFuture_TreatsALocalClockAsUtcInstant()
        {
            var local = new DateTime(2026, 11, 15, 1, 0, 0, DateTimeKind.Local);
            var expectedToday = DateOnly.FromDateTime(local.ToUniversalTime());

            Assert.Equal(expectedToday, DateOfBirthRules.UtcCalendarDate(local));
            Assert.False(DateOfBirthRules.IsFuture(expectedToday.ToDateTime(TimeOnly.MinValue), local));
            Assert.True(DateOfBirthRules.IsFuture(expectedToday.AddDays(1).ToDateTime(TimeOnly.MinValue), local));
        }

        [Fact]
        public void IsFuture_AllowsAMissingDate()
        {
            Assert.False(DateOfBirthRules.IsFuture(null, LateUtc));
        }
    }
}
