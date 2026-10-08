import { useMemo } from "react";

const DEFAULT_LAYOUT = (count = 16) => {
  const columns = count <= 16 ? 4 : count <= 30 ? 5 : count <= 48 ? 6 : 7;
  const rows = Math.ceil(count / columns);
  const canvasHeight = Math.max(600, 180 + rows * 76);
  const left = 0.14;
  const right = 0.86;
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
      y:
        rows === 1
          ? 0.5
          : 0.20 + Math.floor(index / columns) * (0.62 / Math.max(1, rows - 1)),
    })),
  };
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

  // Treat saved positions as the source of truth, but calculate a responsive
  // presentation size so dense layouts never overlap at smaller widths.
  const safeSeats = useMemo(() => {
    const items = normalized.seats || [];
    const count = items.length;
    const columns =
      Number(normalized.columns) ||
      (count <= 16 ? 4 : count <= 30 ? 5 : count <= 48 ? 6 : 7);

    const rows = Math.max(1, Math.ceil(count / columns));

    return items.map((position, index) => {
      const x = Number(position.x);
      const y = Number(position.y);
      const hasValidPosition =
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= 0 &&
        x <= 1 &&
        y >= 0 &&
        y <= 1;

      if (hasValidPosition) {
        return {
          ...position,
          x: clamp(x, 0.07, 0.93),
          y: clamp(y, 0.18, 0.91),
        };
      }

      const column = index % columns;
      const row = Math.floor(index / columns);
      return {
        ...position,
        x:
          columns === 1
            ? 0.5
            : 0.14 + (column * 0.72) / Math.max(1, columns - 1),
        y:
          rows === 1
            ? 0.5
            : 0.20 + (row * 0.62) / Math.max(1, rows - 1),
      };
    });
  }, [normalized]);

  const seatCount = safeSeats.length || Number(normalized.seatCount) || 1;
  const columns =
    Number(normalized.columns) ||
    (seatCount <= 16 ? 4 : seatCount <= 30 ? 5 : seatCount <= 48 ? 6 : 7);
  const rows = Math.max(1, Math.ceil(seatCount / columns));
  const canvasHeight = Math.max(
    Number(normalized.canvas?.height) || 600,
    180 + rows * 76,
  );

  return (
    <div className="unified-seat-map-shell">
      <div
        className="unified-seat-map-canvas"
        style={{
          aspectRatio: `760 / ${canvasHeight}`,
          "--seat-columns": columns,
          "--seat-rows": rows,
        }}
        data-seat-count={seatCount}
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
              style={{
                left: `${Number(position.x) * 100}%`,
                top: `${Number(position.y) * 100}%`,
              }}
              disabled={readOnly || unavailable}
              onClick={() =>
                onSeatSelect?.(
                  live || { seatNumber: number, status: rawStatus },
                )
              }
              title={`Seat ${number}`}
            >
              <span className="unified-seat-back" />
              <strong>{number}</strong>
              {status === "selected" && (
                <span className="unified-seat-check">✓</span>
              )}
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
