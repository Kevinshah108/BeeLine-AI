import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import Prompt from "./models/Prompt.js";
import promptRoutes from "./routes/promptRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   CONNECT MONGODB
========================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("MongoDB Error:", err));


/* =========================
   TEST ROUTE
========================= */
app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

/* =========================
   ASK AI (WORKING MODEL)
========================= */
app.post("/api/ask-ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt required" });
    }

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.5-flash-lite-preview-09-2025",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result =
      response.data?.choices?.[0]?.message?.content || "No response from AI";

    res.json({ result });
  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "AI failed" });
  }
});

/* =========================
   SAVE DATA
========================= */
app.post("/api/save", async (req, res) => {
  try {
    const { prompt, response } = req.body;

    if (!prompt || !response) {
      return res.status(400).json({
        error: "Prompt & response required",
      });
    }

    const newData = new Prompt({ prompt, response });
    await newData.save();

    res.json({ message: "Saved successfully ✅" });
  } catch (err) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ error: "Save failed" });
  }
});

/* History Route
 */

app.use("/api", promptRoutes);

/* =========================
   SERVER
========================= */
const PORT = 8000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
