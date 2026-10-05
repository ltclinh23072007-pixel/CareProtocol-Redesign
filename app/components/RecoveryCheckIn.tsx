"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { Check, CircleAlert, ExternalLink, RotateCcw, ShieldCheck, WalletCards } from "lucide-react";
import {
  requestDevnetAirdrop,
  sendRecoveryCheckIn,
  type RecoveryProofPayload,
} from "@/lib/solana";
import type { RepResult } from "./PoseRehabTracker";

export interface RecoverySessionRecord extends RecoveryProofPayload {
  proofHash: string;
  signature: string;
  explorerUrl: string;
}

interface Props {
  exerciseId: string;
  result: RepResult;
  onReset: () => void;
  onConfirmed?: (record: RecoverySessionRecord) => void;
}

type Status = "idle" | "airdropping" | "signing" | "confirmed" | "error";

export default function RecoveryCheckIn({
  exerciseId,
  result,
  onReset,
  onConfirmed,
}: Props) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [status, setStatus] = useState<Status>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [proofHash, setProofHash] = useState<string | null>(null);
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleAirdrop() {
    if (!publicKey) return;
    setStatus("airdropping");
    setErrorMsg(null);
    try {
      await requestDevnetAirdrop(connection, publicKey, LAMPORTS_PER_SOL);
      const lamports = await connection.getBalance(publicKey, "confirmed");
      setBalanceSol(lamports / LAMPORTS_PER_SOL);
      setStatus("idle");
    } catch (error) {
      console.error(error);
      setErrorMsg("Không nhận được SOL Devnet. Mạng có thể đang giới hạn yêu cầu; thử lại sau hoặc dùng Solana Faucet chính thức.");
      setStatus("error");
    }
  }

  async function handleSignAndSend() {
    if (!publicKey) return;
    setStatus("signing");
    setErrorMsg(null);
    try {
      const payload: RecoveryProofPayload = {
        patientPublicKey: publicKey.toBase58(),
        exerciseId,
        repsCompleted: result.reps,
        repsTarget: result.targetReps,
        formQualityScore: result.formQualityScore,
        timestampIso: new Date().toISOString(),
      };

      const signAndSend = (transaction: Transaction) =>
        sendTransaction(transaction, connection);

      const confirmed = await sendRecoveryCheckIn(
        connection,
        publicKey,
        payload,
        signAndSend
      );

      setSignature(confirmed.signature);
      setExplorerUrl(confirmed.explorerUrl);
      setProofHash(confirmed.proofHash);
      setStatus("confirmed");
      onConfirmed?.({ ...payload, ...confirmed });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Giao dịch thất bại. Vui lòng thử lại.";
      setErrorMsg(message);
      setStatus("error");
    }
  }

  if (!connected || !publicKey) {
    return (
      <div className="recovery-checkin">
        <div className="recovery-connect-note">
          <WalletCards size={17} aria-hidden="true" />
          <span>Kết nối Phantom ở phía trên nếu bạn muốn ký và ghi nhận bằng chứng phục hồi trên Solana Devnet. Bạn vẫn có thể xem kết quả bài tập mà không kết nối ví.</span>
        </div>
        <button className="care-button care-button-secondary" type="button" onClick={onReset}>
          <RotateCcw size={15} /> Tập lại
        </button>
      </div>
    );
  }

  return (
    <div className="recovery-checkin">
      <div className="recovery-complete-title">
        <span className="care-status-check"><Check size={15} /></span>
        <div>
          <p className="recovery-summary-title">Kết quả bài tập đã sẵn sàng</p>
          <p className="recovery-summary-copy">{result.reps}/{result.targetReps} lần · điểm kỹ thuật ước tính {result.formQualityScore}/100</p>
        </div>
      </div>

      {balanceSol !== null && <p className="recovery-balance">Số dư Devnet sau khi nhận: {balanceSol.toFixed(3)} SOL</p>}

      {status !== "confirmed" && (
        <>
          <div className="recovery-actions">
            <button className="care-button care-button-secondary" type="button" onClick={handleAirdrop} disabled={status === "airdropping" || status === "signing"}>
              {status === "airdropping" ? "Đang yêu cầu SOL…" : "Xin SOL Devnet miễn phí"}
            </button>
            <button className="care-button care-button-primary" type="button" onClick={handleSignAndSend} disabled={status === "signing" || status === "airdropping"}>
              <ShieldCheck size={15} /> {status === "signing" ? "Đang chờ xác nhận trên Phantom…" : "Ký và ghi nhận trên Devnet"}
            </button>
          </div>
          <p className="recovery-summary-copy">Phantom sẽ yêu cầu bạn xác nhận. Giao dịch chứa hash và số liệu tóm tắt, không có ảnh hoặc video.</p>
        </>
      )}

      {errorMsg && <p className="recovery-error" role="alert"><CircleAlert size={14} /> {errorMsg}</p>}

      {status === "confirmed" && signature && explorerUrl && (
        <div className="recovery-success" role="status" aria-live="polite">
          <strong><Check size={14} /> Giao dịch đã được xác nhận trên Solana Devnet</strong>
          {proofHash && <p>SHA-256: <span className="recovery-signature">{proofHash}</span></p>}
          <p>Chữ ký giao dịch: <span className="recovery-signature">{signature}</span></p>
          <a className="care-text-button" href={explorerUrl} target="_blank" rel="noreferrer">
            Mở giao dịch trên Explorer <ExternalLink size={14} />
          </a>
        </div>
      )}

      <div className="recovery-footer-actions">
        <button className="care-text-button" type="button" onClick={onReset}><RotateCcw size={14} /> Bắt đầu phiên mới</button>
        {status === "confirmed" && <span className="recovery-confirmed-label"><Check size={13} /> Đã xác minh</span>}
      </div>
    </div>
  );
}
