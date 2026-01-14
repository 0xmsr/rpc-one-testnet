import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let blockchainData: any[] = [];

app.get("/", (req, res) => {
  res.json({ status: "RPC Online", data_synced: blockchainData.length > 0 });
});

app.get("/blocks", (req, res) => {
  res.json(blockchainData);
});

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  let balance = 0;
  blockchainData.forEach(block => {
    block.transactions.forEach((tx: any) => {
      if (tx.fromAddress === address) balance -= tx.amount;
      if (tx.toAddress === address) balance += tx.amount;
    });
  });
  res.json({ balance });
});

app.post("/consensus", (req, res) => {
  const { chain } = req.body;
  if (Array.isArray(chain)) {
    blockchainData = chain;
    return res.json({ success: true, message: "Explorer Updated" });
  }
  res.status(400).json({ error: "Invalid chain format" });
});

export default app;
