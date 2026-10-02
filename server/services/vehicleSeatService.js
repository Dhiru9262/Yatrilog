const DEFAULT_CANVAS = { width: 760, height: 600 };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const buildDefaultSeatLayout = (totalSeats = 16) => {
  const count = Math.max(1, Number(totalSeats) || 1);
  const seats = [];
  const columns = 4;
  const rows = Math.ceil(count / columns);
  const left = 0.22;
  const right = 0.78;
  const top = 0.18;
  const bottom = 0.90;
  const rowGap = rows > 1 ? (bottom - top) / (rows - 1) : 0;
  const colPositions = [left, 0.39, 0.61, right];

  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    seats.push({
      id: `seat-${i + 1}`,
      seatNumber: String(i + 1),
      label: String(i + 1),
      x: Number(colPositions[col].toFixed(4)),
      y: Number((top + row * rowGap).toFixed(4)),
    });
  }

  return {
    version: 1,
    canvas: DEFAULT_CANVAS,
    seatCount: count,
    seats,
  };
};

const normalizeSeatLayout = (layout, totalSeats) => {
  if (!layout || typeof layout !== "object" || !Array.isArray(layout.seats)) {
    return buildDefaultSeatLayout(totalSeats);
  }

  const count = Math.max(1, Number(layout.seatCount || totalSeats) || 1);
  const seats = layout.seats.slice(0, count).map((seat, index) => ({
    id: String(seat.id || `seat-${index + 1}`),
    seatNumber: String(seat.seatNumber || seat.label || index + 1),
    label: String(seat.label || seat.seatNumber || index + 1),
    x: clamp(Number(seat.x), 0.04, 0.96),
    y: clamp(Number(seat.y), 0.12, 0.94),
  }));

  // Fill missing seats when totalSeats was increased.
  const defaults = buildDefaultSeatLayout(count).seats;
  for (let i = seats.length; i < count; i += 1) seats.push(defaults[i]);

  return {
    version: 1,
    canvas: DEFAULT_CANVAS,
    seatCount: count,
    seats,
  };
};

const validateSeatLayout = (layout, totalSeats) => {
  if (!layout || typeof layout !== "object" || !Array.isArray(layout.seats)) {
    return { valid: false, message: "A seat layout with seats is required" };
  }

  const seatCount = Number(layout.seatCount);
  if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 80) {
    return { valid: false, message: "Seat count must be between 1 and 80" };
  }

  if (Number(totalSeats) !== seatCount) {
    return { valid: false, message: "Seat layout count must match the vehicle total seats" };
  }

  if (layout.seats.length !== seatCount) {
    return { valid: false, message: "Every seat must have a saved position" };
  }

  const ids = new Set();
  const numbers = new Set();
  for (const seat of layout.seats) {
    if (!seat?.id || ids.has(String(seat.id))) return { valid: false, message: "Duplicate seat id found" };
    ids.add(String(seat.id));
    const number = String(seat.seatNumber || seat.label || "");
    if (!number || numbers.has(number)) return { valid: false, message: "Duplicate seat number found" };
    numbers.add(number);
    const x = Number(seat.x);
    const y = Number(seat.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      return { valid: false, message: "Seat positions must be between 0 and 1" };
    }
  }

  return { valid: true };
};

const generateSeatNumbers = (totalSeats) => {
  const seats = [];
  for (let i = 1; i <= totalSeats; i++) seats.push(String(i));
  return seats;
};

module.exports = {
  DEFAULT_CANVAS,
  generateSeatNumbers,
  buildDefaultSeatLayout,
  normalizeSeatLayout,
  validateSeatLayout,
};
