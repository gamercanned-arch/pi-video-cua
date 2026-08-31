import {
  HelperClient,
  tools,
  screenshotTool,
  dragTool,
  pressKeyTool,
} from "../src/index.js";

async function runTests() {
  console.log("=================================================");
  console.log("  Running Comprehensive Fix Verification Suite");
  console.log("=================================================\n");

  const client = HelperClient.getInstance();

  try {
    // 1. Verify Process Listener Registration
    console.log("1. Verifying Process Event Listeners...");
    const exitListenersBefore = process.listenerCount("exit");
    const sigintListenersBefore = process.listenerCount("SIGINT");
    const sigtermListenersBefore = process.listenerCount("SIGTERM");
    console.log(`   exit: ${exitListenersBefore}, SIGINT: ${sigintListenersBefore}, SIGTERM: ${sigtermListenersBefore}`);
    if (sigintListenersBefore === 0 || sigtermListenersBefore === 0) {
      throw new Error("Expected SIGINT and SIGTERM listeners to be registered");
    }

    // 2. Test Screenshot with Cached DXGI Duplication
    console.log("\n2. Testing Screenshot & DXGI caching performance...");
    
    // Warm-up / First capture
    const t0 = Date.now();
    const firstScreen = await screenshotTool.execute({});
    const firstDuration = Date.now() - t0;
    console.log(`   First screenshot took: ${firstDuration}ms (isError: ${firstScreen.isError})`);
    if (firstScreen.isError) throw new Error("First screenshot failed");

    // Second capture (should use cached DXGI context)
    const t1 = Date.now();
    const secondScreen = await screenshotTool.execute({});
    const secondDuration = Date.now() - t1;
    console.log(`   Second screenshot (cached) took: ${secondDuration}ms (isError: ${secondScreen.isError})`);
    if (secondScreen.isError) throw new Error("Second screenshot failed");

    // Third capture
    const t2 = Date.now();
    const thirdScreen = await screenshotTool.execute({});
    const thirdDuration = Date.now() - t2;
    console.log(`   Third screenshot (cached) took: ${thirdDuration}ms (isError: ${thirdScreen.isError})`);
    if (thirdScreen.isError) throw new Error("Third screenshot failed");

    // 3. Test Drag with MouseUpGuard
    console.log("\n3. Testing Drag tool (RAII MouseUpGuard)...");
    const dragRes = await dragTool.execute({ x1: 0.4, y1: 0.4, x2: 0.5, y2: 0.5 });
    console.log(`   Drag status: ${dragRes.isError ? "FAILED" : "SUCCESS"}`);
    if (dragRes.isError) throw new Error(`Drag failed: ${JSON.stringify(dragRes)}`);

    // 4. Test Key Symbols & Video Editing Keys
    console.log("\n4. Testing Symbol Keys & Video Editing Shortcut Keys...");

    const symbolKeys = [
      "[", "]", "{", "}", "\\", "|", ";", ":", "'", "\"",
      ",", "<", ".", ">", "/", "?", "`", "~", "-", "_", "=", "+",
      "ctrl+[", "ctrl+]", "ctrl+=", "ctrl+-", "ctrl++", "alt+["
    ];

    for (const key of symbolKeys) {
      const res = await pressKeyTool.execute({ key });
      if (res.isError) {
        throw new Error(`Failed to press symbol key '${key}': ${JSON.stringify(res)}`);
      }
      console.log(`   ✓ Key '${key}' -> SUCCESS`);
    }

    // 5. Test Numpad Keys
    console.log("\n5. Testing Numpad Keys...");
    const numpadKeys = [
      "numpad0", "numpad1", "numpad2", "numpad3", "numpad4",
      "numpad5", "numpad6", "numpad7", "numpad8", "numpad9",
      "numpad_enter", "numpad_plus", "numpad_minus", "numpad_multiply",
      "numpad_divide", "numpad_dot"
    ];

    for (const key of numpadKeys) {
      const res = await pressKeyTool.execute({ key });
      if (res.isError) {
        throw new Error(`Failed to press numpad key '${key}': ${JSON.stringify(res)}`);
      }
      console.log(`   ✓ Numpad Key '${key}' -> SUCCESS`);
    }

    // 6. Test Media / Volume Keys
    console.log("\n6. Testing Media / Volume Keys...");
    const mediaKeys = [
      "volume_up", "volume_down", "volume_mute",
      "play_pause", "media_next", "media_prev"
    ];

    for (const key of mediaKeys) {
      const res = await pressKeyTool.execute({ key });
      if (res.isError) {
        throw new Error(`Failed to press media key '${key}': ${JSON.stringify(res)}`);
      }
      console.log(`   ✓ Media Key '${key}' -> SUCCESS`);
    }

    // 7. Verify Dispose & Listener Cleanup
    console.log("\n7. Testing client.dispose() and listener cleanup...");
    client.dispose();

    const exitListenersAfter = process.listenerCount("exit");
    const sigintListenersAfter = process.listenerCount("SIGINT");
    const sigtermListenersAfter = process.listenerCount("SIGTERM");
    console.log(`   Listeners after dispose -> exit: ${exitListenersAfter}, SIGINT: ${sigintListenersAfter}, SIGTERM: ${sigtermListenersAfter}`);

    if (sigintListenersAfter !== sigintListenersBefore - 1 || sigtermListenersAfter !== sigtermListenersBefore - 1) {
      throw new Error("Signal listeners were not properly unregistered on dispose()");
    }
    console.log("   ✓ Process listeners cleanly unregistered!");

    // 8. Test ensureRunning spawn error handling
    console.log("\n8. Testing ensureRunning error handling on bad binary path...");
    process.env.PI_VIDEO_CUA_HELPER_PATH = "C:\\non_existent_binary_path.exe";
    const testClient = HelperClient.getInstance();
    let errorCaught = false;
    try {
      await testClient.ensureRunning();
    } catch (e: any) {
      errorCaught = true;
      console.log(`   ✓ Caught expected error: ${e.message}`);
    }
    delete process.env.PI_VIDEO_CUA_HELPER_PATH;
    testClient.dispose();

    if (!errorCaught) {
      throw new Error("Expected ensureRunning to reject with error for invalid binary path");
    }

    console.log("\n=================================================");
    console.log("  ALL TESTS & VERIFICATIONS PASSED SUCCESSFULLY!");
    console.log("=================================================");
  } catch (error) {
    console.error("\n❌ Test execution failed with error:", error);
    process.exit(1);
  } finally {
    client.dispose();
  }
}

runTests();
