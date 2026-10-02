const { getIO } = require("./index");

const emitSeatUpdate = ({
  tripId,
  seatNumber,
  status,
  boardingSequence,
  droppingSequence,
}) => {
  const io = getIO();

  io.to(`trip:${tripId}`).emit("seat:update", {
    tripId,
    seatNumber,
    status,
    boardingSequence,
    droppingSequence,
  });
};

module.exports = {
  emitSeatUpdate,
};
