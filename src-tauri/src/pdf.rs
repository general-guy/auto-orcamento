use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::AppHandle;
use unicode_normalization::UnicodeNormalization;

#[derive(Debug, Serialize)]
pub struct PdfExportResult {
  pub filename: String,
  pub path: String,
}

use crate::paths::output_dir as resolve_output_dir;

pub fn output_dir(app: &AppHandle) -> Result<PathBuf, String> {
  resolve_output_dir(app)
}

fn sanitize_filename_part(value: &str) -> String {
  value
    .nfkd()
    .filter(|character| !unicode_normalization::char::is_combining_mark(*character))
    .collect::<String>()
    .chars()
    .filter(|character| {
      !matches!(character, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*') && !character.is_control()
    })
    .collect::<String>()
    .split_whitespace()
    .collect::<Vec<_>>()
    .join(" ")
    .trim()
    .to_string()
}

pub fn build_pdf_filename(patient_name: &str, created_at: SystemTime) -> String {
  let safe_patient = {
    let trimmed = sanitize_filename_part(patient_name);
    if trimmed.is_empty() {
      "Paciente".to_string()
    } else {
      trimmed
    }
  };

  let datetime = chrono::DateTime::<chrono::Local>::from(created_at);
  let date = datetime.format("%Y-%m-%d").to_string();
  let time = datetime.format("%H-%M-%S").to_string();

  format!("{safe_patient} {date} {time}.pdf")
}

pub fn resolve_unique_output_path(output_dir: &Path, filename: &str) -> PathBuf {
  let extension = Path::new(filename)
    .extension()
    .and_then(|value| value.to_str())
    .unwrap_or("pdf");
  let base_name = Path::new(filename)
    .file_stem()
    .and_then(|value| value.to_str())
    .unwrap_or("document");

  let mut candidate = output_dir.join(filename);
  let mut counter = 2;

  while candidate.exists() {
    candidate = output_dir.join(format!("{base_name} ({counter}).{extension}"));
    counter += 1;
  }

  candidate
}

fn browser_candidates() -> Vec<PathBuf> {
  let mut candidates = Vec::new();

  if let Ok(custom_browser) = std::env::var("AUTO_ORCAMENTO_BROWSER") {
    candidates.push(PathBuf::from(custom_browser));
  }

  if let Ok(program_files) = std::env::var("ProgramFiles") {
    candidates.push(PathBuf::from(&program_files).join("Google/Chrome/Application/chrome.exe"));
    candidates.push(PathBuf::from(&program_files).join("Microsoft/Edge/Application/msedge.exe"));
  }

  if let Ok(program_files_x86) = std::env::var("ProgramFiles(x86)") {
    candidates.push(
      PathBuf::from(&program_files_x86).join("Google/Chrome/Application/chrome.exe"),
    );
    candidates.push(
      PathBuf::from(&program_files_x86).join("Microsoft/Edge/Application/msedge.exe"),
    );
  }

  if let Ok(local_app_data) = std::env::var("LocalAppData") {
    candidates.push(
      PathBuf::from(&local_app_data).join("Google/Chrome/Application/chrome.exe"),
    );
    candidates.push(
      PathBuf::from(&local_app_data).join("Microsoft/Edge/Application/msedge.exe"),
    );
  }

  candidates
}

fn find_browser() -> Option<PathBuf> {
  browser_candidates()
    .into_iter()
    .find(|candidate| candidate.exists())
}

fn path_to_file_url(path: &Path) -> String {
  let mut url = String::from("file:///");
  let path_string = path.display().to_string().replace('\\', "/");

  if path_string.len() > 1 && path_string.as_bytes()[1] == b':' {
    url.push_str(&path_string);
  } else {
    url.push('/');
    url.push_str(&path_string.trim_start_matches('/'));
  }

  url
}

fn render_pdf_with_browser(html_path: &Path, output_path: &Path) -> Result<(), String> {
  let browser = find_browser()
    .ok_or_else(|| "Chrome ou Edge não encontrado para gerar PDF.".to_string())?;
  let html_url = path_to_file_url(html_path);

  let status = Command::new(&browser)
    .args([
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-pdf-header-footer",
      "--run-all-compositor-stages-before-draw",
      &format!("--print-to-pdf={}", output_path.display()),
      &html_url,
    ])
    .status()
    .map_err(|error| format!("Falha ao executar navegador: {error}"))?;

  if !status.success() {
    return Err("Falha ao gerar PDF.".to_string());
  }

  if !output_path.exists() {
    return Err("PDF não foi criado.".to_string());
  }

  Ok(())
}

pub fn export_pdf(app: &AppHandle, patient_name: &str, document_html: &str) -> Result<PdfExportResult, String> {
  let html = document_html.trim();
  if html.is_empty() {
    return Err("Informe o conteúdo do documento para exportar.".to_string());
  }

  let output_dir = output_dir(app)?;
  fs::create_dir_all(&output_dir).map_err(|error| error.to_string())?;

  let created_at = SystemTime::now();
  let filename = build_pdf_filename(patient_name, created_at);
  let output_path = resolve_unique_output_path(&output_dir, &filename);

  let temp_html = std::env::temp_dir().join(format!(
    "auto-orcamento-{}.html",
    created_at
      .duration_since(UNIX_EPOCH)
      .map(|duration| duration.as_millis())
      .unwrap_or_default()
  ));

  fs::write(&temp_html, format!("{html}\n")).map_err(|error| error.to_string())?;

  let render_result = render_pdf_with_browser(&temp_html, &output_path);
  let _ = fs::remove_file(&temp_html);
  render_result?;

  let saved_filename = output_path
    .file_name()
    .and_then(|value| value.to_str())
    .unwrap_or(&filename)
    .to_string();

  Ok(PdfExportResult {
    path: format!("output/{saved_filename}"),
    filename: saved_filename,
  })
}
