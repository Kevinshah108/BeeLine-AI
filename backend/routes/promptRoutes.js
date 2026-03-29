import express from "express";
import Prompt from "../models/Prompt.js";

const router = express.Router();

/* SAVE */
router.post("/save", async (req, res) => {
  const { prompt, response } = req.body;

  const newData = new Prompt({ prompt, response });
  await newData.save();

  res.json({ success: true });
});

/* HISTORY */
router.get("/history", async (req, res) => {
  const data = await Prompt.find().sort({ createdAt: -1 });
  res.json(data);
});

/* DELETE */
router.delete("/delete/:id", async (req, res) => {
  await Prompt.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;