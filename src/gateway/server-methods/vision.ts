import { VisionEngine } from "../../vision/vision-engine.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

const visionEngine = new VisionEngine();

export const visionHandlers: GatewayRequestHandlers = {
  "vision.analyze": async ({ params, respond }) => {
    const { imagePath } = params as { imagePath: string };

    if (!imagePath) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "imagePath is required"));
      return;
    }

    try {
      const result = await visionEngine.analyzeScreenshot(imagePath);
      respond(true, result);
    } catch (err: unknown) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, (err as Error).message));
    }
  },
  "vision.windows": async ({ respond }) => {
    try {
      const windows = await visionEngine.detectMultiWindow();
      respond(true, { windows });
    } catch (err: unknown) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, (err as Error).message));
    }
  },
};
