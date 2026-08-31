use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub id: Option<serde_json::Value>,
    pub method: String,
    #[serde(default)]
    pub params: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse<T> {
    pub id: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenDimensions {
    pub width: u32,
    pub height: u32,
    pub physical_width: u32,
    pub physical_height: u32,
    pub dpi_scale: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotResult {
    pub success: bool,
    pub image_path: String,
    pub image_base64: String,
    pub dimensions: ScreenDimensions,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordResult {
    pub success: bool,
    pub video_path: String,
    pub duration: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub screenshot: Option<ScreenshotResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MoveMouseParams {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ClickParams {
    #[serde(default = "default_left")]
    pub button: String,
}

fn default_left() -> String {
    "left".to_string()
}

#[derive(Debug, Clone, Deserialize)]
pub struct TypeTextParams {
    pub text: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PressKeyParams {
    pub key: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct WaitParams {
    pub ms: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ScreenRecordParams {
    pub duration: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DragParams {
    pub x1: f64,
    pub y1: f64,
    pub x2: f64,
    pub y2: f64,
    #[serde(default)]
    pub modifiers: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ScrollParams {
    pub x: f64,
    pub y: f64,
    pub direction: String,
    #[serde(default = "default_scroll_amount")]
    pub amount: i32,
}

fn default_scroll_amount() -> i32 {
    3
}
