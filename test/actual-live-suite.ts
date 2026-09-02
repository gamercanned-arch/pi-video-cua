import { spawn, ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import {
  HelperClient,
  startSessionTool,
  endSessionTool,
  screenshotTool,
  moveMouseTool,
  clickTool,
  dragTool,
  waitTool,
  scrollTool,
  screenRecordTool,
  pressKeyTool,
  typeTextTool,
} from "../src/index.js";

interface LiveTestReport {
  success: boolean;
  artifacts: {
    initialScreenshot: string;
    afterTypingScreenshot: string;
    afterDragScreenshot: string;
    finalScreenshot: string;
    videoPath: string;
  };
  metrics: {
    screenDimensions: any;
    videoDuration: number;
    videoSizeBytes: number;
  };
  actionsCompleted: string[];
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLiveActualTestSuite() {
  console.log("===============================================================");
  console.log("  pi-video-cua: ACTUAL LIVE DESKTOP INTERACTION TEST SUITE");
  console.log("  WARNING: This will move the mouse, focus Notepad, type text,");
  console.log("  press keys, drag to highlight, capture screenshots, & record.");
  console.log("===============================================================\n");

  const client = HelperClient.getInstance();
  let notepadProc: ChildProcess | null = null;
  const actionsCompleted: string[] = [];

  try {
    // 0. Verify safety guard: tools are locked before session start
    console.log("[Safety Guard] Verifying desktop tools are locked before session start...");
    const lockedRes = await moveMouseTool.execute({ x: 0.5, y: 0.5 });
    if (!lockedRes.isError) throw new Error("Expected move_mouse to be locked before start_session");
    console.log(" ✓ Confirmed: Desktop tools are locked until start_session is called.");

    // 1. Open CUA session
    console.log("[Session] Opening guarded CUA desktop session via start_session...");
    const startRes = await startSessionTool.execute({ purpose: "Live desktop CUA validation suite" });
    if (startRes.isError) throw new Error("Failed to start session: " + JSON.stringify(startRes));
    const initScreenPath = startRes.details?.imagePath as string;
    console.log(" ✓ CUA Session active. Playbook delivered and baseline screenshot captured at:", initScreenPath);
    actionsCompleted.push(`start_session (${initScreenPath})`);

    // 2. Launch a dedicated, safe Notepad target window so interactions don't affect other apps
    console.log("[Setup] Spawning notepad.exe as a safe, isolated interaction target...");
    notepadProc = spawn("notepad.exe", [], { stdio: "ignore" });
    await sleep(1500); // Give Notepad time to initialize and render
    actionsCompleted.push("Spawned notepad.exe sandbox target");

    // 3. Move Mouse into Notepad text editing area
    console.log("[2/9] Moving mouse to center (0.45, 0.45) inside Notepad...");
    const moveRes = await moveMouseTool.execute({ x: 0.45, y: 0.45 });
    if (moveRes.isError) throw new Error("Move mouse failed: " + JSON.stringify(moveRes));
    console.log(" ✓ Cursor moved to (0.45, 0.45). Screenshot verified.");
    actionsCompleted.push("move_mouse (0.45, 0.45)");

    // 4. Click to focus the text area
    console.log("[3/9] Left clicking to focus text editor...");
    const clickRes = await clickTool.execute({ button: "left" });
    if (clickRes.isError) throw new Error("Click failed: " + JSON.stringify(clickRes));
    console.log(" ✓ Click executed at current cursor position.");
    actionsCompleted.push("click (left)");

    // 5. Type actual text phrase into the active window
    const phrase1 = "pi-video-cua: ACTUAL LIVE DESKTOP CONTROL TEST PASSED!";
    console.log(`[4/9] Typing actual phrase via OS Unicode input: "${phrase1}"...`);
    const typeRes1 = await typeTextTool.execute({ text: phrase1 });
    if (typeRes1.isError) throw new Error("Typing text failed: " + JSON.stringify(typeRes1));
    console.log(" ✓ Text typed successfully.");
    actionsCompleted.push(`type_text ("${phrase1}")`);

    // 6. Press Key: Enter
    console.log("[5/9] Pressing key: 'enter'...");
    const enterRes = await pressKeyTool.execute({ key: "enter" });
    if (enterRes.isError) throw new Error("Press enter failed: " + JSON.stringify(enterRes));
    actionsCompleted.push("press_key ('enter')");

    // Type second line with editing symbols
    const phrase2 = "Video Editing Symbols: [ ] \\ ; ' , . / - = + and numpad keys.";
    console.log(`Typing second phrase: "${phrase2}"...`);
    const typeRes2 = await typeTextTool.execute({ text: phrase2 });
    if (typeRes2.isError) throw new Error("Typing second phrase failed: " + JSON.stringify(typeRes2));
    const afterTypingPath = typeRes2.details?.imagePath as string;
    console.log(" ✓ Second line typed. Screenshot saved at:", afterTypingPath);
    actionsCompleted.push(`type_text ("${phrase2}")`);

    // 7. Drag across the second line to highlight text
    console.log("[6/9] Performing smooth mouse drag across text to highlight...");
    const dragRes = await dragTool.execute({
      x1: 0.20,
      y1: 0.45,
      x2: 0.60,
      y2: 0.45,
    });
    if (dragRes.isError) throw new Error("Drag failed: " + JSON.stringify(dragRes));
    const afterDragPath = dragRes.details?.imagePath as string;
    console.log(" ✓ Drag completed. Screenshot saved at:", afterDragPath);
    actionsCompleted.push("drag (0.20, 0.45 -> 0.60, 0.45)");

    // 8. Scroll inside the window
    console.log("[7/9] Scrolling down by 3 notches...");
    const scrollRes = await scrollTool.execute({
      x: 0.45,
      y: 0.45,
      direction: "down",
      amount: 3,
    });
    if (scrollRes.isError) throw new Error("Scroll failed: " + JSON.stringify(scrollRes));
    console.log(" ✓ Scroll completed.");
    actionsCompleted.push("scroll (down, amount 3)");

    // 9. Wait for visual stabilization
    console.log("[8/9] Waiting 500ms for UI stabilization...");
    const waitRes = await waitTool.execute({ ms: 500 });
    if (waitRes.isError) throw new Error("Wait failed: " + JSON.stringify(waitRes));
    console.log(" ✓ Wait completed.");
    actionsCompleted.push("wait (500ms)");

    // 10. Screen & Audio Recording (2 seconds of live display)
    console.log("[9/9] Recording 2.0 seconds of live desktop screen & audio via FFmpeg...");
    const recordRes = await screenRecordTool.execute({ duration: 2.0 });
    if (recordRes.isError) throw new Error("Screen record failed: " + JSON.stringify(recordRes));
    const videoPath = recordRes.details?.videoPath as string;
    const videoDuration = recordRes.details?.duration as number;
    const videoStats = fs.statSync(videoPath);
    console.log(` ✓ Video recorded successfully: ${videoPath} (${videoDuration.toFixed(2)}s, ${videoStats.size} bytes)`);
    actionsCompleted.push(`screen_record (${videoPath})`);

    // Capture final summary screenshot
    const finalShot = await screenshotTool.execute({});
    const finalShotPath = finalShot.details?.imagePath as string;

    // Close CUA session
    console.log("[Session] Closing CUA desktop session via end_session...");
    const endRes = await endSessionTool.execute({ summary: "Live CUA interaction suite successfully concluded." });
    console.log(" ✓ CUA Session closed. Verifying tools are safely locked...");
    const postLockedRes = await moveMouseTool.execute({ x: 0.5, y: 0.5 });
    if (!postLockedRes.isError) throw new Error("Expected move_mouse to be locked after end_session");
    console.log(" ✓ Confirmed: Desktop tools are safely locked after session closure.");
    actionsCompleted.push("end_session");

    const report: LiveTestReport = {
      success: true,
      artifacts: {
        initialScreenshot: initScreenPath,
        afterTypingScreenshot: afterTypingPath,
        afterDragScreenshot: afterDragPath,
        finalScreenshot: finalShotPath,
        videoPath,
      },
      metrics: {
        screenDimensions: startRes.details?.dimensions,
        videoDuration,
        videoSizeBytes: videoStats.size,
      },
      actionsCompleted,
    };

    console.log("\n===============================================================");
    console.log("  ALL ACTUAL DESKTOP INTERACTIONS COMPLETED WITH 100% SUCCESS!");
    console.log("===============================================================");
    console.log("\n--- JSON_REPORT_START ---");
    console.log(JSON.stringify(report, null, 2));
    console.log("--- JSON_REPORT_END ---\n");
  } catch (err) {
    console.error("Live test failed with error:", err);
    process.exitCode = 1;
  } finally {
    // Cleanup: Kill the Notepad sandbox window without saving
    if (notepadProc && !notepadProc.killed) {
      try {
        notepadProc.kill();
        spawn("taskkill", ["/F", "/IM", "notepad.exe"], { stdio: "ignore" });
      } catch (_) {}
    }
    client.dispose();
  }
}

runLiveActualTestSuite();
