import mongoose from "mongoose";

const connectDb = async () => {
  try {
    const db=await mongoose.connect(process.env.MONGO_URL);
    console.log("DB connected");
    console.log("DataBase Name:",db.connection.name);
  } catch (error) {
    console.error("DB Error", error.message);
    process.exit(1);
  }
};

export default connectDb;
