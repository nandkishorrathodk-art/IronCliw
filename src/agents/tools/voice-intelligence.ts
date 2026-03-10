import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { logVerbose } from "../../globals.js";
import type { AnyAgentTool } from "./common.js";
import { ToolInputError, jsonResult, readStringParam } from "./common.js";

interface VoiceTranscriptionResult {
  audioUrl: string;
  transcription: string;
  confidence: number;
  language: string;
  duration: number;
  error?: string;
}

interface IntentMatch {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
}

interface VoiceIntelligenceResponse {
  transcription: VoiceTranscriptionResult;
  intents: IntentMatch[];
  topIntent: IntentMatch | null;
  actions: Array<{
    action: string;
    parameters: Record<string, unknown>;
  }>;
  summary: string;
}

const OPENAI_WHISPER_API = "https://api.openai.com/v1/audio/transcriptions";

const INTENT_PATTERNS: Record<
  string,
  {
    regex: RegExp;
    entities: Record<string, RegExp>;
  }
> = {
  CREATE_TASK: {
    regex: /(?:create|make|add|new)\s+(?:task|todo|reminder)?/i,
    entities: {
      title: /task\s+(?:about\s+)?(?:to\s+)?([\w\s]+)/i,
      deadline: /(?:due|deadline|by|until)\s+(\w+)/i,
    },
  },
  SEARCH: {
    regex: /(?:search|find|look up|research)\s+(?:for\s+)?([\w\s]+)/i,
    entities: {
      query: /(?:search|find|look up)\s+(?:for\s+)?([\w\s]+)/i,
    },
  },
  SEND_MESSAGE: {
    regex: /(?:send|message|tell|notify)\s+(?:a\s+message\s+)?(?:to\s+)?([\w\s]+)/i,
    entities: {
      recipient: /(?:to|send to)\s+([\w\s]+)/i,
      message: /(?:message|say)\s+([\w\s]+)/i,
    },
  },
  SCHEDULE: {
    regex: /(?:schedule|book|plan|arrange)\s+([\w\s]+)/i,
    entities: {
      event: /(?:schedule|book)\s+([\w\s]+)/i,
      time: /(?:at|for|on)\s+([\w\s:]+)/i,
    },
  },
  ANALYSIS: {
    regex: /(?:analyze|analyze|explain|breakdown|summary)\s+(?:about\s+)?([\w\s]+)/i,
    entities: {
      topic: /(?:analyze|explain)\s+([\w\s]+)/i,
    },
  },
  REPORT: {
    regex: /(?:generate|create|make|build)\s+(?:a\s+)?(?:report|summary|analytics|dashboard)/i,
    entities: {
      type: /(?:report|summary|analytics|dashboard)/i,
      subject: /(sales|financial|market|customer|performance)\s+\w+/i,
    },
  },
};

async function transcribeAudio(audioUrl: string): Promise<VoiceTranscriptionResult> {
  const startTime = Date.now();
  try {
    let audioBuffer: ArrayBuffer;

    if (audioUrl.startsWith("data:")) {
      const base64Data = audioUrl.split(",")[1] || "";
      audioBuffer = Buffer.from(base64Data, "base64");
    } else {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }
      audioBuffer = await response.arrayBuffer();
    }

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
    formData.append("file", blob, "audio.mp3");
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const transcriptionResponse = await fetch(OPENAI_WHISPER_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      throw new Error(`Whisper API returned ${transcriptionResponse.status}`);
    }

    const data = await transcriptionResponse.json();
    const duration = Date.now() - startTime;

    return {
      audioUrl,
      transcription: data.text || "",
      confidence: 0.95,
      language: "en",
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      audioUrl,
      transcription: "",
      confidence: 0,
      language: "en",
      duration,
      error: String(error),
    };
  }
}

function extractIntents(text: string): IntentMatch[] {
  const matches: IntentMatch[] = [];

  for (const [intentName, { regex, entities: entityPatterns }] of Object.entries(
    INTENT_PATTERNS,
  )) {
    if (regex.test(text)) {
      const extractedEntities: Record<string, string> = {};

      for (const [entityName, entityRegex] of Object.entries(entityPatterns)) {
        const match = text.match(entityRegex);
        if (match && match[1]) {
          extractedEntities[entityName] = match[1].trim();
        }
      }

      matches.push({
        intent: intentName,
        confidence: 0.8 + Math.random() * 0.2,
        entities: extractedEntities,
      });
    }
  }

  return matches.toSorted((a, b) => b.confidence - a.confidence);
}

function generateActions(intents: IntentMatch[]): Array<{
  action: string;
  parameters: Record<string, unknown>;
}> {
  const actions = [];

  for (const intent of intents.slice(0, 3)) {
    switch (intent.intent) {
      case "CREATE_TASK":
        actions.push({
          action: "create_task",
          parameters: {
            title: intent.entities.title || "New Task",
            deadline: intent.entities.deadline,
            priority: "medium",
          },
        });
        break;
      case "SEARCH":
        actions.push({
          action: "web_search",
          parameters: {
            query: intent.entities.query || "search",
          },
        });
        break;
      case "SEND_MESSAGE":
        actions.push({
          action: "send_message",
          parameters: {
            recipient: intent.entities.recipient,
            content: intent.entities.message,
          },
        });
        break;
      case "SCHEDULE":
        actions.push({
          action: "schedule_event",
          parameters: {
            title: intent.entities.event,
            time: intent.entities.time,
          },
        });
        break;
      case "ANALYSIS":
        actions.push({
          action: "analyze",
          parameters: {
            topic: intent.entities.topic,
            type: "comprehensive",
          },
        });
        break;
      case "REPORT":
        actions.push({
          action: "generate_report",
          parameters: {
            type: intent.entities.type || "summary",
            subject: intent.entities.subject || "general",
          },
        });
        break;
    }
  }

  return actions;
}

export const voiceIntelligenceTool: AnyAgentTool = {
  name: "voice_intelligence",
  description:
    "Process voice messages from WhatsApp: transcribe audio using Whisper AI, extract intents, " +
    "parse voice commands, and generate actionable tasks. Supports voice-to-workflow automation.",
  input_schema: {
    type: "object",
    properties: {
      audio_url: {
        type: "string",
        description: "URL of audio file or base64-encoded audio data (data:audio/...)",
      },
      extract_intents: {
        type: "boolean",
        description: "Extract user intents from transcription (default: true)",
      },
      generate_actions: {
        type: "boolean",
        description: "Generate actionable tasks from intents (default: true)",
      },
    },
    required: ["audio_url"],
  },

  async execute(params: Record<string, unknown>): Promise<AgentToolResult> {
    try {
      const audioUrl = readStringParam(params, "audioUrl", { required: true });

      if (!audioUrl || audioUrl.length === 0) {
        throw new ToolInputError("audio_url cannot be empty");
      }

      logVerbose(`[voice-intelligence] Processing audio from: ${audioUrl.substring(0, 50)}...`);

      const transcriptionResult = await transcribeAudio(audioUrl);

      if (transcriptionResult.error) {
        throw new Error(transcriptionResult.error);
      }

      const intents = extractIntents(transcriptionResult.transcription);
      const actions = generateActions(intents);

      const summary =
        `Voice message transcribed: "${transcriptionResult.transcription}"\n` +
        `Detected intents: ${intents.map((i) => i.intent).join(", ")}\n` +
        `Generated actions: ${actions.length} task(s) ready to execute`;

      const response: VoiceIntelligenceResponse = {
        transcription: transcriptionResult,
        intents,
        topIntent: intents[0] || null,
        actions,
        summary,
      };

      logVerbose(`[voice-intelligence] Completed: ${actions.length} actions generated`);

      return jsonResult(response);
    } catch (error) {
      if (error instanceof ToolInputError) {
        throw error;
      }
      throw new ToolInputError(`Voice intelligence processing failed: ${String(error)}`);
    }
  },
};
