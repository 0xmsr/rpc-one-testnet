import crypto from "crypto";
import { Transaction } from "./transaction";

export class Block {
  public index: number; // [BARU] Properti Index
  public timestamp: number;
  public transactions: Transaction[];
  public previousHash: string;
  public hash: string;
  public nonce: number;

  // [UPDATE] Constructor menerima index di parameter pertama
  constructor(index: number, time: number, txs: Transaction[], prev: string) {
    this.index = index;
    this.timestamp = time;
    this.transactions = txs;
    this.previousHash = prev;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash(): string {
    return crypto
      .createHash("sha256")
      .update(
        this.index + // [PENTING] Index ikut di-hash agar urutan tidak bisa dimanipulasi
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.transactions.map(tx => tx.toJSON())) +
        this.nonce
      )
      .digest("hex");
  }

  mineBlock(difficulty: number) {
    const target = "0".repeat(difficulty);
    
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    
    console.log(`⛏ Block #${this.index} Berhasil Di-mine: ${this.hash}`);
  }

  // [UPDATE] Tambahkan index ke JSON
  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      previousHash: this.previousHash,
      hash: this.hash,
      nonce: this.nonce,
      transactions: this.transactions.map(tx => tx.toJSON())
    };
  }

  // [UPDATE] Baca index dari JSON saat load dari database
  static fromJSON(data: any): Block {
    const block = new Block(
      data.index, 
      data.timestamp, 
      [], 
      data.previousHash
    );
    block.nonce = data.nonce;
    block.hash = data.hash;
    block.transactions = data.transactions.map((tx: any) => 
       new Transaction(tx.fromAddress, tx.toAddress, tx.amount, tx.fee)
    );
    
    // Restore signature agar validasi tetap berjalan
    block.transactions.forEach((tx, i) => {
        tx.senderPublicKey = data.transactions[i].senderPublicKey;
        tx.signature = data.transactions[i].signature;
    });

    return block;
  }
}