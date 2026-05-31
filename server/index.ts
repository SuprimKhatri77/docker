import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ["*"],
  }),
);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is up and running fine",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`server is running on port: ${PORT}`);
});
