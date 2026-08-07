// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let sidecar_command = app.shell().sidecar("distribuidora-backend");
            if let Ok(command) = sidecar_command {
                let (mut rx, mut child) = command
                    .spawn()
                    .expect("Failed to spawn sidecar");

                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        if let CommandEvent::Stdout(line_bytes) = event {
                            let line = String::from_utf8_lossy(&line_bytes);
                            println!("Sidecar stdout: {}", line);
                        } else if let CommandEvent::Stderr(line_bytes) = event {
                            let line = String::from_utf8_lossy(&line_bytes);
                            eprintln!("Sidecar stderr: {}", line);
                        }
                    }
                });
            } else {
                println!("Sidecar not found, skipping (dev mode?)");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
