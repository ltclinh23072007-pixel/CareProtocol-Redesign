"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  HeartPulse,
  Home,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import WalletBar from "./components/WalletBar";
import PoseRehabTracker, { type RepResult } from "./components/PoseRehabTracker";
import RecoveryCheckIn, {
  type RecoverySessionRecord,
} from "./components/RecoveryCheckIn";

const EXERCISE_ID = "knee-flexion-day-3";
const TARGET_REPS = 10;
const HISTORY_KEY = "careprotocol.verified-recovery-sessions.v1";

type Page = "today" | "exercise" | "history";

const navigation: Array<{
  id: Page;
  label: string;
  icon: typeof Home;
}> = [
  { id: "today", label: "Hôm nay", icon: Home },
  { id: "exercise", label: "Bài tập", icon: Activity },
  { id: "history", label: "Bằng chứng phục hồi", icon: ClipboardCheck },
];

function readSavedSessions(): RecoverySessionRecord[] {
  try {
    const value = window.localStorage.getItem(HISTORY_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as RecoverySessionRecord[]) : [];
  } catch {
    return [];
  }
}

export default function HomePage() {
  const [page, setPage] = useState<Page>("today");
  const [result, setResult] = useState<RepResult | null>(null);
  const [sessions, setSessions] = useState<RecoverySessionRecord[]>([]);

  useEffect(() => {
    setSessions(readSavedSessions());
  }, []);

  const latestSession = sessions[0];
  const sessionCountLabel = `${sessions.length} phiên đã xác minh trên thiết bị này`;

  const startExercise = useCallback(() => {
    setResult(null);
    setPage("exercise");
  }, []);

  const handleSessionComplete = useCallback((completed: RepResult) => {
    setResult(completed);
  }, []);

  const handleConfirmed = useCallback((record: RecoverySessionRecord) => {
    setSessions((current) => {
      const next = [record, ...current].slice(0, 30);
      try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // The on-chain confirmation remains valid if local storage is unavailable.
      }
      return next;
    });
  }, []);

  return (
    <div className="care-app-shell">
      <aside className="care-sidebar" aria-label="Điều hướng chính">
        <a className="care-brand" href="#today" onClick={() => setPage("today")}>
          <span className="care-brand-mark" aria-hidden="true">
            <HeartPulse size={22} strokeWidth={2.2} />
          </span>
          <span>
            <strong>CareProtocol</strong>
            <small>PHỤC HỒI CÙNG BẠN</small>
          </span>
        </a>

        <div className="care-sidebar-label">KHÔNG GIAN BỆNH NHÂN</div>
        <nav className="care-nav" aria-label="Các màn hình">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              className={`care-nav-link${page === id ? " is-active" : ""}`}
              key={id}
              type="button"
              onClick={() => setPage(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              {id === "history" && sessions.length > 0 && (
                <span className="care-nav-count">{sessions.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="care-sidebar-spacer" />
        <div className="care-privacy-note">
          <span className="care-privacy-icon"><LockKeyhole size={16} /></span>
          <div>
            <strong>Riêng tư ngay từ thiết kế</strong>
            <p>Video được xử lý trong trình duyệt; ứng dụng không tải video lên máy chủ.</p>
          </div>
        </div>
        <div className="care-sidebar-footer">BẢN THỬ NGHIỆM · SOLANA DEVNET</div>
      </aside>

      <div className="care-main-column">
        <header className="care-topbar">
          <div className="care-topbar-title">
            <span className="care-eyebrow">CHƯƠNG TRÌNH PHỤC HỒI</span>
            <h1>{page === "today" ? "Không gian của bạn" : page === "exercise" ? "Buổi tập hôm nay" : "Bằng chứng phục hồi"}</h1>
          </div>
          <div className="care-topbar-actions">
            <span className="care-network-pill"><span /> Solana Devnet</span>
            <WalletBar />
          </div>
        </header>

        <main className="care-content">
          {page === "today" && (
            <TodayPage
              latestSession={latestSession}
              sessionCountLabel={sessionCountLabel}
              onStart={startExercise}
              onHistory={() => setPage("history")}
            />
          )}

          {page === "exercise" && (
            <ExercisePage
              result={result}
              onBack={() => setPage("today")}
              onComplete={handleSessionComplete}
              onConfirmed={handleConfirmed}
              onReset={startExercise}
            />
          )}

          {page === "history" && (
            <HistoryPage
              sessions={sessions}
              sessionCountLabel={sessionCountLabel}
              onStart={startExercise}
            />
          )}

          <footer className="care-footer">
            <span>CareProtocol · Hỗ trợ theo dõi phục hồi hậu phẫu</span>
            <span>Không thay thế tư vấn hoặc chỉ định của nhân viên y tế.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function TodayPage({
  latestSession,
  sessionCountLabel,
  onStart,
  onHistory,
}: {
  latestSession?: RecoverySessionRecord;
  sessionCountLabel: string;
  onStart: () => void;
  onHistory: () => void;
}) {
  return (
    <>
      <section className="care-welcome-row">
        <div>
          <p className="care-overline">KẾ HOẠCH PHỤC HỒI CỦA BẠN</p>
          <h2>Chào bạn, mình cùng hoàn thành mục tiêu hôm nay nhé.</h2>
          <p className="care-muted">Một bài tập, một bước tiến nhỏ trong hành trình hồi phục.</p>
        </div>
        <div className="care-date-chip"><CalendarDays size={16} /> Hôm nay</div>
      </section>

      <section className="care-today-grid" aria-label="Tóm tắt hôm nay">
        <article className="care-card care-feature-card">
          <div className="care-card-kicker"><span className="care-kicker-dot" /> BÀI TẬP ĐƯỢC GIAO</div>
          <div className="care-feature-content">
            <div className="care-feature-icon"><Activity size={23} /></div>
            <div>
              <p className="care-muted care-small">Ngày 3 sau phẫu thuật · Bài tập phục hồi</p>
              <h3>Gập và duỗi gối tại giường</h3>
              <p className="care-body-copy">Thực hiện chậm, trong phạm vi thoải mái. Dừng lại nếu đau tăng hoặc thấy không an toàn.</p>
            </div>
          </div>
          <div className="care-feature-meta">
            <span><Activity size={15} /> Mục tiêu: {TARGET_REPS} lần</span>
            <span><Clock3 size={15} /> Khoảng 3–5 phút</span>
          </div>
          <button className="care-button care-button-primary care-button-wide" onClick={onStart} type="button">
            Bắt đầu bài tập <ArrowRight size={17} />
          </button>
          <p className="care-note">Chỉ tập theo kế hoạch đã được nhân viên y tế hướng dẫn.</p>
        </article>

        <aside className="care-side-stack">
          <article className="care-card care-status-card">
            <div className="care-card-heading">
              <span className="care-card-icon care-icon-blue"><ShieldCheck size={18} /></span>
              <div><h3>Trạng thái hôm nay</h3><p className="care-muted care-small">Cập nhật theo phiên đã xác nhận</p></div>
            </div>
            {latestSession ? (
              <div className="care-status-result">
                <span className="care-status-check"><Check size={15} /></span>
                <div><strong>Đã ghi nhận trên Devnet</strong><p>{latestSession.repsCompleted}/{latestSession.repsTarget} lần hoàn thành</p></div>
              </div>
            ) : (
              <div className="care-status-result is-pending">
                <span className="care-status-check"><Clock3 size={15} /></span>
                <div><strong>Chưa có phiên xác minh</strong><p>Hoàn thành bài tập để tạo bản ghi.</p></div>
              </div>
            )}
            <button className="care-text-button" type="button" onClick={onHistory}>
              Xem bằng chứng phục hồi <ChevronRight size={16} />
            </button>
          </article>

          <article className="care-card care-privacy-card">
            <span className="care-card-icon care-icon-green"><LockKeyhole size={18} /></span>
            <h3>Camera chỉ phân tích chuyển động</h3>
            <p>Khung hình được xử lý cục bộ bằng MediaPipe. Bản ghi Devnet chỉ chứa hash và số liệu phiên tập, không chứa ảnh hoặc video.</p>
          </article>

          <article className="care-card care-help-card">
            <div className="care-help-icon"><CircleHelp size={18} /></div>
            <div><strong>Cần hỗ trợ?</strong><p>Trao đổi với bác sĩ hoặc chuyên viên vật lý trị liệu nếu bạn không chắc có nên tập hôm nay.</p></div>
          </article>
        </aside>
      </section>

      <section className="care-how-section">
        <div className="care-section-heading"><div><p className="care-overline">QUY TRÌNH RÕ RÀNG</p><h2>Buổi tập diễn ra như thế nào?</h2></div><span className="care-muted care-small">{sessionCountLabel}</span></div>
        <div className="care-steps-grid">
          <Step number="01" icon={<Activity size={18} />} title="Chuẩn bị" copy="Đọc hướng dẫn và đặt camera để thấy rõ chân." />
          <Step number="02" icon={<Sparkles size={18} />} title="Tập cùng camera" copy="MediaPipe nhận diện chuyển động ngay trên trình duyệt." />
          <Step number="03" icon={<BadgeCheck size={18} />} title="Xác minh phiên" copy="Dùng Phantom ký bản ghi trên Solana Devnet nếu bạn muốn." />
        </div>
      </section>
    </>
  );
}

function Step({ number, icon, title, copy }: { number: string; icon: ReactNode; title: string; copy: string }) {
  return <article className="care-step"><span className="care-step-number">{number}</span><span className="care-step-icon">{icon}</span><div><h3>{title}</h3><p>{copy}</p></div></article>;
}

function ExercisePage({
  result,
  onBack,
  onComplete,
  onConfirmed,
  onReset,
}: {
  result: RepResult | null;
  onBack: () => void;
  onComplete: (result: RepResult) => void;
  onConfirmed: (record: RecoverySessionRecord) => void;
  onReset: () => void;
}) {
  return (
    <>
      <button className="care-back-button" type="button" onClick={onBack}><ArrowLeft size={16} /> Quay lại tổng quan</button>
      <section className="care-exercise-intro">
        <div><p className="care-overline">BƯỚC {result ? "3" : "2"} / 3 · PHỤC HỒI VẬN ĐỘNG</p><h2>Gập và duỗi gối tại giường</h2><p>Thực hiện động tác có kiểm soát. Camera giúp đếm chuyển động và hiển thị góc gối ước tính.</p></div>
        <span className="care-duration"><Clock3 size={15} /> 3–5 phút</span>
      </section>
      <div className="care-stepper" aria-label="Tiến trình buổi tập">
        <span className="is-complete"><Check size={14} /> Chuẩn bị</span><i />
        <span className={!result ? "is-current" : "is-complete"}>{result ? <Check size={14} /> : "2"} Tập luyện</span><i />
        <span className={result ? "is-current" : ""}>{result ? "3" : "3"} Xác minh tùy chọn</span>
      </div>

      {!result ? (
        <div className="care-session-layout">
          <section className="care-card care-session-card">
            <div className="care-session-heading"><div><span className="care-card-kicker">MỤC TIÊU PHIÊN TẬP</span><h3>{TARGET_REPS} lần gập và duỗi</h3></div><span className="care-session-badge"><Activity size={15} /> Theo dõi trực tiếp</span></div>
            <PoseRehabTracker targetReps={TARGET_REPS} onSessionComplete={onComplete} />
          </section>
          <aside className="care-card care-guidance-card">
            <span className="care-card-icon care-icon-amber"><ShieldCheck size={18} /></span>
            <h3>Trước khi bắt đầu</h3>
            <ul className="care-guidance-list"><li>Đặt điện thoại/laptop ổn định và đảm bảo đủ ánh sáng.</li><li>Để camera thấy rõ hông, đầu gối và cổ chân.</li><li>Chỉ tập trong phạm vi chuyển động được hướng dẫn.</li><li>Dừng lại nếu chóng mặt, đau tăng hoặc khó chịu.</li></ul>
            <div className="care-guidance-callout"><strong>Lưu ý</strong><p>Góc khớp do camera ước tính, không phải phép đo lâm sàng.</p></div>
          </aside>
        </div>
      ) : (
        <section className="care-card care-completion-card">
          <div className="care-completion-header"><span className="care-completion-icon"><Check size={22} /></span><div><p className="care-overline">PHIÊN TẬP ĐÃ HOÀN THÀNH</p><h3>Bạn đã hoàn thành mục tiêu hôm nay</h3><p>Kiểm tra tóm tắt. Bạn có thể lưu bằng chứng lên Devnet bằng ví Phantom.</p></div></div>
          <div className="care-result-metrics"><Metric label="Số lần hoàn thành" value={`${result.reps}/${result.targetReps}`} /><Metric label="Điểm kỹ thuật ước tính" value={`${result.formQualityScore}/100`} /><Metric label="Xác minh" value="Chờ bạn ký" /></div>
          <p className="care-disclaimer">Điểm kỹ thuật chỉ là ước tính từ chuyển động camera trong prototype, không đánh giá mức độ hồi phục hoặc đưa ra chẩn đoán.</p>
          <RecoveryCheckIn exerciseId={EXERCISE_ID} result={result} onReset={onReset} onConfirmed={onConfirmed} />
        </section>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="care-result-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function HistoryPage({
  sessions,
  sessionCountLabel,
  onStart,
}: {
  sessions: RecoverySessionRecord[];
  sessionCountLabel: string;
  onStart: () => void;
}) {
  return (
    <>
      <section className="care-welcome-row"><div><p className="care-overline">BẢN GHI DO BẠN TẠO</p><h2>Bằng chứng phục hồi</h2><p className="care-muted">Chỉ những phiên được xác nhận thành công trên Devnet mới xuất hiện ở đây.</p></div><span className="care-date-chip"><ShieldCheck size={16} /> {sessionCountLabel}</span></section>
      {sessions.length === 0 ? (
        <section className="care-card care-empty-state"><span className="care-empty-icon"><WalletCards size={24} /></span><h3>Chưa có bằng chứng nào</h3><p>Khi hoàn thành bài tập và xác nhận giao dịch bằng Phantom, bản ghi sẽ được lưu trên thiết bị này.</p><button className="care-button care-button-primary" type="button" onClick={onStart}>Bắt đầu bài tập <ArrowRight size={17} /></button></section>
      ) : (
        <section className="care-history-list" aria-label="Các phiên đã xác minh">
          {sessions.map((session) => <article className="care-card care-history-item" key={session.signature}>
            <div className="care-history-status"><span className="care-status-check"><Check size={15} /></span><div><strong>Đã xác nhận trên Solana Devnet</strong><p>{new Date(session.timestampIso).toLocaleString("vi-VN")}</p></div></div>
            <div className="care-history-details"><span>{session.repsCompleted}/{session.repsTarget} lần</span><span>Điểm kỹ thuật: {session.formQualityScore}/100</span><span className="care-hash">SHA-256 · {session.proofHash.slice(0, 14)}…</span></div>
            <a className="care-text-button" href={session.explorerUrl} target="_blank" rel="noreferrer">Mở giao dịch trên Explorer <ArrowRight size={15} /></a>
          </article>)}
        </section>
      )}
      <p className="care-history-note"><LockKeyhole size={15} /> Danh sách này lưu trên trình duyệt hiện tại; blockchain chỉ chứa payload tối thiểu và hash, không lưu video.</p>
    </>
  );
}
