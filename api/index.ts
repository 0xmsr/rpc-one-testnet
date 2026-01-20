import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

let blockchainData: any[] = [];

app.get("/", (req, res) => {
  res.json({ 
    status: "ONE-Chain RPC Online", 
    blocks: blockchainData.length 
  });
});

app.get("/blocks", (req, res) => {
  res.json(blockchainData);
});

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  let balance = 0;
  blockchainData.forEach(block => {
    if (block.transactions) {
      block.transactions.forEach((tx: any) => {
        if (tx.fromAddress === address) balance -= (Number(tx.amount) + Number(tx.fee || 0));
        if (tx.toAddress === address) balance += Number(tx.amount);
      });
    }
  });
  res.json({ balance: parseFloat(balance.toFixed(4)) });
});

app.post("/consensus", (req, res) => {
  const { chain } = req.body;
  if (Array.isArray(chain)) {
    blockchainData = chain;
    return res.json({ success: true, message: "Chain Synced" });
  }
  res.status(400).json({ error: "Invalid chain format" });
});

app.post("/send", (req, res) => {
  res.status(200).json({ 
    success: false, 
    message: "RPC Vercel bersifat Read-Only. Gunakan RPC Lokal untuk transaksi." 
  });
});

export default app;
