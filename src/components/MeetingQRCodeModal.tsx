import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Copy, Check, X, Smartphone, Video, Share2, Sparkles } from "lucide-react";
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
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const textToCopy = `【大地 ECE-Brain 智慧教研研讨会邀请】\n主题：${topic}\n研讨室 ROOM ID / 会议号：${activeCode}\n点击直接入会：${webJoinUrl}\n腾讯会议 App 链接：${tencentJoinUrl}`;
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#090d14] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.18)] p-6 overflow-hidden flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle accent bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex flex-col items-center text-center mt-1 mb-4">
          <Badge className="bg-cyan-500/15 border-cyan-500/30 text-cyan-400 text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full mb-2 flex items-center gap-1">
            <QrCode className="w-3 h-3 text-cyan-400" />
            手机扫码即刻入会
          </Badge>
          <h3 className="text-lg font-bold text-white tracking-tight">
            研讨室扫码与分享面板
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs line-clamp-2">
            {topic}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-black/60 p-1 rounded-xl border border-white/10 w-full mb-5">
          <button
            onClick={() => setActiveTab("web")}
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${
              activeTab === "web"
                ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            网页端极速扫码
          </button>
          <button
            onClick={() => setActiveTab("tencent")}
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${
              activeTab === "tencent"
                ? "bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            腾讯会议 App 扫码
          </button>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.15)] flex flex-col items-center justify-center border-4 border-cyan-500/20 mb-4 relative group">
          <QRCodeSVG 
            value={currentQrUrl} 
            size={180}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: "/icon.png",
              x: undefined,
              y: undefined,
              height: 28,
              width: 28,
              excavate: true,
            }}
          />
        </div>

        {/* Room Info Details */}
        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-center mb-4 font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">ROOM ID / 腾讯会议号</div>
          <div className="text-base font-bold text-cyan-400 tracking-wider">
            {activeCode}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">
            {currentQrUrl}
          </div>
        </div>

        {/* Copy Button */}
        <Button
          onClick={handleCopy}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs h-10 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-black" />
              已复制完整研讨会邀请口令与二维码链接
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-black" />
              一键复制研讨会口令与链接
            </>
          )}
        </Button>

        {/* Subtitle Help */}
        <p className="text-[10px] text-slate-500 text-center mt-3">
          💡 支持微信、手机浏览器直接扫码免密加入音视频与文字讨论
        </p>
      </div>
    </div>
  );
};
