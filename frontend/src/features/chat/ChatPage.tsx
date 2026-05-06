import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import botMascotUrl from "../../shared/assets/bot-mascot.svg?url";
import { InjectedPage } from "../../shared/components/InjectedPage";
import { chatTemplate } from "./chatTemplate";

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
    const scrollBottomBtn = document.getElementById("scrollBottomBtn") as HTMLButtonElement | null;
    const msgCountBadge = document.getElementById("msgCountBadge") as HTMLDivElement | null;
    const msgCountText = document.getElementById("msgCountText") as HTMLSpanElement | null;
    const themeLabel = document.getElementById("themeLabel") as HTMLSpanElement | null;

    if (
      !chatArea ||
      !welcome ||
      !msgInput ||
      !sendBtn ||
      !charCount ||
      !scrollBottomBtn ||
      !msgCountBadge ||
      !msgCountText ||
      !themeLabel
    ) {
      return;
    }

    const mascotSrc = botMascotUrl;
    let messageCount = 0;
    let isStreaming = false;
    const themeStorageKey = "agenda-theme";

    const applyTheme = (theme: "light" | "dark") => {
      document.documentElement.dataset.theme = theme;
      themeLabel.textContent = theme === "dark" ? "Modo oscuro" : "Modo claro";
    };

    const getSavedTheme = (): "light" | "dark" => {
      const saved = window.localStorage.getItem(themeStorageKey);
      return saved === "dark" ? "dark" : "light";
    };

    applyTheme(getSavedTheme());



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



    const sendMessage = async () => {
      const text = msgInput.value.trim();
      if (!text || isStreaming) return;

      playSendSound();
      welcome.style.display = "none";
      addUserMessage(text);
      msgInput.value = "";
      msgInput.style.height = "auto";
      charCount.classList.remove("visible");
      sendBtn.disabled = true;
      isStreaming = true;

      const typingRow = addTypingIndicator();

      try {
        const response = await fetch("http://127.0.0.1:5005/webhooks/rest/webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: "user",
            message: text,
          }),
        });

        if (!response.ok) {
          throw new Error("Error en la comunicación con Rasa");
        }

        const data = await response.json();
        typingRow.remove();

        if (data && data.length > 0) {
          data.forEach((msg: { text: string }) => {
            if (msg.text) {
              addBotMessage(msg.text);
            }
          });
        } else {
          addBotMessage("El bot no devolvió ninguna respuesta.");
        }
      } catch (error) {
        typingRow.remove();
        addBotMessage(
          "Error de conexión con el bot. Asegurate de que Rasa esté corriendo con el comando: `poetry run rasa run --enable-api --cors '*'`"
        );
        console.error("Rasa Error:", error);
      } finally {
        isStreaming = false;
        sendBtn.disabled = false;
        msgInput.focus();
        scrollToBottom(true);
      }
    };

    const sendSuggestion = (text: string) => {
      msgInput.value = text;
      sendMessage();
    };

    const clearChat = () => {
      if (messageCount === 0) return;
      if (!window.confirm("¿Limpiar todos los mensajes?")) return;
      chatArea.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "msg-center-wrap";
      chatArea.appendChild(wrap);
      wrap.appendChild(welcome);
      welcome.style.display = "flex";
      messageCount = 0;
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    };

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatArea;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      scrollBottomBtn.classList.toggle("visible", !isNearBottom && messageCount > 2);
    };

    window.clearChat = clearChat;
    window.exportChat = exportChat;
    window.sendSuggestion = sendSuggestion;
    window.sendMessage = sendMessage;
    window.scrollToBottom = scrollToBottom;
    window.copyCode = copyCode;
    window.openCalendarPage = openCalendarPage;
    window.toggleChatTheme = toggleTheme;

    msgInput.addEventListener("input", onInputResize);
    msgInput.addEventListener("input", onInputCount);
    msgInput.addEventListener("keydown", onKeyDown);
    chatArea.addEventListener("scroll", onScroll);
    msgInput.focus();
    scrollToBottom(false);

    return () => {
      msgInput.removeEventListener("input", onInputResize);
      msgInput.removeEventListener("input", onInputCount);
      msgInput.removeEventListener("keydown", onKeyDown);
      chatArea.removeEventListener("scroll", onScroll);
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
