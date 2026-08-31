use anyhow::{anyhow, Result};
use std::thread::sleep;
use std::time::Duration;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT,
    KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, KEYBD_EVENT_FLAGS,
    MOUSEEVENTF_ABSOLUTE, MOUSEEVENTF_HWHEEL, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP,
    MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_MOVE, MOUSEEVENTF_RIGHTDOWN,
    MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_WHEEL, MOUSEINPUT,
    VIRTUAL_KEY, VK_ADD, VK_BACK, VK_CAPITAL, VK_CONTROL, VK_DECIMAL, VK_DELETE,
    VK_DIVIDE, VK_DOWN, VK_END, VK_ESCAPE, VK_F1, VK_F10, VK_F11, VK_F12, VK_F2, VK_F3,
    VK_F4, VK_F5, VK_F6, VK_F7, VK_F8, VK_F9, VK_HOME, VK_INSERT,
    VK_LEFT, VK_LWIN, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PLAY_PAUSE, VK_MEDIA_PREV_TRACK,
    VK_MEDIA_STOP, VK_MENU, VK_MULTIPLY, VK_NEXT, VK_NUMPAD0, VK_NUMPAD1, VK_NUMPAD2,
    VK_NUMPAD3, VK_NUMPAD4, VK_NUMPAD5, VK_NUMPAD6, VK_NUMPAD7, VK_NUMPAD8, VK_NUMPAD9,
    VK_OEM_1, VK_OEM_2, VK_OEM_3, VK_OEM_4, VK_OEM_5, VK_OEM_6, VK_OEM_7,
    VK_OEM_COMMA, VK_OEM_MINUS, VK_OEM_PERIOD, VK_OEM_PLUS, VK_PRIOR, VK_RETURN,
    VK_RIGHT, VK_SHIFT, VK_SNAPSHOT, VK_SPACE, VK_SUBTRACT, VK_TAB, VK_UP,
    VK_VOLUME_DOWN, VK_VOLUME_MUTE, VK_VOLUME_UP,
};
use windows::Win32::UI::WindowsAndMessaging::{SetCursorPos, WHEEL_DELTA};

use crate::capture::get_screen_dimensions;

fn clamp_norm(v: f64) -> f64 {
    if v.is_nan() || v < 0.0 {
        0.0
    } else if v > 1.0 {
        1.0
    } else {
        v
    }
}

pub fn move_mouse(x: f64, y: f64) -> Result<()> {
    let x_clamped = clamp_norm(x);
    let y_clamped = clamp_norm(y);

    let dims = get_screen_dimensions();
    let px = (x_clamped * (dims.width as f64 - 1.0)).round() as i32;
    let py = (y_clamped * (dims.height as f64 - 1.0)).round() as i32;

    unsafe {
        let _ = SetCursorPos(px, py);

        let abs_x = ((x_clamped * 65535.0).round() as i32).clamp(0, 65535);
        let abs_y = ((y_clamped * 65535.0).round() as i32).clamp(0, 65535);

        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: abs_x,
                    dy: abs_y,
                    mouseData: 0,
                    dwFlags: MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }

    sleep(Duration::from_millis(15));
    Ok(())
}

pub fn click(button: &str) -> Result<()> {
    let (down_flag, up_flag) = match button.to_lowercase().as_str() {
        "right" => (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
        "middle" => (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
        _ => (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
    };

    unsafe {
        let input_down = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: down_flag,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let input_up = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: up_flag,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        SendInput(&[input_down], std::mem::size_of::<INPUT>() as i32);
        sleep(Duration::from_millis(30));
        SendInput(&[input_up], std::mem::size_of::<INPUT>() as i32);
    }

    sleep(Duration::from_millis(20));
    Ok(())
}

pub struct MouseUpGuard {
    released: bool,
}

impl MouseUpGuard {
    pub fn new() -> Self {
        Self { released: false }
    }

    pub fn release(&mut self) {
        if !self.released {
            self.released = true;
            unsafe {
                let input_up = INPUT {
                    r#type: INPUT_MOUSE,
                    Anonymous: INPUT_0 {
                        mi: MOUSEINPUT {
                            dx: 0,
                            dy: 0,
                            mouseData: 0,
                            dwFlags: MOUSEEVENTF_LEFTUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };
                SendInput(&[input_up], std::mem::size_of::<INPUT>() as i32);
            }
        }
    }
}

impl Drop for MouseUpGuard {
    fn drop(&mut self) {
        self.release();
    }
}

pub struct ModifiersGuard {
    modifiers: Vec<VIRTUAL_KEY>,
    released: bool,
}

impl ModifiersGuard {
    pub fn new(modifiers: Vec<VIRTUAL_KEY>) -> Self {
        Self {
            modifiers,
            released: false,
        }
    }

    pub fn release(&mut self) {
        if !self.released {
            self.released = true;
            unsafe {
                for &mod_vk in self.modifiers.iter().rev() {
                    send_vk(mod_vk, true);
                    sleep(Duration::from_millis(5));
                }
            }
        }
    }
}

impl Drop for ModifiersGuard {
    fn drop(&mut self) {
        self.release();
    }
}

pub fn parse_modifier_key(name: &str) -> Result<VIRTUAL_KEY> {
    match name.trim().to_lowercase().as_str() {
        "ctrl" | "control" => Ok(VK_CONTROL),
        "shift" => Ok(VK_SHIFT),
        "alt" | "opt" | "option" | "menu" => Ok(VK_MENU),
        "win" | "cmd" | "super" | "windows" => Ok(VK_LWIN),
        _ => parse_single_key(name),
    }
}

pub fn drag(x1: f64, y1: f64, x2: f64, y2: f64, modifiers: Option<&[String]>) -> Result<()> {
    // 1. Move to start position
    move_mouse(x1, y1)?;
    sleep(Duration::from_millis(40));

    // 2. Press modifier keys if specified
    let mut mod_vks = Vec::new();
    if let Some(mods) = modifiers {
        for m in mods {
            let vk = parse_modifier_key(m)?;
            mod_vks.push(vk);
        }
    }

    for &mod_vk in &mod_vks {
        unsafe {
            send_vk(mod_vk, false);
        }
        sleep(Duration::from_millis(10));
    }
    let mut mod_guard = ModifiersGuard::new(mod_vks);
    sleep(Duration::from_millis(20));

    // 3. Mouse down with RAII MouseUpGuard
    unsafe {
        let input_down = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
                    dwFlags: MOUSEEVENTF_LEFTDOWN,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        SendInput(&[input_down], std::mem::size_of::<INPUT>() as i32);
    }
    let mut mouse_guard = MouseUpGuard::new();
    sleep(Duration::from_millis(40));

    // 4. Interpolate movement across 10 smooth steps with micro-delays
    let steps = 10;
    for i in 1..=steps {
        let t = (i as f64) / (steps as f64);
        let curr_x = x1 + (x2 - x1) * t;
        let curr_y = y1 + (y2 - y1) * t;
        move_mouse(curr_x, curr_y)?;
        sleep(Duration::from_millis(15));
    }

    sleep(Duration::from_millis(40));

    // 5. Mouse up
    mouse_guard.release();
    drop(mouse_guard);
    sleep(Duration::from_millis(30));

    // 6. Release modifiers in reverse order
    mod_guard.release();
    drop(mod_guard);
    sleep(Duration::from_millis(20));

    Ok(())
}

pub fn scroll(x: f64, y: f64, direction: &str, amount: i32) -> Result<()> {
    move_mouse(x, y)?;
    sleep(Duration::from_millis(20));

    let step_count = amount.abs().max(1);
    let delta = (WHEEL_DELTA as i32) * step_count;

    let (flag, wheel_delta) = match direction.to_lowercase().as_str() {
        "up" => (MOUSEEVENTF_WHEEL, delta as u32),
        "down" => (MOUSEEVENTF_WHEEL, (-delta) as u32),
        "right" => (MOUSEEVENTF_HWHEEL, delta as u32),
        "left" => (MOUSEEVENTF_HWHEEL, (-delta) as u32),
        _ => (MOUSEEVENTF_WHEEL, (-delta) as u32),
    };

    unsafe {
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: wheel_delta,
                    dwFlags: flag,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }

    sleep(Duration::from_millis(30));
    Ok(())
}

pub fn type_text(text: &str) -> Result<()> {
    for c in text.chars() {
        let mut utf16_buf = [0u16; 2];
        let encoded = c.encode_utf16(&mut utf16_buf);

        for code_unit in encoded.iter().copied() {
            unsafe {
                let input_down = INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: VIRTUAL_KEY(0),
                            wScan: code_unit,
                            dwFlags: KEYEVENTF_UNICODE,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };

                let input_up = INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: VIRTUAL_KEY(0),
                            wScan: code_unit,
                            dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };

                SendInput(&[input_down], std::mem::size_of::<INPUT>() as i32);
                sleep(Duration::from_millis(5));
                SendInput(&[input_up], std::mem::size_of::<INPUT>() as i32);
                sleep(Duration::from_millis(5));
            }
        }
    }

    sleep(Duration::from_millis(20));
    Ok(())
}

pub fn tokenize_key_combo(combo: &str) -> Vec<String> {
    let trimmed = combo.trim();
    if trimmed == "+" {
        return vec!["+".to_string()];
    }

    let mut tokens = Vec::new();
    let mut current = String::new();
    let chars: Vec<char> = trimmed.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        let ch = chars[i];
        if ch == '+' {
            if current.is_empty() {
                tokens.push("+".to_string());
            } else {
                tokens.push(current.trim().to_string());
                current.clear();
                if i + 1 == len {
                    tokens.push("+".to_string());
                }
            }
        } else {
            current.push(ch);
        }
        i += 1;
    }

    if !current.trim().is_empty() {
        tokens.push(current.trim().to_string());
    }

    tokens.into_iter().filter(|s| !s.is_empty()).collect()
}

pub fn press_key(key_combo: &str) -> Result<()> {
    let tokens = tokenize_key_combo(key_combo);
    if tokens.is_empty() {
        return Err(anyhow!("Empty key string"));
    }

    let mut modifiers = Vec::new();
    let mut primary_keys = Vec::new();

    for token in tokens {
        let lower = token.to_lowercase();
        match lower.as_str() {
            "ctrl" | "control" => modifiers.push(VK_CONTROL),
            "shift" => modifiers.push(VK_SHIFT),
            "alt" => modifiers.push(VK_MENU),
            "win" | "cmd" | "super" => modifiers.push(VK_LWIN),
            _ => {
                let vk = parse_single_key(&token)?;
                primary_keys.push(vk);
            }
        }
    }

    if primary_keys.is_empty() && !modifiers.is_empty() {
        primary_keys = modifiers.clone();
        modifiers.clear();
    }

    unsafe {
        // Press modifiers down
        for &mod_vk in &modifiers {
            send_vk(mod_vk, false);
            sleep(Duration::from_millis(10));
        }

        // Press primary keys down & up
        for &prim_vk in &primary_keys {
            send_vk(prim_vk, false);
            sleep(Duration::from_millis(25));
            send_vk(prim_vk, true);
            sleep(Duration::from_millis(10));
        }

        // Release modifiers in reverse order
        for &mod_vk in modifiers.iter().rev() {
            send_vk(mod_vk, true);
            sleep(Duration::from_millis(10));
        }
    }

    sleep(Duration::from_millis(20));
    Ok(())
}

unsafe fn send_vk(vk: VIRTUAL_KEY, is_up: bool) {
    let flags = if is_up { KEYEVENTF_KEYUP } else { KEYBD_EVENT_FLAGS(0) };
    let input = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
}

pub fn parse_single_key(name: &str) -> Result<VIRTUAL_KEY> {
    match name.to_lowercase().as_str() {
        "enter" | "return" => Ok(VK_RETURN),
        "space" | "spacebar" => Ok(VK_SPACE),
        "tab" => Ok(VK_TAB),
        "escape" | "esc" => Ok(VK_ESCAPE),
        "backspace" | "bksp" => Ok(VK_BACK),
        "delete" | "del" => Ok(VK_DELETE),
        "insert" | "ins" => Ok(VK_INSERT),
        "home" => Ok(VK_HOME),
        "end" => Ok(VK_END),
        "pageup" | "pgup" => Ok(VK_PRIOR),
        "pagedown" | "pgdn" => Ok(VK_NEXT),
        "up" => Ok(VK_UP),
        "down" => Ok(VK_DOWN),
        "left" => Ok(VK_LEFT),
        "right" => Ok(VK_RIGHT),
        "capslock" | "caps" => Ok(VK_CAPITAL),
        "printscreen" | "prtsc" | "snapshot" => Ok(VK_SNAPSHOT),

        // Function keys
        "f1" => Ok(VK_F1),
        "f2" => Ok(VK_F2),
        "f3" => Ok(VK_F3),
        "f4" => Ok(VK_F4),
        "f5" => Ok(VK_F5),
        "f6" => Ok(VK_F6),
        "f7" => Ok(VK_F7),
        "f8" => Ok(VK_F8),
        "f9" => Ok(VK_F9),
        "f10" => Ok(VK_F10),
        "f11" => Ok(VK_F11),
        "f12" => Ok(VK_F12),

        // Punctuation and OEM symbols
        "[" | "{" | "bracketleft" | "lbrace" | "leftbracket" => Ok(VK_OEM_4),
        "]" | "}" | "bracketright" | "rbrace" | "rightbracket" => Ok(VK_OEM_6),
        "\\" | "|" | "backslash" | "pipe" => Ok(VK_OEM_5),
        ";" | ":" | "semicolon" | "colon" => Ok(VK_OEM_1),
        "'" | "\"" | "quote" | "singlequote" | "doublequote" | "apostrophe" => Ok(VK_OEM_7),
        "," | "<" | "comma" | "less" | "lessthan" => Ok(VK_OEM_COMMA),
        "." | ">" | "period" | "dot" | "greater" | "greaterthan" => Ok(VK_OEM_PERIOD),
        "/" | "?" | "slash" | "slashforward" | "question" => Ok(VK_OEM_2),
        "`" | "~" | "backquote" | "backtick" | "tilde" | "grave" => Ok(VK_OEM_3),
        "-" | "_" | "minus" | "dash" | "underscore" => Ok(VK_OEM_MINUS),
        "=" | "+" | "equal" | "equals" | "plus" => Ok(VK_OEM_PLUS),

        // Numpad keys
        "numpad0" | "num0" => Ok(VK_NUMPAD0),
        "numpad1" | "num1" => Ok(VK_NUMPAD1),
        "numpad2" | "num2" => Ok(VK_NUMPAD2),
        "numpad3" | "num3" => Ok(VK_NUMPAD3),
        "numpad4" | "num4" => Ok(VK_NUMPAD4),
        "numpad5" | "num5" => Ok(VK_NUMPAD5),
        "numpad6" | "num6" => Ok(VK_NUMPAD6),
        "numpad7" | "num7" => Ok(VK_NUMPAD7),
        "numpad8" | "num8" => Ok(VK_NUMPAD8),
        "numpad9" | "num9" => Ok(VK_NUMPAD9),
        "numpad_enter" | "numpadenter" => Ok(VK_RETURN),
        "numpad_plus" | "numpad_add" | "numpadplus" | "numpadadd" | "numpad+" => Ok(VK_ADD),
        "numpad_minus" | "numpad_subtract" | "numpadminus" | "numpadsubtract" | "numpad_sub" | "numpadsub" | "numpad-" => Ok(VK_SUBTRACT),
        "numpad_multiply" | "numpad_mul" | "numpadmultiply" | "numpadmul" | "numpad*" => Ok(VK_MULTIPLY),
        "numpad_divide" | "numpad_div" | "numpaddivide" | "numpaddiv" | "numpad/" => Ok(VK_DIVIDE),
        "numpad_dot" | "numpad_decimal" | "numpaddot" | "numpaddecimal" | "numpad." => Ok(VK_DECIMAL),

        // Media / Volume keys
        "volume_up" | "volumeup" => Ok(VK_VOLUME_UP),
        "volume_down" | "volumedown" => Ok(VK_VOLUME_DOWN),
        "volume_mute" | "volumemute" | "mute" => Ok(VK_VOLUME_MUTE),
        "play_pause" | "playpause" | "media_play_pause" => Ok(VK_MEDIA_PLAY_PAUSE),
        "media_next" | "medianext" | "next_track" => Ok(VK_MEDIA_NEXT_TRACK),
        "media_prev" | "mediaprev" | "prev_track" => Ok(VK_MEDIA_PREV_TRACK),
        "media_stop" | "mediastop" => Ok(VK_MEDIA_STOP),

        s if s.len() == 1 => {
            let ch = s.chars().next().unwrap();
            if ch.is_ascii_alphabetic() {
                let upper = ch.to_ascii_uppercase() as u16;
                Ok(VIRTUAL_KEY(upper))
            } else if ch.is_ascii_digit() {
                let digit = ch as u16;
                Ok(VIRTUAL_KEY(digit))
            } else {
                Err(anyhow!("Unsupported key symbol: {}", s))
            }
        }
        _ => Err(anyhow!("Unknown key name: {}", name)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_symbols_and_numpad() {
        assert_eq!(parse_single_key("[").unwrap(), VK_OEM_4);
        assert_eq!(parse_single_key("{").unwrap(), VK_OEM_4);
        assert_eq!(parse_single_key("]").unwrap(), VK_OEM_6);
        assert_eq!(parse_single_key("}").unwrap(), VK_OEM_6);
        assert_eq!(parse_single_key("\\").unwrap(), VK_OEM_5);
        assert_eq!(parse_single_key("|").unwrap(), VK_OEM_5);
        assert_eq!(parse_single_key(";").unwrap(), VK_OEM_1);
        assert_eq!(parse_single_key(":").unwrap(), VK_OEM_1);
        assert_eq!(parse_single_key("'").unwrap(), VK_OEM_7);
        assert_eq!(parse_single_key("\"").unwrap(), VK_OEM_7);
        assert_eq!(parse_single_key(",").unwrap(), VK_OEM_COMMA);
        assert_eq!(parse_single_key("<").unwrap(), VK_OEM_COMMA);
        assert_eq!(parse_single_key(".").unwrap(), VK_OEM_PERIOD);
        assert_eq!(parse_single_key(">").unwrap(), VK_OEM_PERIOD);
        assert_eq!(parse_single_key("/").unwrap(), VK_OEM_2);
        assert_eq!(parse_single_key("?").unwrap(), VK_OEM_2);
        assert_eq!(parse_single_key("`").unwrap(), VK_OEM_3);
        assert_eq!(parse_single_key("~").unwrap(), VK_OEM_3);
        assert_eq!(parse_single_key("-").unwrap(), VK_OEM_MINUS);
        assert_eq!(parse_single_key("_").unwrap(), VK_OEM_MINUS);
        assert_eq!(parse_single_key("=").unwrap(), VK_OEM_PLUS);
        assert_eq!(parse_single_key("+").unwrap(), VK_OEM_PLUS);

        // Numpad
        assert_eq!(parse_single_key("numpad0").unwrap(), VK_NUMPAD0);
        assert_eq!(parse_single_key("numpad9").unwrap(), VK_NUMPAD9);
        assert_eq!(parse_single_key("numpad_enter").unwrap(), VK_RETURN);
        assert_eq!(parse_single_key("numpad_plus").unwrap(), VK_ADD);
        assert_eq!(parse_single_key("numpad_minus").unwrap(), VK_SUBTRACT);
        assert_eq!(parse_single_key("numpad_multiply").unwrap(), VK_MULTIPLY);
        assert_eq!(parse_single_key("numpad_divide").unwrap(), VK_DIVIDE);
        assert_eq!(parse_single_key("numpad_dot").unwrap(), VK_DECIMAL);

        // Media
        assert_eq!(parse_single_key("volume_up").unwrap(), VK_VOLUME_UP);
        assert_eq!(parse_single_key("volume_down").unwrap(), VK_VOLUME_DOWN);
        assert_eq!(parse_single_key("volume_mute").unwrap(), VK_VOLUME_MUTE);
        assert_eq!(parse_single_key("play_pause").unwrap(), VK_MEDIA_PLAY_PAUSE);
        assert_eq!(parse_single_key("media_next").unwrap(), VK_MEDIA_NEXT_TRACK);
        assert_eq!(parse_single_key("media_prev").unwrap(), VK_MEDIA_PREV_TRACK);
    }

    #[test]
    fn test_tokenize_key_combo() {
        assert_eq!(tokenize_key_combo("ctrl+["), vec!["ctrl", "["]);
        assert_eq!(tokenize_key_combo("ctrl+]"), vec!["ctrl", "]"]);
        assert_eq!(tokenize_key_combo("ctrl+="), vec!["ctrl", "="]);
        assert_eq!(tokenize_key_combo("ctrl+-"), vec!["ctrl", "-"]);
        assert_eq!(tokenize_key_combo("ctrl++"), vec!["ctrl", "+"]);
        assert_eq!(tokenize_key_combo("+"), vec!["+"]);
        assert_eq!(tokenize_key_combo("ctrl+alt+del"), vec!["ctrl", "alt", "del"]);
    }

    #[test]
    fn test_modifier_keys() {
        assert_eq!(parse_modifier_key("alt").unwrap(), VK_MENU);
        assert_eq!(parse_modifier_key("option").unwrap(), VK_MENU);
        assert_eq!(parse_modifier_key("ctrl").unwrap(), VK_CONTROL);
        assert_eq!(parse_modifier_key("control").unwrap(), VK_CONTROL);
        assert_eq!(parse_modifier_key("shift").unwrap(), VK_SHIFT);
        assert_eq!(parse_modifier_key("win").unwrap(), VK_LWIN);
        assert_eq!(parse_modifier_key("cmd").unwrap(), VK_LWIN);
    }

    #[test]
    fn test_clamp_norm() {
        assert_eq!(clamp_norm(0.5), 0.5);
        assert_eq!(clamp_norm(-0.1), 0.0);
        assert_eq!(clamp_norm(1.5), 1.0);
        assert_eq!(clamp_norm(f64::NAN), 0.0);
        assert_eq!(clamp_norm(f64::NEG_INFINITY), 0.0);
        assert_eq!(clamp_norm(f64::INFINITY), 1.0);
    }
}

