function getRandomHolidayWithinRange() {
    const holidays = [
        { name: "New Year's Eve", date: "December 31" },
        { name: "Valentine's Day", date: "February 14" },
        { name: "St. Patrick's Day", date: "March 17" },
        { name: "Easter", date: "April 4" },
        { name: "Mother's Day", date: "May 14" },
        { name: "Father's Day", date: "June 20" },
        { name: "Independence Day", date: "July 4" },
        { name: "Halloween", date: "October 31" },
        { name: "Thanksgiving", date: "November 25" },
        { name: "Christmas", date: "December 25" },
        { name: "Eid", date: "May 16" },
        { name: "Hanukkah", date: "December 12" },
        { name: "Kwanzaa", date: "December 26" },
        { name: "Diwali", date: "November 7" },
        { name: "Lunar New Year", date: "February 8" },
        { name: "Cinco de Mayo", date: "May 5" },
        { name: "Earth Day", date: "April 22" },
        { name: "Good Friday", date: "April 8" },
        { name: "Labor Day", date: "September 6" },
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
        {name: "Jess and Jorrin's Wedding Day", date:"June 23"},
        {name: "Pari and Ben's Wedding Day", date:"Sept 4"},
        {name: "Anne's Birthday", date:"December 3"},
        
    ];

    const currentDate = new Date();
    const startDate = new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000); // Subtract 10 days
    const endDate = new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000); // Add 10 days

    const holidaysInRange = holidays.filter((holiday) => {
        const holidayDate = holiday.date + ", " + new Date().getFullYear(); // Append the current year to the date string
        const holidayDateObj = new Date(holidayDate);
        return holidayDateObj >= startDate && holidayDateObj <= endDate;
    });

    // Return a random holiday from the filtered list
    if (holidaysInRange.length > 0) {
        const randomIndex = Math.floor(Math.random() * holidaysInRange.length);
        return holidaysInRange[randomIndex];
    } else {
        //return the closest holiday if no holidays in range
        const closestHoliday = holidays.reduce((a, b) => {
            const aDate = new Date(a.date);
            const bDate = new Date(b.date);
            const aDiff = Math.abs(currentDate.getTime() - aDate.getTime());
            const bDiff = Math.abs(currentDate.getTime() - bDate.getTime());
            return aDiff < bDiff ? a : b;
        });
        return closestHoliday;
    }

}

console.log(getRandomHolidayWithinRange())