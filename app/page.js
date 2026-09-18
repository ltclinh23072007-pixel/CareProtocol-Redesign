"use client";

import React, { useEffect, useRef, useState } from "react";

export default function ExerciseTracker({ onComplete }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [repCount, setRepCount] = useState(0);
  const [stage, setStage] = useState("UP"); // "UP" (duỗi) hoặc "DOWN" (co)
  const [currentAngle, setCurrentAngle] = useState(180);
  const [isCompleted, setIsCompleted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Đang tải AI Model...");

  // Hàm tính góc giữa 3 điểm khớp (A: Hông, B: Gối, C: Cổ chân)
  const calculateAngle = (a, b, c) => {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return Math.round(angle);
  };

  useEffect(() => {
    let camera = null;
    let pose = null;

    // Load thư viện MediaPipe Pose từ CDN để tránh lỗi SSR trong Next.js
    const loadScripts = async () => {
      const scripts = [
        "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
        "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
        "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js",
      ];

      for (const src of scripts) {
        if (!document.querySelector(`script[src="${src}"]`)) {
          const s = document.createElement("script");
          s.src = src;
          s.async = false;
          document.body.appendChild(s);
          await new Promise((resolve) => (s.onload = resolve));
        }
      }
      initPose();
    };

    const initPose = () => {
      if (!window.Pose || !window.Camera) return;

      pose = new window.Pose({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onResults);

      if (videoRef.current) {
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await pose.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        camera.start();
        setStatusMessage("Đưa chân/đầu gối vào khung hình để bắt đầu");
      }
    };

    // Xử lý từng frame từ webcam
    const onResults = (results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        // Vẽ khung xương lên canvas
        if (window.drawConnectors && window.drawLandmarks) {
          window.drawConnectors(
            ctx,
            results.poseLandmarks,
            window.POSE_CONNECTIONS,
            { color: "#00FF7F", lineWidth: 3 }
          );
          window.drawLandmarks(ctx, results.poseLandmarks, {
            color: "#FF0055",
            lineWidth: 2,
            radius: 4,
          });
        }

        // Lấy tọa độ chân phải (24: Hông phải, 26: Gối phải, 28: Cổ chân phải)
        // Nếu người dùng quay chân trái thì đổi sang (23, 25, 27)
        const hip = results.poseLandmarks[24];
        const knee = results.poseLandmarks[26];
        const ankle = results.poseLandmarks[28];

        if (hip && knee && ankle && hip.visibility > 0.4 && knee.visibility > 0.4) {
          const angle = calculateAngle(hip, knee, ankle);
          setCurrentAngle(angle);

          // Logic đếm số lần co/duỗi
          // Khi gối gập < 110 độ -> ghi nhận trạng thái DOWN (Co)
          if (angle < 110) {
            setStage((prev) => (prev !== "DOWN" ? "DOWN" : prev));
          }

          // Khi gối duỗi > 155 độ từ trạng thái DOWN -> Tăng 1 Rep
          if (angle > 155) {
            setStage((prev) => {
              if (prev === "DOWN") {
                setRepCount((count) => {
                  const nextCount = count + 1;
                  if (nextCount >= 5) {
                    setIsCompleted(true);
                    setStatusMessage("Tuyệt vời! Bạn đã hoàn thành 5/5 lần tập.");
                    if (onComplete) onComplete(nextCount);
                  }
                  return nextCount;
                });
                return "UP";
              }
              return prev;
            });
          }
        }
      }
      ctx.restore();
    };

    loadScripts();

    return () => {
      if (camera) camera.stop();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900 text-white rounded-2xl shadow-xl max-w-2xl mx-auto">
      {/* Tiêu đề & Thông số */}
      <div className="w-full flex justify-between items-center mb-4 px-2">
        <div>
          <h2 className="text-xl font-bold text-teal-400">
            Bài tập: Co duỗi khớp gối hậu phẫu
          </h2>
          <p className="text-xs text-gray-400">{statusMessage}</p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase tracking-wider text-gray-400">Số lần hoàn thành</span>
          <p className="text-3xl font-extrabold text-teal-300">
            {repCount} <span className="text-sm font-normal text-gray-400">/ 5 lần</span>
          </p>
        </div>
      </div>

      {/* Khung Camera & Canvas */}
      <div className="relative w-[640px] h-[480px] bg-black rounded-xl overflow-hidden border-2 border-slate-700">
        <video
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1]"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute top-0 left-0 w-full h-full object-cover scale-x-[-1]"
        />

        {/* HUD góc khớp gối hiển thị đè lên màn hình */}
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur px-3 py-2 rounded-lg border border-white/10 text-xs">
          <div>Góc khớp gối: <span className="font-bold text-yellow-400">{currentAngle}°</span></div>
          <div>Trạng thái: <span className="font-bold text-teal-400">{stage}</span></div>
        </div>
      </div>

      {/* Nút trigger On-chain khi tập xong */}
      {isCompleted && (
        <div className="mt-4 p-4 bg-teal-950/60 border border-teal-500/40 rounded-xl w-full text-center animate-pulse">
          <p className="text-teal-300 font-semibold mb-2">
            Đã xác thực cử động đạt chuẩn y khoa bằng AI!
          </p>
          <button
            onClick={() => onComplete && onComplete(repCount)}
            className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold rounded-lg hover:opacity-90 transition"
          >
            Ký duyệt On-chain lên Solana Devnet
          </button>
        </div>
      )}
    </div>
  );
}