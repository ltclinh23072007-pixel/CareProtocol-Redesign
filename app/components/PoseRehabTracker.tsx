"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

export interface RepResult {
  reps: number;
  targetReps: number;
  formQualityScore: number; // trung bình độ chính xác góc gối trong toàn bộ phiên tập (0-100)
}

interface Props {
  targetReps?: number;
  onSessionComplete: (result: RepResult) => void;
}

// Chỉ số landmark theo chuẩn MediaPipe Pose (33 điểm), phía chân phải:
// 24 = hip phải, 26 = knee phải, 28 = ankle phải
const HIP = 24;
const KNEE = 26;
const ANKLE = 28;

// Ngưỡng góc gối (độ) để phân biệt trạng thái "duỗi thẳng" và "gập chân"
const EXTENDED_ANGLE_DEG = 160; // > ngưỡng này coi là chân đã duỗi thẳng
const FLEXED_ANGLE_DEG = 110; // < ngưỡng này coi là chân đã gập đủ sâu

type ExerciseState = "extended" | "flexing" | "flexed";

function calcAngleDegrees(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  // Góc tại điểm b, tạo bởi 2 đoạn thẳng b->a và b->c
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  if (magAB === 0 || magCB === 0) return 180;
  const cosAngle = Math.min(1, Math.max(-1, dot / (magAB * magCB)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

export default function PoseRehabTracker({
  targetReps = 10,
  onSessionComplete,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const stateRef = useRef<ExerciseState>("extended");
  const repsRef = useRef(0);
  const angleQualitySamplesRef = useRef<number[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [modelAttempt, setModelAttempt] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [reps, setReps] = useState(0);
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [feedback, setFeedback] = useState(
    "Đang tải mô hình nhận diện khung xương…"
  );
  const [error, setError] = useState<string | null>(null);

  // Tải model trong trình duyệt; thử GPU trước và dùng CPU nếu thiết bị không hỗ trợ.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const modelAssetPath =
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
        let landmarker: PoseLandmarker;
        try {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath, delegate: "GPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        } catch {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath, delegate: "CPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        }
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setModelReady(true);
        setIsLoading(false);
        setFeedback("Sẵn sàng. Bấm “Bắt đầu tập” và đứng để camera thấy rõ chân phải.");
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Không tải được mô hình nhận diện. Kiểm tra kết nối mạng rồi tải lại trang.");
          setModelReady(false);
          setIsLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [modelAttempt]);

  const stopCamera = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsRunning(false);
  }, []);

  const predictLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas) return;
    if (!landmarker) {
      setError("Mô hình nhận diện chưa sẵn sàng. Hãy tải lại mô hình trước khi bật camera.");
      stopCamera();
      return;
    }
    if (video.readyState < 2) {
      rafIdRef.current = requestAnimationFrame(predictLoop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    let result: PoseLandmarkerResult;
    try {
      result = landmarker.detectForVideo(video, performance.now());
    } catch (error) {
      console.error(error);
      setError("Không thể tiếp tục phân tích chuyển động. Hãy dừng camera và thử lại.");
      stopCamera();
      return;
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (result.landmarks && result.landmarks.length > 0) {
      const lm = result.landmarks[0];
      const hip = lm[HIP];
      const knee = lm[KNEE];
      const ankle = lm[ANKLE];

      if (hip && knee && ankle) {
        const angle = calcAngleDegrees(hip, knee, ankle);
        setCurrentAngle(Math.round(angle));

        // Vẽ khung xương chân phải để bệnh nhân tự quan sát tư thế
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(hip.x * canvas.width, hip.y * canvas.height);
        ctx.lineTo(knee.x * canvas.width, knee.y * canvas.height);
        ctx.lineTo(ankle.x * canvas.width, ankle.y * canvas.height);
        ctx.stroke();
        [hip, knee, ankle].forEach((p) => {
          ctx.fillStyle = "#059669";
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, 7, 0, 2 * Math.PI);
          ctx.fill();
        });

        // State machine đếm rep: extended -> flexing -> flexed -> (quay lại) extended = 1 rep
        const state = stateRef.current;
        if (state === "extended" && angle < FLEXED_ANGLE_DEG) {
          stateRef.current = "flexing";
        } else if (state === "flexing" && angle < FLEXED_ANGLE_DEG - 5) {
          stateRef.current = "flexed";
          // Điểm chất lượng: gập càng sâu (góc càng nhỏ, tối đa hoá ở 70 độ) điểm càng cao
          const quality = Math.max(
            0,
            Math.min(100, 100 - (angle - 70) * 1.2)
          );
          angleQualitySamplesRef.current.push(quality);
        } else if (state === "flexed" && angle > EXTENDED_ANGLE_DEG) {
          stateRef.current = "extended";
          repsRef.current += 1;
          setReps(repsRef.current);
          setFeedback(`Tốt! Đã đếm ${repsRef.current}/${targetReps} lần.`);

          if (repsRef.current >= targetReps) {
            const samples = angleQualitySamplesRef.current;
            const avgQuality =
              samples.length > 0
                ? Math.round(
                    samples.reduce((a, b) => a + b, 0) / samples.length
                  )
                : 80;
            stopCamera();
            onSessionComplete({
              reps: repsRef.current,
              targetReps,
              formQualityScore: avgQuality,
            });
            ctx.restore();
            return;
          }
        }

        if (angle >= FLEXED_ANGLE_DEG && angle <= EXTENDED_ANGLE_DEG) {
          setFeedback("Đang chuyển động — tiếp tục gập/duỗi đều nhịp.");
        } else if (state === "extended") {
          setFeedback("Chân đang duỗi thẳng. Bắt đầu gập gối lại.");
        }
      }
    } else {
      setFeedback("Không thấy rõ chân trong khung hình. Lùi lại để camera thấy toàn thân.");
    }

    ctx.restore();
    rafIdRef.current = requestAnimationFrame(predictLoop);
  }, [onSessionComplete, stopCamera, targetReps]);

  const startCamera = useCallback(async () => {
    let stream: MediaStream | null = null;
    try {
      setError(null);
      repsRef.current = 0;
      angleQualitySamplesRef.current = [];
      stateRef.current = "extended";
      setReps(0);

      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsRunning(true);
      rafIdRef.current = requestAnimationFrame(predictLoop);
    } catch (e) {
      console.error(e);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      const denied = e instanceof DOMException && e.name === "NotAllowedError";
      setError(denied
        ? "Bạn chưa cấp quyền camera. Hãy cho phép camera trong trình duyệt rồi thử lại."
        : "Không mở được camera. Kiểm tra camera đang hoạt động và thử lại.");
    }
  }, [predictLoop]);

  useEffect(() => stopCamera, [stopCamera]);

  return (
    <div className="pose-tracker">
      <div className="pose-camera-frame">
        <video ref={videoRef} className="hidden" playsInline muted aria-hidden="true" />
        <canvas ref={canvasRef} aria-label="Hình ảnh camera và khung xương được nhận diện" />
        {!isRunning && (
          <div className="pose-camera-overlay" role="status" aria-live="polite">
            {isLoading ? (
              <><strong>Đang chuẩn bị mô hình</strong><p>Đang tải công cụ nhận diện chuyển động trong trình duyệt của bạn.</p></>
            ) : error ? (
              <><strong>Chưa thể bắt đầu</strong><p>{error}</p></>
            ) : (
              <><strong>Sẵn sàng cho buổi tập</strong><p>Đặt camera sao cho thấy rõ hông, đầu gối và cổ chân. Camera chỉ bật khi bạn chọn bắt đầu.</p></>
            )}
          </div>
        )}
        {isRunning && <span className="pose-live-badge"><span /> ĐANG THEO DÕI</span>}
        {currentAngle !== null && isRunning && <span className="pose-angle-badge">Góc gối ước tính <strong>{currentAngle}°</strong></span>}
      </div>

      <div className="pose-progress-row">
        <div>
          <p className="care-card-kicker">TIẾN ĐỘ BÀI TẬP</p>
          <div className="pose-rep-count">{reps} <span>/ {targetReps} lần</span></div>
        </div>
        <p className="care-small care-muted">Chân phải · camera trước</p>
      </div>
      <p className="pose-feedback" aria-live="polite"><Activity size={14} /> {feedback}</p>
      {error && <div className="pose-error" role="alert">{error}</div>}

      <div className="pose-controls">
        {!isRunning ? (
          <button
            onClick={modelReady ? startCamera : () => setModelAttempt((attempt) => attempt + 1)}
            disabled={isLoading}
            className="care-button care-button-primary"
          >
            {isLoading ? "Đang chuẩn bị…" : !modelReady ? "Thử tải mô hình lại" : error ? "Thử bật camera lại" : "Bắt đầu tập"}
          </button>
        ) : (
          <button onClick={stopCamera} className="care-button care-button-secondary">Dừng lại</button>
        )}
      </div>
      <p className="pose-hint">Số rep và góc là ước tính từ camera; hãy làm theo chỉ định của chuyên viên y tế.</p>
    </div>
  );
}
