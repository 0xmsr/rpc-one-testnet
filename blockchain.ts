import { Block } from "./block";
import { Transaction } from "./transaction";
import { db } from "./firebase";

export class Blockchain {
  chain: Block[];
  pendingTransactions: Transaction[];
  readonly difficulty = 3; 
  miningReward = 5;

  constructor() {
    this.chain = [this.createGenesis()];
    this.pendingTransactions = [];
  }

  createGenesis() {
    return new Block(0, Date.now(), [], "0");
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  isValidChain(chain: Block[]): boolean {
    if (chain[0].previousHash !== "0") return false;

    for (let i = 1; i < chain.length; i++) {
      const currentBlock = chain[i];
      const previousBlock = chain[i - 1];
      if (currentBlock.hash !== currentBlock.calculateHash()) return false;
      if (currentBlock.previousHash !== previousBlock.hash) return false;
    }
    return true;
  }

  replaceChain(newChain: Block[]) {
    if (newChain.length <= this.chain.length) return;
    if (!this.isValidChain(newChain)) return;

    console.log("🔄 Sinkronisasi: Mengikuti jalur rantai terpanjang.");
    this.chain = newChain;
  }

  async minePendingTransactions(miner: string) {
    let totalFees = 0;
    for (const tx of this.pendingTransactions) {
        totalFees += tx.fee;
    }

    const baseReward = 5; 
    const halvingCount = Math.floor(this.chain.length / 210000);
    const currentSubsidy = baseReward / Math.pow(2, halvingCount);
    const finalReward = currentSubsidy + totalFees;

    const SYSTEM_ADDRESS = "one00000000000000000000000000000";
    const rewardTx = new Transaction(SYSTEM_ADDRESS, miner, finalReward, 0);
    const txsToMine = [...this.pendingTransactions, rewardTx];

    const block = new Block(
      this.getLatestBlock().index + 1,
      Date.now(),
      txsToMine,
      this.getLatestBlock().hash
    );

    console.log(`\n⛏️  Menambang blok #${block.index}...`);
    block.mineBlock(this.difficulty);
    
    this.chain.push(block);
    this.pendingTransactions = [];
    
    // Hapus antrean di Firebase agar tidak di-mine ulang oleh orang lain
    await db.collection("blockchain").doc("pending").set({ transactions: [] });
    await this.saveToFirebase(); 
  }

  async addTransaction(transaction: Transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) throw new Error("Invalid address");
    if (!transaction.isValid()) throw new Error("Invalid signature");

    const currentBalance = this.getBalance(transaction.fromAddress);
    
    let pendingAmount = 0;
    for (const tx of this.pendingTransactions) {
      if (tx.fromAddress === transaction.fromAddress) {
        pendingAmount += (tx.amount + tx.fee);
      }
    }

    const availableBalance = currentBalance - pendingAmount;
    const totalCost = transaction.amount + transaction.fee;

    if (availableBalance < totalCost) {
      throw new Error(`Saldo tidak cukup! (Sudah ada antrean transaksi sebesar ${pendingAmount} ONE)`);
    }

    this.pendingTransactions.push(transaction);

    await db.collection("blockchain").doc("pending").set({
      transactions: this.pendingTransactions.map(tx => tx.toJSON())
    });
  
    console.log("☁ Transaksi diunggah ke antrean jaringan.");
  }

  getBalance(address: string) {
    let balance = 0;
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address) balance -= (tx.amount + tx.fee);
        if (tx.toAddress === address) balance += tx.amount;
      }
    }
    return balance;
  }

  async saveToFirebase() {
    const snap = await db.collection("blockchain").doc("main").get();
    if (snap.exists) {
        const remoteData = snap.data()!;
        const remoteChain = remoteData.chain.map((b: any) => Block.fromJSON(b));
        if (remoteChain.length >= this.chain.length) {
            this.replaceChain(remoteChain);
            return;
        }
    }

    await db.collection("blockchain").doc("main").set({
      miningReward: this.miningReward,
      chain: this.chain.map(b => b.toJSON())
    });
    console.log(`☁ Blockchain saved (Height: ${this.chain.length})`);
  }

  async loadFromFirebase() {
    const snap = await db.collection("blockchain").doc("main").get();
    if (snap.exists) {
        const data = snap.data()!;
        const remoteChain = data.chain.map((b: any) => Block.fromJSON(b));
        this.replaceChain(remoteChain);
    }

    const pendingSnap = await db.collection("blockchain").doc("pending").get();
    if (pendingSnap.exists) {
        const pendingData = pendingSnap.data()!;
        this.pendingTransactions = pendingData.transactions.map((tx: any) => {
            const t = new Transaction(tx.fromAddress, tx.toAddress, tx.amount, tx.fee);
            t.senderPublicKey = tx.senderPublicKey;
            t.signature = tx.signature;
            return t;
        });
    }
    console.log("☁ Blockchain synced (Protocol Difficulty: " + this.difficulty + ")");
  }
}