import { HelperClient, tools, screenshotTool, moveMouseTool, clickTool, dragTool, waitTool, scrollTool, screenRecordTool, pressKeyTool, typeTextTool, } from "../src/index.js";
async function runSmokeTests() {
    console.log("=== Starting pi-video-cua Smoke Tests ===");
    const client = HelperClient.getInstance();
    try {
        console.log("1. Verifying registered tools...");
        console.log(`Total tools registered: ${tools.length}`);
        for (const tool of tools) {
            console.log(` - Tool: ${tool.name}: ${tool.description.slice(0, 60)}...`);
        }
        if (tools.length !== 9) {
            throw new Error(`Expected 9 tools, got ${tools.length}`);
        }
        console.log("\n2. Testing 'screenshot' tool...");
        const screenRes = await screenshotTool.execute({});
        console.log("Screenshot response status:", screenRes.isError ? "FAILED" : "SUCCESS");
        if (screenRes.isError) {
            throw new Error(`Screenshot failed: ${JSON.stringify(screenRes)}`);
        }
        console.log("\n3. Testing 'move_mouse' tool to center (0.5, 0.5)...");
        const moveRes = await moveMouseTool.execute({ x: 0.5, y: 0.5 });
        console.log("Move mouse response status:", moveRes.isError ? "FAILED" : "SUCCESS");
        if (moveRes.isError) {
            throw new Error(`Move mouse failed: ${JSON.stringify(moveRes)}`);
        }
        console.log("\n4. Testing 'click' tool (left click)...");
        const clickRes = await clickTool.execute({ button: "left" });
        console.log("Click response status:", clickRes.isError ? "FAILED" : "SUCCESS");
        if (clickRes.isError) {
            throw new Error(`Click failed: ${JSON.stringify(clickRes)}`);
        }
        console.log("\n5. Testing 'drag' tool (smooth drag without modifiers)...");
        const dragRes = await dragTool.execute({ x1: 0.5, y1: 0.5, x2: 0.52, y2: 0.52 });
        console.log("Drag response status:", dragRes.isError ? "FAILED" : "SUCCESS");
        if (dragRes.isError) {
            throw new Error(`Drag failed: ${JSON.stringify(dragRes)}`);
        }
        console.log("\n6. Testing 'drag' tool with modifiers (SEC-19: Alt-drag duplicate)...");
        const dragModRes = await dragTool.execute({
            x1: 0.52,
            y1: 0.52,
            x2: 0.5,
            y2: 0.5,
            modifiers: ["alt"],
        });
        console.log("Alt-drag response status:", dragModRes.isError ? "FAILED" : "SUCCESS");
        if (dragModRes.isError) {
            throw new Error(`Alt-drag failed: ${JSON.stringify(dragModRes)}`);
        }
        console.log("\n7. Testing 'wait' tool (300ms)...");
        const waitRes = await waitTool.execute({ ms: 300 });
        console.log("Wait response status:", waitRes.isError ? "FAILED" : "SUCCESS");
        if (waitRes.isError) {
            throw new Error(`Wait failed: ${JSON.stringify(waitRes)}`);
        }
        console.log("\n8. Testing 'scroll' tool (up by 2)...");
        const scrollRes = await scrollTool.execute({ x: 0.5, y: 0.5, direction: "up", amount: 2 });
        console.log("Scroll response status:", scrollRes.isError ? "FAILED" : "SUCCESS");
        if (scrollRes.isError) {
            throw new Error(`Scroll failed: ${JSON.stringify(scrollRes)}`);
        }
        console.log("\n9. Testing 'screen_record' tool (1 second)...");
        const recordRes = await screenRecordTool.execute({ duration: 1.0 });
        console.log("Screen record response status:", recordRes.isError ? "FAILED" : "SUCCESS");
        if (recordRes.isError) {
            throw new Error(`Screen record failed: ${JSON.stringify(recordRes)}`);
        }
        console.log("\n10. Testing SEC-16 Argument Validation (NaN, undefined, invalid bounds)...");
        // Move mouse NaN
        const badMove1 = await moveMouseTool.execute({ x: NaN, y: 0.5 });
        if (!badMove1.isError)
            throw new Error("Expected NaN x to fail validation");
        const badMove2 = await moveMouseTool.execute({ x: 1.5, y: 0.5 });
        if (!badMove2.isError)
            throw new Error("Expected out-of-bounds x to fail validation");
        const badMove3 = await moveMouseTool.execute(undefined);
        if (!badMove3.isError)
            throw new Error("Expected undefined args to fail validation");
        // Drag invalid coords and modifiers
        const badDrag1 = await dragTool.execute({ x1: NaN, y1: 0.2, x2: 0.3, y2: 0.4 });
        if (!badDrag1.isError)
            throw new Error("Expected NaN x1 in drag to fail validation");
        const badDrag2 = await dragTool.execute({ x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4, modifiers: [123] });
        if (!badDrag2.isError)
            throw new Error("Expected invalid modifiers to fail validation");
        // Scroll invalid direction and amount
        const badScroll1 = await scrollTool.execute({ x: 0.5, y: 0.5, direction: "diagonal" });
        if (!badScroll1.isError)
            throw new Error("Expected invalid direction to fail validation");
        const badScroll2 = await scrollTool.execute({ x: 0.5, y: 0.5, direction: "up", amount: -1 });
        if (!badScroll2.isError)
            throw new Error("Expected negative amount in scroll to fail validation");
        // Wait invalid ms
        const badWait1 = await waitTool.execute({ ms: -50 });
        if (!badWait1.isError)
            throw new Error("Expected negative ms to fail validation");
        const badWait2 = await waitTool.execute({ ms: NaN });
        if (!badWait2.isError)
            throw new Error("Expected NaN ms to fail validation");
        // Screen record invalid duration
        const badRec1 = await screenRecordTool.execute({ duration: 0.1 });
        if (!badRec1.isError)
            throw new Error("Expected < 0.5 duration to fail validation");
        const badRec2 = await screenRecordTool.execute({ duration: 500 });
        if (!badRec2.isError)
            throw new Error("Expected > 300 duration to fail validation");
        // Click invalid button
        const badClick = await clickTool.execute({ button: "invalid_btn" });
        if (!badClick.isError)
            throw new Error("Expected invalid click button to fail validation");
        // Press key empty string
        const badKey = await pressKeyTool.execute({ key: "  " });
        if (!badKey.isError)
            throw new Error("Expected whitespace key to fail validation");
        // Type text non-string
        const badText = await typeTextTool.execute({ text: 123 });
        if (!badText.isError)
            throw new Error("Expected non-string text to fail validation");
        console.log("   ✓ All SEC-16 argument validation checks returned formatted error responses cleanly!");
        console.log("\n=== ALL SMOKE TESTS PASSED SUCCESSFULLY ===");
    }
    catch (error) {
        console.error("Test failed with error:", error);
        process.exit(1);
    }
    finally {
        client.dispose();
    }
}
runSmokeTests();
