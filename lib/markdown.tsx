// Minimal, safe markdown. Strategy: escape ALL HTML first, then introduce only
// our own whitelisted tags. Raw HTML in user input can never survive, so there
// is no HTML-injection surface. Supports: **bold**, *italic*, `inline code`,
// ```fenced code```, [text](http/https/mailto), and > blockquotes.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(text: string): string {
  let s = escapeHtml(text);
  // inline code first so its contents aren't further formatted
  s = s.replace(/`([^`]+)`/g, (_m, c) => `<code class="md-code">${c}</code>`);
  // links: only http(s) and mailto
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, t, u) =>
      `<a href="${u}" rel="nofollow noopener noreferrer" target="_blank">${t}</a>`,
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return s;
}

function renderBlocks(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join("<br>")}</p>`);
      para = [];
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      out.push(
        `<blockquote class="md-quote">${quote.map(inline).join("<br>")}</blockquote>`,
      );
      quote = [];
    }
  };

  for (const line of lines) {
    if (/^\s*>\s?/.test(line)) {
      flushPara();
      quote.push(line.replace(/^\s*>\s?/, ""));
    } else if (line.trim() === "") {
      flushPara();
      flushQuote();
    } else {
      flushQuote();
      para.push(line);
    }
  }
  flushPara();
  flushQuote();
  return out.join("");
}

export function renderMarkdown(src: string): string {
  // Split on fenced code blocks; odd indices are code.
  const parts = src.replace(/\r\n/g, "\n").split(/```/);
  let html = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      html += `<pre class="md-pre"><code>${escapeHtml(parts[i])}</code></pre>`;
    } else {
      html += renderBlocks(parts[i]);
    }
  }
  return html;
}

// Server component that renders sanitized markdown.
export function Markdown({ source }: { source: string }) {
  return (
    <div
      className="md-body"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
