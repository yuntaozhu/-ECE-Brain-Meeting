import React, { useState } from "react";
import { useMeetingStore } from "../store";
import { 
  Plus, Trash2, Upload, FileText, Link, Copy, Check, Sparkles, 
  HelpCircle, Shield, Brain, ArrowRight, Layers, File, Settings, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AgendaFormItem {
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
}

export default function MeetingSetup({ onSetupComplete }: { onSetupComplete: () => void }) {
  const { 
    setTopic, 
    setAgendas, 
    setMountedFiles, 
    joinMeeting, 
    meetingId,
    setUserRoleType
  } = useMeetingStore();

  const [topicInput, setTopicInput] = useState("关于下一代幼儿教育数字化基础设施的规划");
  const [meetingRoomId, setMeetingRoomId] = useState("10086");
  
  // Agendas list form state
  const [agendaItems, setAgendaItems] = useState<AgendaFormItem[]>([
    {
      id: "IceBreaking",
      title: "研讨会开场与背景宣读与议程核验",
      description: "宣读核心议题，核验张园长与各高管声纹在场状态",
      durationSeconds: 45
    },
    {
      id: "MainDiscussion",
      title: "双核托班护眼传感器与注意力算法论证",
      description: "研讨低能耗眨眼采集规则、硬件防眩光网关指标与偏题警报拦截",
      durationSeconds: 90
    },
    {
      id: "Conclusion",
      title: "待办清单学术会商与共识成果整理",
      durationSeconds: 45,
      description: "AI学术秘书实时提炼，阻断形式主义闲杂词，自动同步代办项"
    }
  ]);

  // File Upload RAG mock logic
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: string; status: 'uploaded' | 'vectorizing' | 'done'; progress: number; chunks?: number }>>([]);
  const [dragActive, setDragActive] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [setupFinished, setSetupFinished] = useState(false);

  // Form helpers for Agenda List
  const handleAddAgenda = () => {
    const nextId = agendaItems.length === 0 ? "IceBreaking" : agendaItems.length === 1 ? "MainDiscussion" : agendaItems.length === 2 ? "Conclusion" : `Stage_${agendaItems.length + 1}`;
    const newItem: AgendaFormItem = {
      id: nextId,
      title: `自定义研讨主题 ${agendaItems.length + 1}`,
      description: "请描述该子议程的研究重点与期望学术输出...",
      durationSeconds: 60
    };
    setAgendaItems([...agendaItems, newItem]);
  };

  const handleRemoveAgenda = (index: number) => {
    if (agendaItems.length <= 1) return;
    setAgendaItems(agendaItems.filter((_, i) => i !== index));
  };

  const handleUpdateAgenda = (index: number, fields: Partial<AgendaFormItem>) => {
    const updated = agendaItems.map((item, i) => {
      if (i === index) {
        return { ...item, ...fields };
      }
      return item;
    });
    setAgendaItems(updated);
  };

  // Mock File Drag/Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFilesUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFilesUpload(Array.from(e.target.files));
    }
  };

  const handleFilesUpload = (files: File[]) => {
    files.forEach(file => {
      const fName = file.name;
      const fSize = (file.size / 1024 / 1024).toFixed(2) + " MB";
      
      const newFileIdx = uploadedFiles.length;
      const newFile = {
        name: fName,
        size: fSize,
        status: 'vectorizing' as const,
        progress: 10,
        chunks: undefined
      };
      
      setUploadedFiles(prev => [...prev, newFile]);

      // Simulate step-by-step vector chunks embedding
      let progress = 10;
      const timer = setInterval(() => {
        progress += 15;
        if (progress >= 100) {
          clearInterval(timer);
          setUploadedFiles(prev => 
            prev.map(f => f.name === fName ? { ...f, status: 'done', progress: 100, chunks: Math.floor(Math.random() * 45) + 12 } : f)
          );
        } else {
          setUploadedFiles(prev => 
            prev.map(f => f.name === fName ? { ...f, progress } : f)
          );
        }
      }, 500);
    });
  };

  const cleanFile = (name: string) => {
    setUploadedFiles(uploadedFiles.filter(f => f.name !== name));
  };

  // Submit and form invite URI
  const handleGenerateMeeting = () => {
    if (!topicInput.trim()) return;

    // Save customized titles and topics to global store
    setTopic(topicInput.trim());
    
    // Ensure standard ID format is kept
    const finalAgendas = agendaItems.map((item, idx) => {
      let safeId = item.id;
      if (idx === 0) safeId = "IceBreaking";
      else if (idx === 1) safeId = "MainDiscussion";
      else if (idx === 2) safeId = "Conclusion";
      return {
        ...item,
        id: safeId
      };
    });
    setAgendas(finalAgendas);
    setMountedFiles(uploadedFiles.map(f => ({ name: f.name, size: f.size, status: f.status })));

    // Generate link for standard standard attendee
    const origin = typeof window !== "undefined" ? window.location.origin : "https://ece-brain.dadi.edu";
    const invite = `${origin}?role=attendee&roomId=${meetingRoomId}`;
    setInviteUrl(invite);
    
    // Mark config setup done
    setSetupFinished(true);
  };

  const handleCopyInviteLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEnterLobby = () => {
    // Join as meeting creator
    joinMeeting("张园长", "学前数字融合组长", meetingRoomId, "creator");
    onSetupComplete();
  };

  return (
    <div className="min-h-screen bg-[#05070A] bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.08)_0%,_transparent_65%)] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center font-sans">
      <div className="w-full max-w-3xl space-y-8">
        
        {/* Superior Branding logo banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] tracking-widest text-cyan-400 font-bold font-mono">
            💡 大地 ECE-BRAIN 筹备后台
          </div>
          <h1 className="text-3xl font-extralight tracking-tight text-white sm:text-4xl">
            会前教研资源挂载与 RAG 大纲设计
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            在研讨会开始前，定制学术路线图并向量化挂载教研资料。AI 主席与秘书团队将深度吸收该知识库并强硬控场执行。
          </p>
        </div>

        {!setupFinished ? (
          <div className="space-y-6">
            
            {/* Topic & Room ID Basic Configuration */}
            <Card className="border-white/10 bg-black/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                  基本会议参数
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  设定本次大地智能化峰会的主会题与会议连接频道
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">会议主题 (Subject)</label>
                    <input
                      type="text"
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      className="w-full text-xs font-medium bg-white/5 border border-white/10 hover:border-white/20 focus:border-cyan-500/50 focus:bg-white/10 rounded-xl px-4 py-3 text-white outline-none transition-all"
                      placeholder="设置高维教研主题"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">频道房号 (Room ID)</label>
                    <input
                      type="text"
                      value={meetingRoomId}
                      onChange={(e) => setMeetingRoomId(e.target.value)}
                      className="w-full text-xs font-mono bg-white/5 border border-white/10 hover:border-white/20 focus:border-cyan-500/50 focus:bg-white/10 rounded-xl px-4 py-3 text-white outline-none transition-all text-center font-bold tracking-widest text-cyan-400"
                      placeholder="频道"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* compose Dynamic Agendas List */}
            <Card className="border-white/10 bg-black/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur">
              <CardHeader className="pb-3 border-b border-white/5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    定制会议议程与流转大纲 (1-N 议程链)
                  </CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">
                    AI 虚拟主席会严格根据大纲次序推行讨论，达成共识后生成 `[ACTION: AGENDA_NEXT]` 进行动态转段。
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleAddAgenda}
                  variant="outline" 
                  size="sm" 
                  className="h-8 border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-400 font-bold text-[10px] tracking-wider uppercase cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  增设议程
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {agendaItems.map((agenda, index) => (
                  <div 
                    key={agenda.id} 
                    className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/20 transition-all flex flex-col md:flex-row gap-4 items-start relative group"
                  >
                    <div className="flex items-center gap-2 self-start shrink-0">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold flex items-center justify-center">
                        {index + 1}
                      </div>
                      <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase font-mono">
                        {index === 0 ? "破冰宣读" : index === 1 ? "核心算法" : index === 2 ? "收官总结" : "附加论点"}
                      </span>
                    </div>

                    <div className="flex-1 space-y-3 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-3">
                          <input
                            type="text"
                            value={agenda.title}
                            onChange={(e) => handleUpdateAgenda(index, { title: e.target.value })}
                            className="w-full text-xs font-semibold bg-white/5 border border-white/10 hover:border-white/15 focus:border-cyan-500/40 rounded-lg px-3 py-1.5 text-slate-200 outline-none transition-all"
                            placeholder="设定议题标题"
                          />
                        </div>
                        <div>
                          <div className="flex items-center bg-white/5 border border-white/10 focus-within:border-cyan-500/40 rounded-lg px-2 py-1.5">
                            <input
                              type="number"
                              value={agenda.durationSeconds}
                              onChange={(e) => handleUpdateAgenda(index, { durationSeconds: Number(e.target.value) || 30 })}
                              className="w-full text-xs text-center font-mono text-emerald-400 bg-transparent outline-none focus:ring-0"
                            />
                            <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-1">秒</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full">
                        <textarea
                          rows={2}
                          value={agenda.description}
                          onChange={(e) => handleUpdateAgenda(index, { description: e.target.value })}
                          className="w-full text-[11px] leading-relaxed text-slate-400 bg-white/5 border border-white/5 hover:border-white/10 focus:border-cyan-500/40 rounded-lg px-3 py-2 outline-none transition-all resize-none"
                          placeholder="描述这部分的约束或大模型对特定闲聊(比如粽子报销)的纠偏规则..."
                        />
                      </div>
                    </div>

                    {agendaItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAgenda(index)}
                        className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Knowledge Base vectorizer File Attachments zone */}
            <Card className="border-white/10 bg-black/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  挂载本次会议专属知识库（RAG 向量加载）
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  支持上传 PDF/Word 等背景规范性材料。系统会在此启动高敏苏格拉底切片，帮助 AI 智能体掌握业务参数。
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Drag and Drop Zone */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-xl p-6 text-center transition-all ${
                    dragActive 
                      ? "border-cyan-500 bg-cyan-500/5 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]" 
                      : "border-white/10 hover:border-cyan-500/30 bg-white/5"
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload-input"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                      <Upload className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white">点击上传资源文件 或 拖曳放入此处</span>
                      <p className="text-[9px] text-slate-500 mt-1">支持 PDF、Word 文档、技术文本文稿进行自动编码分片</p>
                    </div>
                  </label>
                </div>

                {/* Uploaded Files vector progress items list */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider block">向量索引流水:</span>
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2 relative overflow-hidden">
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-cyan-400" />
                            <div className="text-left">
                              <span className="text-xs font-semibold text-slate-200 block truncate max-w-md">{file.name}</span>
                              <span className="text-[9px] text-slate-500 font-mono">大小: {file.size}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge className={`text-[8px] px-1.5 py-0.5 rounded ${
                              file.status === 'done' 
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            }`}>
                              {file.status === 'done' ? "✅ 向量索引库就绪" : `✨ RAG 切割分片中 (${file.progress}%)`}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => cleanFile(file.name)}
                              className="w-6 h-6 text-slate-500 hover:text-white rounded"
                            >
                              ✕
                            </Button>
                          </div>
                        </div>

                        {/* Visual encoding slider */}
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${file.status === 'done' ? "bg-emerald-500" : "bg-cyan-500"}`} 
                            style={{ width: `${file.progress}%` }}
                          ></div>
                        </div>

                        {file.chunks && (
                          <div className="text-[9px] text-slate-500 font-mono flex items-center justify-between">
                            <span>切片段数: {file.chunks} 个高维特征矢块</span>
                            <span className="text-emerald-400">UUID: ece_rag_{file.chunks * 1536}_indexed</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Launch composition */}
            <div className="pt-3">
              <Button 
                onClick={handleGenerateMeeting}
                className="w-full bg-cyan-500 hover:bg-cyan-400 border border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] font-bold tracking-widest uppercase text-xs h-12 transition-all rounded-xl cursor-pointer"
              >
                生成本次教研学术专属会场与链接
                <ArrowRight className="w-4 h-4 ml-2 inline" />
              </Button>
            </div>

          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Success Card with invitation link composition */}
            <Card className="border-emerald-500/30 bg-black/60 shadow-[0_0_40px_rgba(16,185,129,0.1)] backdrop-blur text-center py-8 px-6">
              <div className="w-12 h-12 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <CardTitle className="text-lg font-light text-white">
                大地 ECE-Brain 学术大本营组建完毕！
              </CardTitle>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                会议专属知识库（挂载文件 {uploadedFiles.length} 项）在后台服务器加载就绪，大麦克风与 AI 虚拟主席随时监控待发。
              </p>

              {/* Invitation panel */}
              <div className="mt-6 p-4 rounded-xl border border-white/10 bg-white/5 space-y-4 max-w-xl mx-auto">
                <div className="text-left space-y-1.5">
                  <span className="text-[9px] font-mono uppercase text-slate-500 tracking-wider block">嘉宾普通参会专属邀请通道 (Role=Attendee Link)</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-black/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 select-all truncate">
                      {inviteUrl}
                    </div>
                    <Button 
                      onClick={handleCopyInviteLink}
                      variant="outline"
                      className={`h-9 font-bold text-[10px] tracking-wider uppercase cursor-pointer ${
                        copied 
                          ? "bg-emerald-500 hover:bg-emerald-600 text-black border-emerald-400" 
                          : "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                      }`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copied ? "已复制" : "复制邀请文本"}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-lg text-left flex gap-3">
                  <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-white block">极客提示 (RBAC 角色鉴权已覆盖):</span>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                      任何人通过上述链接加入，将自动锁定为普通参会者；该身份在音频混音中无法触发起搏发音、无法强制切阶段、亦没有关闭会议大本营的管理员控制权。安全管控等级 A+。
                    </p>
                  </div>
                </div>
              </div>

              {/* Run Entrance */}
              <div className="pt-6 max-w-xs mx-auto">
                <Button 
                  onClick={handleEnterLobby}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 border border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] font-bold tracking-widest uppercase text-xs h-11 transition-all rounded-xl cursor-pointer"
                >
                  进入数字研讨大室 (Creator)
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>

          </div>
        )}

      </div>
    </div>
  );
}
