const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const connection = mongoose.connection;

    connection.on("connectd", () => {
      console.log("MongoDB connection successful");
    });

    connection.on("error", (error) => {
      console.error("MongoDB connection unsuccessful", error);
    });
  } catch (error) {
    console.error("MongoDB connection unsuccessful", error);
    // process.exit(1);
  }
}

module.exports = connectDB;
