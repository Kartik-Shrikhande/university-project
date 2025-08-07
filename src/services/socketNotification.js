const { Server } = require("socket.io");

let io;

const allowedOrigins = [
  "http://localhost:5173",
  "https://connect2-uni.vercel.app",
    "https://www.connect2uni.com"

];

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        console.log("Socket Origin attempting to connect:", origin);

        // Allow requests with no origin (like postman/curl/mobile apps)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Socket connection not allowed by CORS"));
        }
      },
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`User joined room: ${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

const sendNotification = (userId, message, type) => {
  if (io) {
    io.to(userId).emit("notification", { message, type });
  }
};

module.exports = { initializeSocket, sendNotification };

