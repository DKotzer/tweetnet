function getRandomHolidayWithinRange() {
  const holidays = [
    { name: "New Year's Eve", date: "December 31" },
    { name: "Valentine's Day", date: "February 14" },
    { name: "St. Patrick's Day", date: "March 17" },
    { name: "Easter", date: "April 4" },
    { name: "Mother's Day", date: "May 14" },
    { name: "Father's Day", date: "June 18" },
    { name: "Independence Day", date: "July 1" },
    { name: "Halloween", date: "October 31" },
    { name: "Thanksgiving", date: "October 9" },
    { name: "Christmas", date: "December 25" },
    { name: "Christmas Eve", date: "December 24" },
    { name: "Eid", date: "May 16" },
    { name: "Hanukkah", date: "December 12" },
    { name: "Kwanzaa", date: "December 26" },
    { name: "Diwali", date: "November 7" },
    { name: "Lunar New Year", date: "February 8" },
    { name: "Cinco de Mayo", date: "May 5" },
    { name: "Earth Day", date: "April 22" },
    { name: "Labor Day", date: "September 4" },
    { name: "Martin Luther King Jr. Day", date: "January 17" },
    { name: "Memorial Day", date: "May 30" },
    { name: "Presidents' Day", date: "February 21" },
    { name: "Passover", date: "April 15" },
    { name: "Ramadan", date: "April 16" },
    { name: "Mardi Gras", date: "March 1" },
    { name: "Veterans Day", date: "November 11" },
    { name: "Groundhog Day", date: "February 2" },
    { name: "Boxing Day", date: "December 26" },
    { name: "April Fools' Day", date: "April 1" },
    { name: "Juneteenth", date: "June 19" },
    { name: "Indigenous Peoples' Day", date: "October 10" },
    { name: "420", date: "April 20" },
    { name: "Pride", date: "June 15" },
    { name: "Black Friday", date: "November 26" },
    { name: "Cyber Monday", date: "November 29" },
    { name: "National Donut Day", date: "June 4" },
    { name: "National Ice Cream Day", date: "July 18" },
    { name: "International Vegan Day", date: "November 1" },
    { name: "National Day for Truth and Reconciliation", date: "September 30" },
    { name: "Eid", date: "June 29" },
    { name: "Anne's Birthday", date: "December 3" },
    { name: "Dylan's Birthday", date: "December 2" },
    { name: "@Wendy Kotzer's Birthday", date: "February 22" },
    {
      name: "Period Literacy Handbook (by Dr. Anne Hussain) Launch Day",
      date: "May 8",
    },
  ];

  const currentDate = new Date();
  const startDate = new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000); // Subtract 10 days
  const endDate = new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000); // Add 10 days

  // Check if today is a holiday
  const todayHoliday = holidays.find((holiday) => {
    const holidayDate = new Date(
      holiday.date + ", " + currentDate.getFullYear()
    );
    return (
      holidayDate.getDate() === currentDate.getDate() &&
      holidayDate.getMonth() === currentDate.getMonth() &&
      holidayDate.getFullYear() === currentDate.getFullYear()
    );
  });

  if (todayHoliday) {
    return todayHoliday;
  }

  const holidaysInRange = holidays.filter((holiday) => {
    const holidayDate = new Date(
      holiday.date + ", " + currentDate.getFullYear()
    );
    return holidayDate >= startDate && holidayDate <= endDate;
  });

  // Return a random holiday from the filtered list
  if (holidaysInRange.length > 0) {
    const randomIndex = Math.floor(Math.random() * holidaysInRange.length);
    return holidaysInRange[randomIndex];
  } else {
    //return the closest holiday if no holidays in range
    const closestHoliday = holidays.reduce((a, b) => {
      const aDate = new Date(a.date + ", " + currentDate.getFullYear());
      const bDate = new Date(b.date + ", " + currentDate.getFullYear());
      const aDiff = Math.abs(currentDate.getTime() - aDate.getTime());
      const bDiff = Math.abs(currentDate.getTime() - bDate.getTime());
      return aDiff < bDiff ? a : b;
    });
    return closestHoliday;
  }
}

export default getRandomHolidayWithinRange;
