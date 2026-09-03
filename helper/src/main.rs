mod capture;
mod input;
mod protocol;
mod recorder;

use anyhow::Result;
use std::io::{self, BufRead, Write};
use std::thread::sleep;
use std::time::Duration;

use capture::{capture_screen, get_screen_dimensions, init_dpi_awareness};
use input::{click, drag, move_mouse, press_key, scroll, type_text};
use protocol::{
    ClickParams, DragParams, JsonRpcError, JsonRpcRequest, JsonRpcResponse, MoveMouseParams,
    PressKeyParams, ScreenRecordParams, ScrollParams, TypeTextParams, WaitParams,
};
use recorder::record_screen;

fn main() -> Result<()> {
    init_dpi_awareness();

    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let request: JsonRpcRequest = match serde_json::from_str(trimmed) {
            Ok(req) => req,
            Err(e) => {
                let err_resp: JsonRpcResponse<serde_json::Value> = JsonRpcResponse {
                    id: None,
                    result: None,
                    error: Some(JsonRpcError {
                        code: -32700,
                        message: format!("Parse error: {}", e),
                        data: None,
                    }),
                };
                let _ = writeln!(stdout, "{}", serde_json::to_string(&err_resp)?);
                let _ = stdout.flush();
                continue;
            }
        };

        let resp_json = handle_request(request);
        let _ = writeln!(stdout, "{}", resp_json);
        let _ = stdout.flush();
    }

    Ok(())
}

fn handle_request(req: JsonRpcRequest) -> String {
    let id = req.id.clone();
    let method = req.method.as_str();

    match method {
        "ping" => {
            let dims = get_screen_dimensions();
            let res = serde_json::json!({
                "pong": true,
                "dimensions": dims,
            });
            let resp = JsonRpcResponse {
                id,
                result: Some(res),
                error: None,
            };
            serde_json::to_string(&resp).unwrap_or_default()
        }

        "screenshot" => match capture_screen() {
            Ok(result) => {
                let resp = JsonRpcResponse {
                    id,
                    result: Some(result),
                    error: None,
                };
                serde_json::to_string(&resp).unwrap_or_default()
            }
            Err(e) => error_with_screenshot(id, &e.to_string()),
        },

        "move_mouse" => {
            let params: MoveMouseParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return invalid_params(id, &e.to_string()),
            };

            if let Err(e) = move_mouse(params.x, params.y) {
                return error_with_screenshot(id, &e.to_string());
            }

            match capture_screen() {
                Ok(result) => {
                    let resp = JsonRpcResponse {
                        id,
                        result: Some(result),
                        error: None,
                    };
                    serde_json::to_string(&resp).unwrap_or_default()
                }
                Err(e) => error_with_screenshot(id, &e.to_string()),
            }
        }

        "click" => {
            let params: ClickParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(_) => ClickParams {
                    button: "left".to_string(),
                    count: 1,
                    delay_ms: 100,
                },
            };

            if let Err(e) = click(&params.button, params.count, params.delay_ms) {
                return error_with_screenshot(id, &e.to_string());
            }

            match capture_screen() {
                Ok(result) => {
                    let resp = JsonRpcResponse {
                        id,
                        result: Some(result),
                        error: None,
                    };
                    serde_json::to_string(&resp).unwrap_or_default()
                }
                Err(e) => error_with_screenshot(id, &e.to_string()),
            }
        }

        "type_text" => {
            let params: TypeTextParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return invalid_params(id, &e.to_string()),
            };

            if let Err(e) = type_text(&params.text) {
                return error_with_screenshot(id, &e.to_string());
            }

            match capture_screen() {
                Ok(result) => {
                    let resp = JsonRpcResponse {
                        id,
                        result: Some(result),
                        error: None,
                    };
                    serde_json::to_string(&resp).unwrap_or_default()
                }
                Err(e) => error_with_screenshot(id, &e.to_string()),
            }
        }

        "press_key" => {
            let params: PressKeyParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return invalid_params(id, &e.to_string()),
            };

            if let Err(e) = press_key(&params.key) {
                return error_with_screenshot(id, &e.to_string());
            }

            match capture_screen() {
                Ok(result) => {
                    let resp = JsonRpcResponse {
                        id,
                        result: Some(result),
                        error: None,
                    };
                    serde_json::to_string(&resp).unwrap_or_default()
                }
                Err(e) => error_with_screenshot(id, &e.to_string()),
            }
        }

        "wait" => {
            let params: WaitParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return invalid_params(id, &e.to_string()),
            };

            sleep(Duration::from_millis(params.ms));

            match capture_screen() {
                Ok(result) => {
                    let resp = JsonRpcResponse {
                        id,
                        result: Some(result),
                        error: None,
                    };
                    serde_json::to_string(&resp).unwrap_or_default()
                }
                Err(e) => error_with_screenshot(id, &e.to_string()),
            }
        }

        "drag" => {
            let params: DragParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return invalid_params(id, &e.to_string()),
            };

            if let Err(e) = drag(params.x1, params.y1, params.x2, params.y2, params.modifiers.as_deref()) {
                return error_with_screenshot(id, &e.to_string());
            }

            match capture_screen() {
                Ok(result) => {
                    let resp = JsonRpcResponse {
                        id,
                        result: Some(result),
                        error: None,
                    };
                    serde_json::to_string(&resp).unwrap_or_default()
                }
                Err(e) => error_with_screenshot(id, &e.to_string()),
            }
        }

        "scroll" => {
            let params: ScrollParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return invalid_params(id, &e.to_string()),
            };

            if let Err(e) = scroll(params.x, params.y, &params.direction, params.amount) {
                return error_with_screenshot(id, &e.to_string());
            }

            match capture_screen() {
                Ok(result) => {
                    let resp = JsonRpcResponse {
                        id,
                        result: Some(result),
                        error: None,
                    };
                    serde_json::to_string(&resp).unwrap_or_default()
                }
                Err(e) => error_with_screenshot(id, &e.to_string()),
            }
        }

        "screen_record" => {
            let params: ScreenRecordParams = match serde_json::from_value(req.params) {
                Ok(p) => p,
                Err(e) => return invalid_params(id, &e.to_string()),
            };

            match record_screen(params.duration) {
                Ok(record_res) => {
                    let resp = JsonRpcResponse {
                        id,
                        result: Some(record_res),
                        error: None,
                    };
                    serde_json::to_string(&resp).unwrap_or_default()
                }
                Err(e) => error_with_screenshot(id, &e.to_string()),
            }
        }

        _ => {
            let err_resp: JsonRpcResponse<serde_json::Value> = JsonRpcResponse {
                id,
                result: None,
                error: Some(JsonRpcError {
                    code: -32601,
                    message: format!("Method not found: {}", method),
                    data: None,
                }),
            };
            serde_json::to_string(&err_resp).unwrap_or_default()
        }
    }
}

fn invalid_params(id: Option<serde_json::Value>, message: &str) -> String {
    let resp: JsonRpcResponse<serde_json::Value> = JsonRpcResponse {
        id,
        result: None,
        error: Some(JsonRpcError {
            code: -32602,
            message: format!("Invalid parameters: {}", message),
            data: None,
        }),
    };
    serde_json::to_string(&resp).unwrap_or_default()
}

fn error_with_screenshot(id: Option<serde_json::Value>, message: &str) -> String {
    let fallback_screen = capture_screen().ok();
    let data_val = fallback_screen.map(|s| serde_json::to_value(s).unwrap_or_default());

    let resp: JsonRpcResponse<serde_json::Value> = JsonRpcResponse {
        id,
        result: None,
        error: Some(JsonRpcError {
            code: -32000,
            message: message.to_string(),
            data: data_val,
        }),
    };
    serde_json::to_string(&resp).unwrap_or_default()
}
