const timeToMinutes = (time) => {
  if (!time || typeof time !== "string") {
    return null;
  }

  const normalized = time.trim().toUpperCase();

  // 12-hour format: 10:00 AM
  const match12 = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);

  if (match12) {
    let hours = Number(match12[1]);
    const minutes = Number(match12[2]);
    const period = match12[3];

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      return null;
    }

    if (period === "AM" && hours === 12) {
      hours = 0;
    }

    if (period === "PM" && hours !== 12) {
      hours += 12;
    }

    return hours * 60 + minutes;
  }

  // 24-hour format: 10:00
  const match24 = normalized.match(/^(\d{1,2}):(\d{2})$/);

  if (match24) {
    const hours = Number(match24[1]);
    const minutes = Number(match24[2]);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return hours * 60 + minutes;
  }

  return null;
};

const timesOverlap = (
  existingDeparture,
  existingArrival,
  requestedDeparture,
  requestedArrival,
) => {
  const existingStart = timeToMinutes(existingDeparture);
  const existingEnd = timeToMinutes(existingArrival);

  const requestedStart = timeToMinutes(requestedDeparture);
  const requestedEnd = timeToMinutes(requestedArrival);

  if (
    existingStart === null ||
    existingEnd === null ||
    requestedStart === null ||
    requestedEnd === null
  ) {
    return false;
  }

  return existingStart < requestedEnd && requestedStart < existingEnd;
};

module.exports = {
  timeToMinutes,
  timesOverlap,
};
