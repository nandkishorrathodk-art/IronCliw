import fs from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("burp/knowledge");

/**
 * BurpKnowledgeBase allows IronCliw to read tutorials and documentation
 * to learn how to operate Burp Suite features.
 */
export class BurpKnowledgeBase {
  private tutorialsDir: string = "docs/burp-tutorials";

  /**
   * Searches for a tutorial related to a specific Burp task.
   */
  async consultTutorial(task: string): Promise<string | null> {
    log.info(`Consulting tutorials for task: ${task}`);
    
    try {
      const files = await fs.readdir(this.tutorialsDir);
      // Simple matching for now (can be upgraded to semantic search with embeddings)
      const bestMatch = files.find(f => task.toLowerCase().includes(f.replace(".md", "").toLowerCase()));
      
      if (bestMatch) {
        const content = await fs.readFile(path.join(this.tutorialsDir, bestMatch), "utf-8");
        log.info(`Found relevant tutorial: ${bestMatch}`);
        return content;
      }
    } catch (err) {
      log.error("Failed to read tutorials directory.");
    }

    // If no local tutorial, we could theoretically fetch from PortSwigger docs
    return null;
  }

  /**
   * Asks the AI to translate a text tutorial into specific GUI actions.
   */
  async extractActionsFromTutorial(tutorial: string, task: string) {
    log.info("AI is extracting step-by-step actions from the tutorial...");
    
    // This would be a call to the LLM (Fireworks Kimi)
    // Prompt: "Based on this tutorial, list the keyboard shortcuts and click coordinates 
    // needed to perform [task] in Burp Suite Pro."
    
    return {
      steps: [
        "Press Alt+P to go to Proxy",
        "Click on 'HTTP history' sub-tab",
        "Right-click the target request",
        "Press Ctrl+R to send to Repeater"
      ],
      shortcuts: ["%p", "^r"]
    };
  }
}

export const burpKnowledge = new BurpKnowledgeBase();
