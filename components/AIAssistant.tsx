"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Send, User, Loader2, Copy, Check, Mic, Minus, Square, X as CloseIcon } from "lucide-react";
import { askAssistant } from "@/app/actions/ai-assistant";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import Image from "next/image";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Rnd } from "react-rnd";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();
  const pathname = usePathname();


  const suggestions = [
    "Resumo de desempenho da semana",
    "Quais itens tiveram mais perdas?",
    "Onde devo reduzir a aquisição para a estufa?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isMaximized, isOpen]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-ai-assistant", handleOpen);
    return () => window.removeEventListener("open-ai-assistant", handleOpen);
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    const response = await askAssistant(text);

    setIsLoading(false);

    if (response.success && response.text) {
      setMessages((prev) => [...prev, { role: "assistant", content: response.text as string }]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.error || "Ocorreu um erro ao processar sua solicitação." },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage(inputValue);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue((prev) => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Erro no reconhecimento de voz:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const rndRef = useRef<any>(null);

  const toggleMaximize = () => {
    if (rndRef.current) {
      if (!isMaximized) {

        rndRef.current.updateSize({ width: 700, height: window.innerHeight * 0.85 });
        rndRef.current.updatePosition({ x: (window.innerWidth - 700) / 2, y: window.innerHeight * 0.05 });
      } else {

        rndRef.current.updateSize({ width: 400, height: 600 });
        rndRef.current.updatePosition({ x: window.innerWidth - 400 - 24, y: window.innerHeight - 600 - 24 });
      }
      setIsMaximized(!isMaximized);
    }
  };

  const renderContent = () => (
    <div className="flex flex-col h-full bg-background overflow-hidden w-full">
      {}
      <div className={`p-4 border-b bg-surface flex flex-row items-center justify-between gap-3 space-y-0 text-left ${!isMobile ? "handle cursor-move" : ""}`}>
        <div className="flex flex-row items-center gap-3">
          <div className="relative w-8 h-8 rounded-full overflow-hidden border">
            <Image src="/bot1.png" alt="Iris (IA)" fill className="object-cover" />
          </div>
          <h2 className="text-base font-semibold">Iris</h2>
        </div>
        {!isMobile && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <button onClick={() => setIsOpen(false)} className="hover:bg-muted hover:text-foreground p-1.5 rounded transition-colors" title="Minimizar">
              <Minus className="h-4 w-4" />
            </button>
            <button onClick={toggleMaximize} className="hover:bg-muted hover:text-foreground p-1.5 rounded transition-colors" title={isMaximized ? "Restaurar" : "Expandir"}>
              <Square className="h-4 w-4" />
            </button>
            <button onClick={() => setIsOpen(false)} className="hover:bg-destructive hover:text-destructive-foreground p-1.5 rounded transition-colors" title="Fechar">
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-background">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-80 mt-10">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 shadow-sm">
                <Image src="/bot1.png" alt="Iris" fill className="object-cover" />
              </div>
              <p className="text-sm text-muted-foreground max-w-[250px]">
                Olá! Sou a Iris, sua assistente de gestão de perdas. Como posso ajudar hoje?
              </p>
            </div>

            {}
            <div className="space-y-2 mt-auto pb-4">
              <p className="text-xs text-muted-foreground font-medium px-1">Sugestões prontas:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(suggestion)}
                    className="text-xs bg-surface hover:bg-surface-2 border px-3 py-1.5 rounded-full transition-colors text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""
                }`}
            >
              <div
                className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 overflow-hidden ${msg.role === "user"
                  ? "bg-primary/10 text-primary"
                  : "border"
                  }`}
              >
                {msg.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Image src="/bot1.png" alt="IA" width={32} height={32} className="object-cover w-full h-full" />
                )}
              </div>

              <div className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`text-sm px-4 py-3 rounded-xl ${msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-surface text-foreground rounded-tl-none border prose prose-sm prose-p:leading-relaxed prose-p:mb-5 prose-ul:mb-5 prose-li:mb-3 prose-pre:bg-muted prose-pre:text-muted-foreground prose-a:text-primary max-w-none [&>p:last-child]:mb-0"
                    }`}
                >
                  {msg.role === "user" ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{msg.content}</ReactMarkdown>
                  )}
                </div>

                {}
                {msg.role === "assistant" && (
                  <button
                    onClick={() => copyToClipboard(msg.content, i)}
                    className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
                    title="Copiar resposta"
                  >
                    {copiedIndex === i ? (
                      <>
                        <Check className="h-3 w-3 text-green-500" />
                        <span className="text-green-500">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full shrink-0 overflow-hidden border">
              <Image src="/bot1.png" alt="IA" width={32} height={32} className="object-cover w-full h-full" />
            </div>
            <div className="bg-surface text-foreground rounded-xl rounded-tl-none border px-4 py-3 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {}
      <div className="p-4 border-t">
        <div className="relative flex items-center gap-2">
          <button
            onClick={toggleListening}
            className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full transition-colors shadow-sm border ${isListening
              ? "bg-red-100 text-red-600 border-red-200 animate-pulse"
              : "bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              }`}
            title={isListening ? "Ouvindo..." : "Falar"}
          >
            <Mic className="h-5 w-5" />
          </button>
          <div className="relative flex items-center flex-1">
            <input
              type="text"
              placeholder="Pergunte à IA..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="w-full pl-4 pr-12 py-3 bg-background border rounded-full text-sm outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 shadow-sm"
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-1.5 h-9 w-9 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors shadow-sm"
            >
              <Send className="h-4 w-4 ml-px" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (pathname === "/eventos/novo") {
    return null;
  }

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            className={`fixed bottom-24 right-4 md:hidden p-0 h-12 w-12 rounded-full transition-all duration-300 ${isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100 bot-float"
              } z-50 overflow-hidden ring-1 ring-white/50 shadow-sm`}
            style={{ willChange: "transform" }}
          >
            <Image src="/bot1.png" alt="IA Assistant" fill sizes="(max-width: 768px) 48px, 64px" className="object-cover" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[90vw] sm:max-w-[700px] flex flex-col p-0 h-full border-r bg-background">
          <SheetHeader className="sr-only">
            <SheetTitle>Iris</SheetTitle>
          </SheetHeader>
          {renderContent()}
        </SheetContent>
      </Sheet>
    );
  }

  const isMounted = typeof window !== "undefined";


  const floatingWindow = isOpen && isMounted ? (
    <Rnd
      ref={rndRef}
      default={{
        x: Math.max(0, window.innerWidth - 400 - 24),
        y: Math.max(0, window.innerHeight - 600 - 24),
        width: 400,
        height: 600,
      }}
      minWidth={320}
      minHeight={400}
      dragHandleClassName="handle"
      className="z-[999] shadow-2xl rounded-lg overflow-hidden border bg-background flex flex-col"
      style={{ position: "fixed" }}
    >
      {renderContent()}
    </Rnd>
  ) : null;


  return (
    <>
      {floatingWindow && document ? createPortal(floatingWindow, document.body) : null}
    </>
  );
}
