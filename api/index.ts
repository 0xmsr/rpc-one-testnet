import express from "express";
import cors from "cors";
import { Blockchain } from "../blockchain";
import { Transaction } from "../transaction";
import { Block } from "../block";

const app = express();
app.use(cors());
app.use(express.json());
const chain = new Blockchain();
async function sync() {
    try {
        await chain.loadFromFirebase();
    } catch (error) {
        console.error("Gagal sinkronisasi dengan Firebase:", error);
    }
}

app.get("/", (req, res) => {
    res.json({ status: "RPC Online", network: "OneScan Testnet" });
});

app.get("/blocks", async (req, res) => {
    await sync();
    res.json(
        chain.chain.map((b) => ({
            index: b.index,
            hash: b.hash,
            previousHash: b.previousHash,
            timestamp: b.timestamp,
            tx_count: b.transactions.length,
            nonce: b.nonce,
            transactions: b.transactions,
        }))
    );
});
app.get("/balance/:address", async (req, res) => {
    await sync();
    const balance = chain.getBalance(req.params.address);
    res.json({ balance });
});

app.get("/address/:address", async (req, res) => {
    await sync();
    const address = req.params.address;
    const history: any[] = [];
    let balance = 0;

    chain.chain.forEach(block => {
        block.transactions.forEach(tx => {
            if (tx.fromAddress === address || tx.toAddress === address) {
                history.push(tx);
                if (tx.fromAddress === address) balance -= tx.amount;
                if (tx.toAddress === address) balance += tx.amount;
            }
        });
    });

    res.json({
        balance,
        transactions: history.reverse()
    });
});

app.post("/send", async (req, res) => {
    const { from, to, amount, fee, senderPublicKey, signature } = req.body;
    try {
        const tx = new Transaction(from, to, amount, fee);
        tx.senderPublicKey = senderPublicKey;
        tx.signature = signature;

        if (tx.isValid()) {
            await chain.loadFromFirebase();
            await chain.addTransaction(tx); 
            await chain.saveToFirebase(); 
            res.json({ success: true, message: "Transaction added to Firebase" });
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (err: any) {
        res.status(400).json({ success: false, message: err.message });
    }
});

export default app;
