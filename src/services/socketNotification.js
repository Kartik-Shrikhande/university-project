const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "http://localhost:5173" },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`User joined room: ${userId}`);   //on login and registration
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

const sendNotification = (userId, message, type) => {
  if (io) {
    io.to(userId).emit("notification", { message, type });  // to receive notitfifacations
  }
};

module.exports = { initializeSocket, sendNotification };
