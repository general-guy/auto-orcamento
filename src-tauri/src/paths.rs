use std::path::PathBuf;

#[cfg(not(debug_assertions))]
use std::path::Path;

use tauri::AppHandle;

#[cfg(not(debug_assertions))]
use tauri::Manager;

#[cfg(not(debug_assertions))]
fn repo_root_from_exe(exe_dir: &Path) -> Option<PathBuf> {
  let profile = exe_dir.file_name()?.to_str()?;
  if profile != "release" && profile != "debug" {
    return None;
  }

  let target_dir = exe_dir.parent()?;
  if target_dir.file_name()?.to_str()? != "target" {
    return None;
  }

  let src_tauri_dir = target_dir.parent()?;
  if src_tauri_dir.file_name()?.to_str()? != "src-tauri" {
    return None;
  }

  Some(src_tauri_dir.parent()?.to_path_buf())
}

#[cfg(not(debug_assertions))]
fn resolve_repo_or_exe_subdir(app: &AppHandle, subdir: &str) -> Result<PathBuf, String> {
  if let Ok(exe_dir) = app.path().executable_dir() {
    if let Some(repo_root) = repo_root_from_exe(&exe_dir) {
      let repo_subdir = repo_root.join(subdir);
      if repo_subdir.is_dir() || subdir == "data" || subdir == "output" {
        return Ok(repo_subdir);
      }
    }

    return Ok(exe_dir.join(subdir));
  }

  app
    .path()
    .app_data_dir()
    .map(|path| path.join(subdir))
    .map_err(|error| error.to_string())
}

pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
  #[cfg(debug_assertions)]
  {
    let _ = app;
    return Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("data"));
  }

  #[cfg(not(debug_assertions))]
  {
    resolve_repo_or_exe_subdir(app, "data")
  }
}

pub fn output_dir(app: &AppHandle) -> Result<PathBuf, String> {
  #[cfg(debug_assertions)]
  {
    let _ = app;
    return Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("output"));
  }

  #[cfg(not(debug_assertions))]
  {
    resolve_repo_or_exe_subdir(app, "output")
  }
}
