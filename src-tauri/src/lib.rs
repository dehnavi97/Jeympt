// Jeympt is a pure web app: all data lives in the WebView's IndexedDB,
// so the native side only needs to host the window.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Jeympt");
}
