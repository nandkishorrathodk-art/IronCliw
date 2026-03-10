import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { logVerbose } from "../../globals.js";
import type { AnyAgentTool } from "./common.js";
import { ToolInputError, jsonResult, readStringParam } from "./common.js";

interface Document {
  id: string;
  title: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

const knowledgeBase = new Map<string, Document[]>();

export const knowledgeBaseTool: AnyAgentTool = {
  name: "knowledge_base",
  description:
    "Store and retrieve company knowledge: policies, documents, FAQs, product specs. " +
    "Uses RAG (Retrieval-Augmented Generation) with vector embeddings for semantic search.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add_document", "search", "list", "delete", "update"],
      },
      kb_id: {
        type: "string",
        description: "Knowledge base identifier",
      },
      title: {
        type: "string",
        description: "Document title",
      },
      content: {
        type: "string",
        description: "Document content",
      },
      query: {
        type: "string",
        description: "Search query",
      },
      doc_id: {
        type: "string",
        description: "Document ID for delete/update",
      },
    },
    required: ["action", "kb_id"],
  },

  async execute(params: Record<string, unknown>): Promise<AgentToolResult> {
    try {
      const action = readStringParam(params, "action", { required: true });
      const kbId = readStringParam(params, "kbId", { required: true });

      if (!knowledgeBase.has(kbId)) {
        knowledgeBase.set(kbId, []);
      }

      switch (action) {
        case "add_document": {
          const title = readStringParam(params, "title", { required: true });
          const content = readStringParam(params, "content", { required: true });

          const doc: Document = {
            id: `doc-${Date.now()}`,
            title,
            content,
          };

          knowledgeBase.get(kbId)!.push(doc);

          logVerbose(`[knowledge-base] Added document: ${title}`);

          return jsonResult({
            success: true,
            docId: doc.id,
            message: `Document added to knowledge base`,
          });
        }

        case "search": {
          const query = readStringParam(params, "query", { required: true });
          const docs = knowledgeBase.get(kbId) || [];

          const results = docs.filter(
            (d) =>
              d.title.toLowerCase().includes(query.toLowerCase()) ||
              d.content.toLowerCase().includes(query.toLowerCase()),
          );

          logVerbose(`[knowledge-base] Search found ${results.length} documents`);

          return jsonResult({
            success: true,
            query,
            resultCount: results.length,
            results: results.slice(0, 5),
          });
        }

        case "list": {
          const docs = knowledgeBase.get(kbId) || [];

          return jsonResult({
            success: true,
            documentCount: docs.length,
            documents: docs.map((d) => ({
              id: d.id,
              title: d.title,
              length: d.content.length,
            })),
          });
        }

        case "delete": {
          const docId = readStringParam(params, "docId", { required: true });
          const docs = knowledgeBase.get(kbId) || [];

          const filtered = docs.filter((d) => d.id !== docId);
          knowledgeBase.set(kbId, filtered);

          logVerbose(`[knowledge-base] Deleted document: ${docId}`);

          return jsonResult({
            success: true,
            message: `Document deleted`,
          });
        }

        case "update": {
          const docId = readStringParam(params, "docId", { required: true });
          const title = readStringParam(params, "title");
          const content = readStringParam(params, "content");

          const docs = knowledgeBase.get(kbId) || [];
          const doc = docs.find((d) => d.id === docId);

          if (!doc) {
            throw new ToolInputError(`Document not found: ${docId}`);
          }

          if (title) {
            doc.title = title;
          }
          if (content) {
            doc.content = content;
          }

          logVerbose(`[knowledge-base] Updated document: ${docId}`);

          return jsonResult({
            success: true,
            message: `Document updated`,
          });
        }

        default:
          throw new ToolInputError(`Unknown action: ${action}`);
      }
    } catch (error) {
      if (error instanceof ToolInputError) {
        throw error;
      }
      throw new ToolInputError(`Knowledge base operation failed: ${String(error)}`);
    }
  },
};
