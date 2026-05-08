import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import botMascotUrl from "../../shared/assets/bot-mascot.svg?url";
import { InjectedPage } from "../../shared/components/InjectedPage";
import { chatTemplate } from "./chatTemplate";

const RASA_BASE_URL = import.meta.env.VITE_RASA_URL ?? "http://127.0.0.1:5005";
const RASA_SENDER_STORAGE_KEY = "rasa-sender-id";

function getRasaSenderId() {
  const existing = window.sessionStorage.getItem(RASA_SENDER_STORAGE_KEY);
  if (existing) return existing;

  const senderId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `sender-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.sessionStorage.setItem(RASA_SENDER_STORAGE_KEY, senderId);
  return senderId;
}

declare global {
  interface Window {
    clearChat?: () => void;
    exportChat?: () => void;
    sendSuggestion?: (text: string) => void;
    sendMessage?: () => void;
    scrollToBottom?: (smooth?: boolean) => void;
    copyCode?: (button: HTMLElement) => void;
    openCalendarPage?: () => void;
    toggleChatTheme?: () => void;
    webkitAudioContext?: typeof AudioContext;
  }
}

export function ChatPage() {
  const navigate = useNavigate();
  const styleText = useMemo(() => chatTemplate.styleText, []);
  const bodyHtml = useMemo(() => chatTemplate.bodyHtml.split("__BOT_MASCOT_URL__").join(botMascotUrl), []);

  useEffect(() => {
    const audioCtx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)
      ? new (window.AudioContext || window.webkitAudioContext)()
      : null;

    const playReceiveSound = () => {
      if (!audioCtx) return;
      if (audioCtx.state === "suspended") void audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.12);
    };

    const playSendSound = () => {
      if (!audioCtx) return;
      if (audioCtx.state === "suspended") void audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(660, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.08);
    };

    const ambientDots = document.getElementById("ambientDots");
    if (ambientDots) {
      ambientDots.innerHTML = "";
      for (let i = 0; i < 12; i += 1) {
        const dot = document.createElement("div");
        dot.className = "ambient-dot";
        dot.style.left = `${Math.random() * 100}%`;
        dot.style.animationDuration = `${15 + Math.random() * 20}s`;
        dot.style.animationDelay = `${Math.random() * 20}s`;
        const size = 2 + Math.random() * 3;
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        ambientDots.appendChild(dot);
      }
    }

    const chatArea = document.getElementById("chatArea") as HTMLDivElement | null;
    const welcome = document.getElementById("welcome") as HTMLDivElement | null;
    const msgInput = document.getElementById("msgInput") as HTMLTextAreaElement | null;
    const sendBtn = document.getElementById("sendBtn") as HTMLButtonElement | null;
    const charCount = document.getElementById("charCount") as HTMLSpanElement | null;
    const voiceHint = document.getElementById("voiceHint") as HTMLSpanElement | null;
    const scrollBottomBtn = document.getElementById("scrollBottomBtn") as HTMLButtonElement | null;
    const msgCountBadge = document.getElementById("msgCountBadge") as HTMLDivElement | null;
    const msgCountText = document.getElementById("msgCountText") as HTMLSpanElement | null;
    const themeLabel = document.getElementById("themeLabel") as HTMLSpanElement | null;
    const clearChatModal = document.getElementById("clearChatModal") as HTMLDivElement | null;
    const clearChatBackdrop = document.getElementById("clearChatBackdrop") as HTMLDivElement | null;
    const closeClearChatBtn = document.getElementById("closeClearChatBtn") as HTMLButtonElement | null;
    const cancelClearChatBtn = document.getElementById("cancelClearChatBtn") as HTMLButtonElement | null;
    const confirmClearChatBtn = document.getElementById("confirmClearChatBtn") as HTMLButtonElement | null;

    if (
      !chatArea ||
      !welcome ||
      !msgInput ||
      !sendBtn ||
      !charCount ||
      !voiceHint ||
      !scrollBottomBtn ||
      !msgCountBadge ||
      !msgCountText ||
      !themeLabel ||
      !clearChatModal ||
      !clearChatBackdrop ||
      !closeClearChatBtn ||
      !cancelClearChatBtn ||
      !confirmClearChatBtn
    ) {
      return;
    }

    const mascotSrc = botMascotUrl;
    const rasaSenderId = getRasaSenderId();
    let messageCount = 0;
    let isStreaming = false;
    let isListening = false;
    let chatBlocked = false;
    let speechBaseText = "";
    const themeStorageKey = "agenda-theme";
    type BrowserSpeechRecognition = {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onstart: ((ev: Event) => void) | null;
      onend: ((ev: Event) => void) | null;
      onresult: ((ev: Event & { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: ((ev: Event & { error?: string }) => void) | null;
      start(): void;
      stop(): void;
      abort(): void;
    };
    const speechWindow = window as Window & {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechRecognitionApi = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    const recognition = SpeechRecognitionApi ? new SpeechRecognitionApi() : null;

    const applyTheme = (theme: "light" | "dark") => {
      document.documentElement.dataset.theme = theme;
      themeLabel.textContent = theme === "dark" ? "Modo oscuro" : "Modo claro";
    };

    const getSavedTheme = (): "light" | "dark" => {
      const saved = window.localStorage.getItem(themeStorageKey);
      return saved === "dark" ? "dark" : "light";
    };

    applyTheme(getSavedTheme());

    if (recognition) {
      recognition.lang = "es-AR";
      recognition.continuous = true;
      recognition.interimResults = true;
    }

    const now = () =>
      new Date().toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });

    const parseMarkdown = (text: string) => {
      const out = text
        .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang: string, code: string) => {
          const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          return `<div class="code-block">
            <div class="code-block-header">
              <span>${lang || "code"}</span>
              <button class="copy-btn" onclick="copyCode(this)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                </svg>
              </button>
            </div>
            <pre>${escaped}</pre>
          </div>`;
        })
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/^>\s(.+)$/gm, "<blockquote>$1</blockquote>")
        .replace(/^- (.+)$/gm, "<li>$1</li>")
        .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>");
      return `<p>${out}</p>`;
    };

    const formatUserText = (text: string) =>
      text.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    const scrollToBottom = (smooth = true) => {
      requestAnimationFrame(() => {
        const wrap = chatArea.querySelector(".msg-center-wrap");
        const lastMessage = wrap?.lastElementChild as HTMLElement | null;
        const extraBottomOffset = 32;
        const behavior: ScrollBehavior = smooth ? "smooth" : "auto";

        if (lastMessage) {
          const lastMessageBottom = lastMessage.offsetTop + lastMessage.offsetHeight;
          const targetTop = Math.max(0, lastMessageBottom - chatArea.clientHeight + extraBottomOffset);
          chatArea.scrollTo({ top: targetTop, behavior });
          return;
        }

        chatArea.scrollTo({ top: chatArea.scrollHeight + extraBottomOffset, behavior });
      });
    };

    const updateMsgCount = () => {
      msgCountText.textContent = `${messageCount} mensaje${messageCount !== 1 ? "s" : ""}`;
      msgCountBadge.classList.add("visible");
      window.setTimeout(() => msgCountBadge.classList.remove("visible"), 2000);
    };

    const streamText = (el: HTMLElement, text: string) => {
      const tokens = text.match(/\S+\s*/g) || [text];
      let index = 0;

      const renderChunk = () => {
        index += 1;
        el.innerHTML = parseMarkdown(tokens.slice(0, index).join(""));
        scrollToBottom(true);
        if (index < tokens.length) window.setTimeout(renderChunk, 35);
      };

      renderChunk();
    };

    const addTypingIndicator = () => {
      const row = document.createElement("div");
      row.className = "typing-row";
      row.id = "typingIndicator";
      row.innerHTML = `
        <div class="msg-avatar"><img src="${mascotSrc}" alt="Mascota bot"></div>
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      `;
      chatArea.querySelector(".msg-center-wrap")?.appendChild(row);
      scrollToBottom(true);
      return row;
    };

    const addUserMessage = (text: string) => {
      messageCount += 1;
      updateMsgCount();
      const row = document.createElement("div");
      row.className = "msg-row user";
      row.innerHTML = `
        <div class="msg-avatar">U</div>
        <div class="msg-content">
          <div class="msg-card">
            <span class="msg-notch"></span>
            ${formatUserText(text)}
          </div>
          <div class="msg-footer">
            <span class="msg-time">${now()}</span>
            <span class="msg-status sent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </div>
        </div>
      `;
      chatArea.querySelector(".msg-center-wrap")?.appendChild(row);
      scrollToBottom(true);
    };

    const addBotMessage = (text: string) => {
      playReceiveSound();
      messageCount += 1;
      updateMsgCount();
      const messageId = `msgCard${messageCount}`;
      const row = document.createElement("div");
      row.className = "msg-row bot";
      row.innerHTML = `
        <div class="msg-avatar"><img src="${mascotSrc}" alt="Mascota bot"></div>
        <div class="msg-content">
          <div class="msg-card" id="${messageId}">
            <span class="msg-notch"></span>
          </div>
          <div class="msg-footer">
            <span class="msg-time">${now()}</span>
          </div>
        </div>
      `;
      chatArea.querySelector(".msg-center-wrap")?.appendChild(row);
      scrollToBottom(true);
      const card = document.getElementById(messageId);
      if (card) streamText(card, text);
    };



    const blockChat = () => {
      chatBlocked = true;
      msgInput.disabled = true;
      sendBtn.disabled = true;
      msgInput.placeholder = "Chat finalizado. Iniciá un nuevo chat para continuar.";
      const wrap = chatArea.querySelector(".msg-center-wrap");
      if (wrap) {
        const banner = document.createElement("div");
        banner.className = "chat-ended-banner";
        banner.textContent = "Chat finalizado";
        wrap.appendChild(banner);
      }
      scrollToBottom(true);
    };

    const sendMessage = async () => {
      const text = msgInput.value.trim();
      if (!text || isStreaming || chatBlocked) return;

      stopListening(true);
      playSendSound();
      welcome.style.display = "none";
      addUserMessage(text);
      msgInput.value = "";
      isStreaming = true;
      syncInputUi();

      const typingRow = addTypingIndicator();

      try {
        const response = await fetch(`${RASA_BASE_URL}/webhooks/rest/webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: rasaSenderId,
            message: text,
          }),
        });

        if (!response.ok) {
          throw new Error("Error en la comunicación con Rasa");
        }

        const data = await response.json();
        typingRow.remove();

        if (data && data.length > 0) {
          data.forEach((msg: { text?: string; custom?: { type: string } }) => {
            if (msg.text) {
              addBotMessage(msg.text);
            }
            if (msg.custom?.type === "end_chat") {
              blockChat();
            }
          });
        } else {
          addBotMessage("El bot no devolvió ninguna respuesta.");
        }
      } catch (error) {
        typingRow.remove();
        addBotMessage(
          "Error de conexión con el bot. Asegurate de tener corriendo `make dev` o, si lo levantás manualmente, `poetry run rasa run --enable-api --cors '*'` y `poetry run rasa run actions`."
        );
        console.error("Rasa Error:", error);
      } finally {
        isStreaming = false;
        syncInputUi();
        msgInput.focus();
        scrollToBottom(true);
      }
    };

    const sendSuggestion = (text: string) => {
      msgInput.value = text;
      void sendMessage();
    };

    const openClearChatModal = () => {
      clearChatModal.classList.add("is-open");
      clearChatModal.setAttribute("aria-hidden", "false");
      confirmClearChatBtn.focus();
    };

    const closeClearChatModal = () => {
      clearChatModal.classList.remove("is-open");
      clearChatModal.setAttribute("aria-hidden", "true");
    };

    const clearChat = () => {
      stopListening(true);
      chatBlocked = false;
      msgInput.disabled = false;
      msgInput.placeholder = "";
      chatArea.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "msg-center-wrap";
      chatArea.appendChild(wrap);
      wrap.appendChild(welcome);
      welcome.style.display = "flex";
      messageCount = 0;
      msgCountText.textContent = "0 mensajes";
      msgCountBadge.classList.remove("visible");
      closeClearChatModal();
      syncInputUi();
      scrollToBottom(false);
    };

    const exportChat = () => {
      const msgs = Array.from(chatArea.querySelectorAll(".msg-row"))
        .map((row) => {
          const sender = row.classList.contains("user") ? "user" : "bot";
          const text = row.querySelector(".msg-card")?.textContent ?? "";
          const time = row.querySelector(".msg-time")?.textContent ?? "";
          return `[${time}] ${sender.toUpperCase()}: ${text}`;
        })
        .join("\n\n");

      const blob = new Blob([msgs], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `chat-${Date.now()}.txt`;
      link.click();
      URL.revokeObjectURL(link.href);
    };

    const copyCode = (button: HTMLElement) => {
      const pre = button.closest(".code-block")?.querySelector("pre");
      if (!pre) return;
      navigator.clipboard.writeText(pre.textContent ?? "").then(() => {
        button.classList.add("copied");
        window.setTimeout(() => button.classList.remove("copied"), 1500);
      });
    };

    const toggleTheme = () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      window.localStorage.setItem(themeStorageKey, nextTheme);
      applyTheme(nextTheme as "light" | "dark");
    };

    const openCalendarPage = () => {
      navigate("/calendar");
    };

    const onInputResize = () => {
      msgInput.style.height = "auto";
      msgInput.style.height = `${Math.min(msgInput.scrollHeight, 140)}px`;
    };

    const onInputCount = () => {
      const len = msgInput.value.length;
      charCount.textContent = `${len} / 4000`;
      charCount.classList.toggle("visible", len > 200);
      charCount.classList.toggle("warning", len > 3500);
    };

    const updateComposerState = () => {
      const hasText = msgInput.value.trim().length > 0;
      sendBtn.classList.toggle("is-ready-to-send", hasText);
      sendBtn.classList.toggle("is-listening", isListening);
      sendBtn.disabled = isStreaming || chatBlocked;
      sendBtn.title = hasText ? "Enviar" : isListening ? "Detener dictado" : "Dictar mensaje";
      voiceHint.textContent = isListening
        ? "Escuchando..."
        : recognition
          ? "Toca el microfono para dictar"
          : "Dictado no disponible en este navegador";
      voiceHint.classList.toggle("is-active", isListening);
      voiceHint.classList.toggle("is-disabled", !recognition);
    };

    const syncInputUi = () => {
      onInputResize();
      onInputCount();
      updateComposerState();
    };

    const stopListening = (abort = false) => {
      if (!recognition || !isListening) return;
      if (abort) {
        recognition.abort();
      } else {
        recognition.stop();
      }
    };

    const startListening = () => {
      if (!recognition || isStreaming || isListening) return;
      speechBaseText = msgInput.value.trim();
      try {
        recognition.start();
      } catch (error) {
        console.error("Speech recognition start error:", error);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeClearChatModal();
        stopListening(true);
      }
      if (event.key === "Enter" && !event.shiftKey && clearChatModal.getAttribute("aria-hidden") === "true") {
        event.preventDefault();
        void sendMessage();
      }
    };

    const onSendButtonClick = () => {
      if (msgInput.value.trim()) {
        void sendMessage();
        return;
      }

      if (!recognition) {
        msgInput.focus();
        return;
      }

      if (isListening) {
        stopListening();
        return;
      }

      startListening();
    };

    if (recognition) {
      recognition.onstart = () => {
        isListening = true;
        updateComposerState();
      };

      recognition.onresult = (event) => {
        let transcript = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          transcript += event.results[index][0]?.transcript ?? "";
        }

        const nextValue = [speechBaseText, transcript.trim()].filter(Boolean).join(speechBaseText ? " " : "");
        msgInput.value = nextValue;
        syncInputUi();
      };

      recognition.onerror = (event) => {
        isListening = false;
        if (event.error !== "no-speech") {
          voiceHint.textContent = "No pude transcribir. Proba otra vez.";
        }
        updateComposerState();
      };

      recognition.onend = () => {
        isListening = false;
        speechBaseText = msgInput.value.trim();
        updateComposerState();
      };
    }

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatArea;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      scrollBottomBtn.classList.toggle("visible", !isNearBottom && messageCount > 2);
    };

    window.clearChat = openClearChatModal;
    window.exportChat = exportChat;
    window.sendSuggestion = sendSuggestion;
    window.sendMessage = sendMessage;
    window.scrollToBottom = scrollToBottom;
    window.copyCode = copyCode;
    window.openCalendarPage = openCalendarPage;
    window.toggleChatTheme = toggleTheme;

    msgInput.addEventListener("input", syncInputUi);
    msgInput.addEventListener("keydown", onKeyDown);
    sendBtn.addEventListener("click", onSendButtonClick);
    chatArea.addEventListener("scroll", onScroll);
    clearChatBackdrop.addEventListener("click", closeClearChatModal);
    closeClearChatBtn.addEventListener("click", closeClearChatModal);
    cancelClearChatBtn.addEventListener("click", closeClearChatModal);
    confirmClearChatBtn.addEventListener("click", clearChat);
    msgInput.focus();
    syncInputUi();
    scrollToBottom(false);

    return () => {
      msgInput.removeEventListener("input", syncInputUi);
      msgInput.removeEventListener("keydown", onKeyDown);
      sendBtn.removeEventListener("click", onSendButtonClick);
      chatArea.removeEventListener("scroll", onScroll);
      clearChatBackdrop.removeEventListener("click", closeClearChatModal);
      closeClearChatBtn.removeEventListener("click", closeClearChatModal);
      cancelClearChatBtn.removeEventListener("click", closeClearChatModal);
      confirmClearChatBtn.removeEventListener("click", clearChat);
      if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      }
      delete window.clearChat;
      delete window.exportChat;
      delete window.sendSuggestion;
      delete window.sendMessage;
      delete window.scrollToBottom;
      delete window.copyCode;
      delete window.openCalendarPage;
      delete window.toggleChatTheme;
      if (audioCtx && audioCtx.state !== "closed") {
        void audioCtx.close();
      }
    };
  }, [bodyHtml, navigate]);

  return <InjectedPage styleText={styleText} bodyHtml={bodyHtml} bodyClassName="chat-page-react" />;
}
