import { useMemo } from "react";

const DEFAULT_LAYOUT = (count = 16) => {
  const columns = count <= 24 ? 4 : count <= 48 ? 5 : 6;
  const rows = Math.ceil(count / columns);
  const canvasHeight = Math.max(600, 150 + rows * 62);
  const left = 0.16;
  const right = 0.84;
  const positions = Array.from({ length: columns }, (_, i) =>
    columns === 1 ? 0.5 : left + (i * (right - left)) / (columns - 1),
  );
  return {
    seatCount: count,
    canvas: { width: 760, height: canvasHeight },
    seats: Array.from({ length: count }, (_, index) => ({
      id: `seat-${index + 1}`,
      seatNumber: String(index + 1),
      label: String(index + 1),
      x: positions[index % columns],
      y: rows === 1 ? 0.5 : 0.20 + Math.floor(index / columns) * (0.60 / (rows - 1)),
    })),
  };
};

const UnifiedSeatMap = ({
  layout,
  seats = [],
  selectedSeats = [],
  onSeatSelect,
  readOnly = false,
}) => {
  const normalized = useMemo(() => {
    if (layout?.seats?.length) return layout;
    return DEFAULT_LAYOUT(Number(layout?.seatCount || seats.length || 16));
  }, [layout, seats.length]);

  const byNumber = useMemo(
    () => new Map(seats.map((seat) => [String(seat.seatNumber), seat])),
    [seats],
  );

  // Keep saved/custom layouts inside the visible canvas. This only changes
  // presentation coordinates; the persisted seat positions and booking logic
  // remain untouched.
  const safeSeats = useMemo(() => {
    const items = normalized.seats || [];
    return items.map((position) => ({
      ...position,
      x: Math.max(0.09, Math.min(0.91, Number(position.x))),
      y: Math.max(0.20, Math.min(0.88, Number(position.y))),
    }));
  }, [normalized]);

  return (
    <div className="unified-seat-map-shell">
      <div
        className="unified-seat-map-canvas"
        style={{ aspectRatio: `760 / ${normalized.canvas?.height || 600}` }}
        data-seat-count={normalized.seatCount || normalized.seats.length}
      >
        <div className="unified-front">
          <span>FRONT</span>
          <strong>◉ DRIVER</strong>
        </div>
        <div className="unified-windshield" />

        {safeSeats.map((position) => {
          const number = String(position.seatNumber || position.label);
          const live = byNumber.get(number);
          const rawStatus = String(live?.status || "AVAILABLE").toUpperCase();
          const status = selectedSeats.includes(number)
            ? "selected"
            : rawStatus.toLowerCase();
          const unavailable = status === "booked" || status === "locked";

          return (
            <button
              key={position.id || number}
              type="button"
              className={`unified-seat unified-seat-${status}`}
              style={{ left: `${Number(position.x) * 100}%`, top: `${Number(position.y) * 100}%` }}
              disabled={readOnly || unavailable}
              onClick={() => onSeatSelect?.(live || { seatNumber: number, status: rawStatus })}
              title={`Seat ${number}`}
            >
              <span className="unified-seat-back" />
              <strong>{number}</strong>
              {status === "selected" && <span className="unified-seat-check">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="unified-seat-legend">
        <span><i className="legend-available" /> Available</span>
        <span><i className="legend-selected" /> Selected</span>
        <span><i className="legend-booked" /> Booked</span>
        <span><i className="legend-locked" /> Locked</span>
      </div>
    </div>
  );
};

export default UnifiedSeatMap;
