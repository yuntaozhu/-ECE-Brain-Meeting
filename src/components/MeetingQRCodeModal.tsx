import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Copy, Check, X, Smartphone, Video, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MeetingQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  topic?: string;
  tencentCode?: string;
}

export const MeetingQRCodeModal: React.FC<MeetingQRCodeModalProps> = ({
  isOpen,
  onClose,
  meetingId,
  topic = "关于下一代幼儿教育数字化基础设施的规划",
  tencentCode
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"web" | "tencent">("web");

  if (!isOpen) return null;

  const activeCode = tencentCode || meetingId || "10086";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://dadimeeting.minervaedu.app";
  
  const webJoinUrl = `${origin}/?role=attendee&roomId=${activeCode}`;
  const tencentJoinUrl = `https://meeting.qq.com/p/${activeCode}`;

  const currentQrUrl = activeTab === "web" ? webJoinUrl : tencentJoinUrl;

  const handleCopy = () => {
    const textToCopy = `【大地 ECE-Brain 智慧教研研讨会邀请】\n主题：${topic}\n研讨室 ROOM ID / 会议号：${activeCode}\n点击直接入会：${webJoinUrl}\n腾讯会议 App 链接：${tencentJoinUrl}`;
    
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {
        fallbackCopy(textToCopy);
      });
    } else {
      fallbackCopy(textToCopy);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {
      console.warn("Copy failed", e);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-[#0b1017] border-2 border-cyan-500/50 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.3)] p-6 overflow-y-auto max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle accent bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-cyan-500 hover:text-black text-white transition-all cursor-pointer shadow-md"
          title="关闭面板"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex flex-col items-center text-center mt-1 mb-4">
          <Badge className="bg-cyan-500/20 border-cyan-500/40 text-cyan-300 text-xs font-mono uppercase px-3 py-1 rounded-full mb-2 flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
            手机扫码即刻入会
          </Badge>
          <h3 className="text-xl font-bold text-white tracking-tight">
            研讨室扫码与分享面板
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs line-clamp-2">
            {topic}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 bg-black/80 p-1.5 rounded-xl border border-cyan-500/20 w-full mb-5">
          <button
            onClick={() => setActiveTab("web")}
            className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "web"
                ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            网页端极速扫码
          </button>
          <button
            onClick={() => setActiveTab("tencent")}
            className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "tencent"
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Video className="w-4 h-4" />
            腾讯会议 App 扫码
          </button>
        </div>

        {/* QR Code Container with white high-contrast background */}
        <div className="bg-white p-4 rounded-2xl shadow-[0_0_35px_rgba(255,255,255,0.25)] flex flex-col items-center justify-center border-4 border-cyan-400 mb-4">
          <QRCodeSVG 
            value={currentQrUrl} 
            size={200}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: "/icon.png",
              x: undefined,
              y: undefined,
              height: 32,
              width: 32,
              excavate: true,
            }}
          />
        </div>

        {/* Room Info Details */}
        <div className="w-full bg-white/10 border border-cyan-500/30 rounded-xl p-3.5 text-center mb-4 font-mono">
          <div className="text-[11px] text-cyan-300 font-semibold uppercase tracking-widest mb-1">ROOM ID / 腾讯会议号</div>
          <div className="text-xl font-extrabold text-white tracking-wider">
            {activeCode}
          </div>
          <div className="text-xs text-slate-300 mt-1.5 break-all select-all bg-black/40 p-2 rounded border border-white/10">
            {currentQrUrl}
          </div>
        </div>

        {/* Copy Button */}
        <Button
          onClick={handleCopy}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm h-11 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer mb-3"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-black" />
              已成功复制邀请口令与链接！
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5 text-black" />
              一键复制研讨会完整口令与链接
            </>
          )}
        </Button>

        {/* Close Button Bottom */}
        <Button
          variant="outline"
          onClick={onClose}
          className="w-full bg-white/5 hover:bg-white/10 border-white/20 text-white font-semibold text-xs h-10 rounded-xl transition-all cursor-pointer"
        >
          关闭窗口
        </Button>

        {/* Subtitle Help */}
        <p className="text-[11px] text-slate-400 text-center mt-3">
          💡 支持微信、手机浏览器直接扫码免密加入音视频与文字讨论
        </p>
      </div>
    </div>
  );
};

