import CryptoJS from "crypto-js";
import Wallet from "./wallet";
import { ec as EC } from "elliptic";

const ec = new EC("secp256k1");

export class Transaction {
  fromAddress: string | null;
  toAddress: string;
  amount: number;
  fee: number;
  senderPublicKey?: string;
  signature?: string;

  constructor(from: string | null, to: string, amount: number, fee: number = 0) {
    this.fromAddress = from;
    this.toAddress = to;
    this.amount = amount;
    this.fee = fee;
  }

  calculateHash() {
    return CryptoJS.SHA256(
      this.fromAddress + this.toAddress + this.amount + this.fee + (this.senderPublicKey || "")
    ).toString();
  }

  signTransaction(wallet: Wallet) {
    if (wallet.getAddress() !== this.fromAddress) {
      throw new Error("You cannot sign transactions for other wallets");
    }
    this.senderPublicKey = wallet.publicKey; 
    const hash = this.calculateHash();
    const sig = wallet.getKeyPair().sign(hash, "hex");
    this.signature = sig.toDER("hex");
  }

  isValid(): boolean {
    // Alamat sistem (Reward) tidak butuh signature
    if (this.fromAddress === "one00000000000000000000000000000") return true;
    
    // Jika null (untuk kompatibilitas lama), tetap izinkan
    if (this.fromAddress === null) return true;

    if (!this.signature || !this.senderPublicKey) return false;
    
    try {
      const key = ec.keyFromPublic(this.senderPublicKey, "hex");
      return key.verify(this.calculateHash(), this.signature);
    } catch (err) {
      return false;
    }
  }

  toJSON() {
    return {
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      amount: this.amount,
      fee: this.fee,
      senderPublicKey: this.senderPublicKey || null, 
      signature: this.signature || null,
    };
  }

  // WAJIB ADA: Untuk memperbaiki error di block.ts
  static fromJSON(data: any): Transaction {
    const tx = new Transaction(data.fromAddress, data.toAddress, data.amount, data.fee || 0);
    tx.senderPublicKey = data.senderPublicKey;
    tx.signature = data.signature;
    return tx;
  }
}