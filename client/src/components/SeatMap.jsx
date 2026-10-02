import UnifiedSeatMap from "./UnifiedSeatMap";

const SeatMap = ({
  seats = [],
  layout,
  selectedSeats = [],
  selectedSeat = "",
  onSeatSelect,
  readOnly = false,
}) => (
  <UnifiedSeatMap
    layout={layout}
    seats={seats}
    selectedSeats={selectedSeats.length ? selectedSeats : selectedSeat ? [selectedSeat] : []}
    onSeatSelect={onSeatSelect}
    readOnly={readOnly}
  />
);

export default SeatMap;
