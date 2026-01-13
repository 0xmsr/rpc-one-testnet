import express, { Request, Response } from "express";
import cors from "cors";

interface Transaction {
  fromAddress: string | null;
  toAddress: string;
  amount: number;
}

interface Block {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  nonce: number;
  transactions: Transaction[];
}

const app = express();
app.use(cors());
app.use(express.json());

let blockchainData: Block[] = []; 

app.get("/blocks", (req: Request, res: Response) => {
  res.json(blockchainData);
});

app.get("/balance/:address", (req: Request, res: Response) => {
  const { address } = req.params;
  let balance = 0;

  blockchainData.forEach(block => {
    block.transactions.forEach(tx => {
      if (tx.fromAddress === address) balance -= tx.amount;
      if (tx.toAddress === address) balance += tx.amount;
    });
  });

  res.json({ balance });
});

app.get("/address/:address", (req: Request, res: Response) => {
  const { address } = req.params;
  const txHistory: Transaction[] = [];
  let balance = 0;

  blockchainData.forEach(block => {
    block.transactions.forEach(tx => {
      if (tx.fromAddress === address || tx.toAddress === address) {
        txHistory.push(tx);
        if (tx.fromAddress === address) balance -= tx.amount;
        if (tx.toAddress === address) balance += tx.amount;
      }
    });
  });

  res.json({
    balance,
    transactions: txHistory.reverse()
  });
});

app.post("/send", (req: Request, res: Response) => {
  const { from, to, amount } = req.body;
  if (!to || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid data" });
  }

  console.log(`Transaction from ${from} to ${to} for ${amount}`);
  
  res.json({ 
    success: true, 
    message: "Transaction received by RPC" 
  });
});

app.post("/consensus", (req: Request, res: Response) => {
  const { chain } = req.body;
  if (Array.isArray(chain)) {
    blockchainData = chain;
    return res.json({ message: "Chain synchronized" });
  }
  res.status(400).json({ error: "Invalid chain format" });
});

export default app;
