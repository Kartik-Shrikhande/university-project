const io = require("socket.io-client");

const socket = io("http://localhost:3000");  // or your actual host + port

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
  
  // Join a room to simulate your workflow
  socket.emit("join", "testUserId123");

  // Listen for any notification
  socket.on("notification", (data) => {
    console.log("Notification received:", data);
  });
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
