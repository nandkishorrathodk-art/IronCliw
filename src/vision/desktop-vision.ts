import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { scopeManager } from "../security/scope-manager.js";

const log = createSubsystemLogger("vision/desktop");

/**
 * DesktopVision provides methods to capture screenshots of the host OS.
 */
export class DesktopVision {
  /**
   * Captures a full screenshot of the primary monitor.
   * @param outputPath Path to save the PNG file.
   */
  async captureScreenshot(outputPath: string): Promise<string> {
    const absolutePath = path.resolve(outputPath);
    const outDir = path.dirname(absolutePath);
    const tmpDir = os.tmpdir();

    const isTmpDir = outDir === tmpDir || outDir.startsWith(tmpDir + path.sep);
    if (!isTmpDir && !(await scopeManager.isPathAuthorized(outDir))) {
      throw new Error(`Unauthorized path for screenshot: ${outDir}`);
    }

    log.info(`Capturing desktop screenshot to: ${absolutePath}`);

    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $top    = $screen.Bounds.Top
      $left   = $screen.Bounds.Left
      $width  = $screen.Bounds.Width
      $height = $screen.Bounds.Height
      $bitmap = New-Object System.Drawing.Bitmap $width, $height
      $graphic = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphic.CopyFromScreen($left, $top, 0, 0, $bitmap.Size)
      $bitmap.Save("${absolutePath.replace(/\\/g, "\\\\")}", [System.Drawing.Imaging.ImageFormat]::Png)
      $graphic.Dispose()
      $bitmap.Dispose()
    `.trim();

    return new Promise((resolve, reject) => {
      const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript]);

      ps.on("close", (code) => {
        if (code === 0) {
          resolve(absolutePath);
        } else {
          reject(new Error(`PowerShell screenshot failed with code ${code}`));
        }
      });

      ps.on("error", (err) => {
        reject(new Error(`Failed to start PowerShell: ${err.message}`));
      });
    });
  }

  /**
   * Captures a specific region of the screen.
   */
  async captureRegion(outputPath: string, x: number, y: number, width: number, height: number): Promise<string> {
    const absolutePath = path.resolve(outputPath);
    const outDir = path.dirname(absolutePath);
    const tmpDir = os.tmpdir();

    const isTmpDir = outDir === tmpDir || outDir.startsWith(tmpDir + path.sep);
    if (!isTmpDir && !(await scopeManager.isPathAuthorized(outDir))) {
      throw new Error(`Unauthorized path for screenshot: ${outDir}`);
    }

    const psScript = `
      Add-Type -AssemblyName System.Drawing
      $bitmap = New-Object System.Drawing.Bitmap ${width}, ${height}
      $graphic = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphic.CopyFromScreen(${x}, ${y}, 0, 0, $bitmap.Size)
      $bitmap.Save("${absolutePath.replace(/\\/g, "\\\\")}", [System.Drawing.Imaging.ImageFormat]::Png)
      $graphic.Dispose()
      $bitmap.Dispose()
    `.trim();

    return new Promise((resolve, reject) => {
      const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript]);
      ps.on("close", (code) => code === 0 ? resolve(absolutePath) : reject(new Error("Region capture failed")));
      ps.on("error", (err) => reject(err));
    });
  }
}

export const desktopVision = new DesktopVision();
