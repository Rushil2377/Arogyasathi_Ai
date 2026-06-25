import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Globe, Trash2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { storage, KEYS } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { askArogyaSathi } from "@/lib/gemini";

type SearchParams = {
  reportText?: string;
};

export const Route = createFileRoute("/ai-health-assistant")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      reportText: search.reportText as string | undefined,
    };
  },
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "AI Health Assistant • ArogyaSathi AI" }] }),
  component: Assistant,
});

type Msg = { id: string; role: "user" | "assistant"; text: string; time: number };

const langs = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "gu", label: "ગુજરાતી" },
];

const prompts: Record<string, string[]> = {
  en: [
    "I have a mild fever and headache. What should I do?",
    "What does high blood pressure feel like?",
    "Foods to avoid for diabetes?",
    "Symptoms of dengue fever",
  ],
  hi: [
    "मुझे हल्का बुखार और सिरदर्द है, क्या करूं?",
    "उच्च रक्तचाप के लक्षण क्या हैं?",
    "मधुमेह में क्या नहीं खाना चाहिए?",
    "डेंगू के लक्षण",
  ],
  gu: [
    "મને હળવો તાવ અને માથાનો દુખાવો છે, શું કરું?",
    "હાઈ બ્લડ પ્રેશરના લક્ષણો?",
    "ડાયાબિટીસમાં શું ન ખાવું?",
    "ડેંગ્યુના લક્ષણો",
  ],
};

// Gemini-powered responses — mockReply has been replaced by askArogyaSathi

function Assistant() {
  const { reportText } = Route.useSearch();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [lang, setLang] = useState("en");
  const [typing, setTyping] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);

  // Build Gemini-compatible history from current messages (for multi-turn context)
  const buildHistory = (msgs: Msg[]) =>
    msgs.map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      text: m.text,
    }));

  useEffect(() => {
    if (reportText && !initialSent.current && userId) {
      initialSent.current = true;
      send(reportText);

      // Clean up search param from URL so it doesn't send again on refresh
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete("reportText");
      const newPath =
        window.location.pathname + (searchParams.toString() ? "?" + searchParams.toString() : "");
      window.history.replaceState(null, "", newPath);
    }
  }, [reportText, userId]);

  useEffect(() => {
    const initChat = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const uid = session.user.id;
        setUserId(uid);

        // Fetch active conversation
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (conv) {
          setActiveConvId(conv.id);
          const { data: dbMsgs } = await supabase
            .from("messages")
            .select("id, sender, content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true });

          if (dbMsgs) {
            setMessages(
              dbMsgs.map((m: any) => ({
                id: m.id,
                role: m.sender,
                text: m.content,
                time: new Date(m.created_at).getTime(),
              })),
            );
          }
        }
      } else {
        // Guest mode
        setMessages(storage.get<Msg[]>(KEYS.chat, []));
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    if (!userId) {
      storage.set(KEYS.chat, messages);
    }
  }, [messages, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages, typing]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsgId = crypto.randomUUID();
    const userMsg: Msg = { id: userMsgId, role: "user", text, time: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    let currentConvId = activeConvId;

    if (userId) {
      try {
        if (!currentConvId) {
          const { data: conv } = await supabase
            .from("conversations")
            .insert({ user_id: userId, title: text.slice(0, 30) })
            .select("id")
            .single();
          if (conv) {
            currentConvId = conv.id;
            setActiveConvId(conv.id);
          }
        }

        if (currentConvId) {
          await supabase.from("messages").insert({
            id: userMsgId,
            conversation_id: currentConvId,
            sender: "user",
            content: text,
          });
        }
      } catch (err) {
        console.error("Error saving message:", err);
      }
    }

    // Call the real ArogyaSathi (Gemini) API
    try {
      const history = buildHistory(messages);
      const { text: replyText } = await askArogyaSathi(text, lang, history);
      const replyMsgId = crypto.randomUUID();
      const reply: Msg = { id: replyMsgId, role: "assistant", text: replyText, time: Date.now() };
      setMessages((m) => [...m, reply]);

      if (userId && currentConvId) {
        try {
          await supabase.from("messages").insert({
            id: replyMsgId,
            conversation_id: currentConvId,
            sender: "assistant",
            content: replyText,
          });
        } catch (err) {
          console.error("Error saving reply:", err);
        }
      }
    } catch (err) {
      console.error("Error getting AI response:", err);
    } finally {
      setTyping(false);
    }
  };

  const clearChat = async () => {
    setMessages([]);
    if (userId) {
      if (activeConvId) {
        await supabase.from("conversations").delete().eq("id", activeConvId);
        setActiveConvId(null);
      }
    } else {
      storage.remove(KEYS.chat);
    }
  };

  return (
    <PageShell>
      <div className="px-4 sm:px-6 pb-10">
        <div className="mx-auto max-w-5xl">
          {/* header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl gradient-medical text-white flex items-center justify-center shadow-[var(--shadow-glow)]">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-medical-dark">
                  ArogyaSathi
                </h1>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Online •
                  EN | हिन्दी | ગુજ
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="glass rounded-full p-1 flex items-center gap-0.5">
                <Globe className="h-3.5 w-3.5 ml-2 text-medical-light" />
                {langs.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition ${lang === l.code ? "gradient-medical text-white" : "text-medical-dark hover:bg-medical-tint"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <button
                onClick={clearChat}
                className="h-9 w-9 rounded-full glass flex items-center justify-center text-medical-dark hover:bg-white"
                aria-label="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* chat */}
          <div className="glass rounded-3xl overflow-hidden flex flex-col h-[68vh]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-10"
                >
                  <div className="inline-flex h-16 w-16 rounded-3xl gradient-medical text-white items-center justify-center mb-4 shadow-[var(--shadow-glow)]">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-medical-dark">
                    How can I help you today?
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ask anything about symptoms, medicines, or healthy habits.
                  </p>
                  <div className="mt-6 grid sm:grid-cols-2 gap-2.5 max-w-xl mx-auto">
                    {prompts[lang].map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        className="text-left text-sm p-3 rounded-xl bg-white border border-border hover:border-medical-light hover:shadow-[var(--shadow-glass)] transition"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-medical-tint text-medical-dark" : "gradient-medical text-white"}`}
                    >
                      {m.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${m.role === "user" ? "gradient-medical text-white rounded-tr-sm" : "bg-white border border-border text-foreground rounded-tl-sm"}`}
                    >
                      {m.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {typing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="shrink-0 h-8 w-8 rounded-full gradient-medical text-white flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-2 w-2 rounded-full bg-medical-light"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* input */}
            <div className="border-t border-border p-3 bg-white/60 backdrop-blur">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about a symptom, medicine, or condition…"
                  className="flex-1 h-11 px-4 rounded-full bg-white border border-border text-sm outline-none focus:border-medical-light focus:ring-4 focus:ring-medical-light/20 transition"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="ripple h-11 w-11 rounded-full gradient-medical text-white flex items-center justify-center shadow-[var(--shadow-glow)] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
