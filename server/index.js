const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/connectDB");
const router = require("./routers/index");
const cookieParser = require("cookie-parser");
const http = require("http");
const setupSocket = require("./socket/index");
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./swagger.yaml');

const app = express();
const server = http.createServer(app);

// Setup socket.io
setupSocket(server);

// Configure middleware
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, "http://localhost:8081", "http://192.168.1.204:8081"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Swagger documentation route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the server!" });
});

// api endpoints
app.use("/api", router);

connectDB().then(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
  });
});
