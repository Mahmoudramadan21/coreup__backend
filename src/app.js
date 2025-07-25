// app.js
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const connectDB = require("./config/db");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const { setupSocket } = require("./utils/socket");
const logger = require("./utils/logger");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(
  morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(xss());
app.use(
  rateLimit({
    windowMs: 45 * 60 * 1000,
    max: 500,
    message: "Too many requests from this IP, please try again later.",
  })
);

// Static files
app.use("/uploads", express.static("public/uploads"));

// Middleware to attach io to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api/v1", routes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Socket.IO
setupSocket(io);
app.set("io", io);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
