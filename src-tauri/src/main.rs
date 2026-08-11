// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

struct SidecarState(Mutex<Option<CommandChild>>);

fn detener_sidecar(app: &tauri::AppHandle) {
    let Some(state) = app.try_state::<SidecarState>() else {
        return;
    };

    let child = state.0.lock().ok().and_then(|mut child| child.take());
    if let Some(child) = child {
        let _ = child.kill();
    }
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let sidecar_command = app.shell().sidecar("distribuidora-backend");
            if let Ok(command) = sidecar_command {
                let (mut rx, child) = command.spawn().expect("Failed to spawn sidecar");
                app.manage(SidecarState(Mutex::new(Some(child))));

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
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app, event| {
        if matches!(event, RunEvent::ExitRequested { .. } | RunEvent::Exit) {
            detener_sidecar(app);
        }
    });
}
