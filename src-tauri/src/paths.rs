use std::env;
use std::path::PathBuf;

#[cfg(any(not(debug_assertions), test))]
use std::path::Path;

use tauri::AppHandle;

#[cfg(any(not(debug_assertions), test))]
fn current_exe_dir() -> Result<PathBuf, String> {
  env::current_exe()
    .map_err(|error| error.to_string())
    .and_then(|path| {
      path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Executável sem diretório pai.".to_string())
    })
}

#[cfg(any(not(debug_assertions), test))]
fn repo_root_from_target_exe(exe_dir: &Path) -> Option<PathBuf> {
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

#[cfg(any(not(debug_assertions), test))]
fn project_root_from_exe_dir(exe_dir: &Path) -> Option<PathBuf> {
  if let Some(repo_root) = repo_root_from_target_exe(exe_dir) {
    return Some(repo_root);
  }

  if exe_dir.join("src-tauri").is_dir() {
    return Some(exe_dir.to_path_buf());
  }

  None
}

#[cfg(any(not(debug_assertions), test))]
fn resolve_subdir(exe_dir: &Path, subdir: &str) -> PathBuf {
  if let Some(project_root) = project_root_from_exe_dir(exe_dir) {
    return project_root.join(subdir);
  }

  exe_dir.join(subdir)
}

pub fn data_dir(_app: &AppHandle) -> Result<PathBuf, String> {
  #[cfg(debug_assertions)]
  {
    return Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("data"));
  }

  #[cfg(not(debug_assertions))]
  {
    let exe_dir = current_exe_dir()?;
    Ok(resolve_subdir(&exe_dir, "data"))
  }
}

pub fn output_dir(_app: &AppHandle) -> Result<PathBuf, String> {
  #[cfg(debug_assertions)]
  {
    return Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("output"));
  }

  #[cfg(not(debug_assertions))]
  {
    let exe_dir = current_exe_dir()?;
    Ok(resolve_subdir(&exe_dir, "output"))
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn target_release_resolves_repo_data() {
    let exe_dir = PathBuf::from(r"C:\proj\src-tauri\target\release");
    let data = resolve_subdir(&exe_dir, "data");
    assert_eq!(data, PathBuf::from(r"C:\proj\data"));
  }

  #[test]
  fn exe_at_repo_root_resolves_repo_data() {
    let exe_dir = PathBuf::from(r"C:\proj");
    // Sem src-tauri no path de teste: cai no layout portátil.
    let data = resolve_subdir(&exe_dir, "data");
    assert_eq!(data, PathBuf::from(r"C:\proj\data"));
  }
}
