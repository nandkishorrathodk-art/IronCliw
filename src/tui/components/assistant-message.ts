import { Container, Spacer } from "@mariozechner/pi-tui";
import { markdownTheme, theme } from "../theme/theme.js";
import { HyperlinkMarkdown } from "./hyperlink-markdown.js";

export class AssistantMessageComponent extends Container {
  private body: HyperlinkMarkdown;
  private targetText = "";
  private currentText = "";
  private timer: NodeJS.Timeout | null = null;

  constructor(text: string) {
    super();
    this.targetText = text;
    this.currentText = text; // Initial text shown immediately (e.g. from history)
    this.body = new HyperlinkMarkdown(this.currentText, 1, 0, markdownTheme, {
      color: (line) => theme.assistantText(line),
    });
    this.addChild(new Spacer(1));
    this.addChild(this.body);
  }

  setText(text: string) {
    if (this.targetText === text) return;
    this.targetText = text;
    
    if (!this.timer) {
      this.startTypewriter();
    }
  }

  private startTypewriter() {
    this.timer = setInterval(() => {
      if (this.currentText.length < this.targetText.length) {
        // Add next chunk (can be multiple characters for speed)
        const diff = this.targetText.length - this.currentText.length;
        const jump = Math.ceil(diff / 5); // Speed up if far behind
        this.currentText = this.targetText.substring(0, this.currentText.length + jump);
        this.body.setText(this.currentText);
      } else if (this.currentText.length > this.targetText.length) {
        // Handle cases where text might be replaced with shorter text (rare for assistant streaming)
        this.currentText = this.targetText;
        this.body.setText(this.currentText);
      } else {
        clearInterval(this.timer!);
        this.timer = null;
      }
    }, 20); // 50fps-ish typing
  }
}
