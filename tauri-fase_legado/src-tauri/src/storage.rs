use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;
use tauri::Manager;
use unicode_normalization::UnicodeNormalization;

use crate::paths::data_dir as resolve_data_dir;

const MAX_ITEMS: usize = 200;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnologyItem {
  pub nome: String,
  pub valor: String,
}

pub fn normalize_text(value: &str) -> String {
  value
    .nfkd()
    .filter(|character| !unicode_normalization::char::is_combining_mark(*character))
    .collect::<String>()
    .to_lowercase()
}

pub fn writable_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
  resolve_data_dir(app)
}

fn file_path(data_dir: &Path, store: &str) -> Result<PathBuf, String> {
  let file_name = match store {
    "cirurgias" => "cirurgias.json",
    "hospitais" => "hospitais.json",
    "pacientes" => "pacientes.json",
    "pagamentos" => "pagamentos.json",
    "observacoes" => "observacoes.json",
    "extras" => "extras.json",
    "tecnologias" => "tecnologias.json",
    "unimed-n" => "unimed-n.json",
    _ => return Err(format!("Histórico desconhecido: {store}")),
  };

  Ok(data_dir.join(file_name))
}

fn table_file_name(table: &str) -> Result<&'static str, String> {
  match table {
    "hospitalares" => Ok("tabelas-hospitalares.json"),
    "implantes" => Ok("tabela-implantes.json"),
    _ => Err(format!("Tabela desconhecida: {table}")),
  }
}

fn seed_table_file(app: &AppHandle, file_name: &str) -> Result<(), String> {
  let data_dir = writable_data_dir(app)?;
  let target = data_dir.join(file_name);

  if target.exists() {
    return Ok(());
  }

  #[cfg(not(debug_assertions))]
  {
    use tauri::path::BaseDirectory;

    if let Ok(bundled) = app.path().resolve(
      format!("data/{file_name}"),
      BaseDirectory::Resource,
    ) {
      if bundled.exists() {
        return fs::copy(&bundled, &target)
          .map_err(|error| error.to_string())
          .map(|_| ());
      }
    }
  }

  Err(format!(
    "Arquivo de tabela ausente: {file_name}. Copie a pasta data/ ao lado do executável."
  ))
}

pub fn read_table(app: &AppHandle, table: &str) -> Result<Value, String> {
  ensure_data_files(app)?;
  let file_name = table_file_name(table)?;
  seed_table_file(app, file_name)?;

  let path = writable_data_dir(app)?.join(file_name);
  let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
  serde_json::from_str(&content).map_err(|error| error.to_string())
}

pub fn ensure_data_files(app: &AppHandle) -> Result<(), String> {
  let data_dir = writable_data_dir(app)?;
  fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;

  for store in [
    "cirurgias",
    "hospitais",
    "pacientes",
    "pagamentos",
    "observacoes",
    "extras",
    "tecnologias",
    "unimed-n",
  ] {
    let path = file_path(&data_dir, store)?;
    if !path.exists() {
      fs::write(&path, "[]\n").map_err(|error| error.to_string())?;
    }
  }

  for file_name in ["tabelas-hospitalares.json", "tabela-implantes.json"] {
    let _ = seed_table_file(app, file_name);
  }

  Ok(())
}

fn read_json_list(path: &Path) -> Result<Vec<Value>, String> {
  let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
  let items = serde_json::from_str::<Value>(&content).map_err(|error| error.to_string())?;

  match items {
    Value::Array(list) => Ok(list),
    _ => Ok(Vec::new()),
  }
}

fn write_json_list(path: &Path, items: &[Value]) -> Result<(), String> {
  let serialized = serde_json::to_string_pretty(items).map_err(|error| error.to_string())?;
  fs::write(path, format!("{serialized}\n")).map_err(|error| error.to_string())
}

pub fn read_string_list(app: &AppHandle, store: &str) -> Result<Vec<String>, String> {
  ensure_data_files(app)?;
  let path = file_path(&writable_data_dir(app)?, store)?;
  let items = read_json_list(&path)?;

  Ok(
    items
      .into_iter()
      .filter_map(|item| item.as_str().map(str::to_string))
      .collect(),
  )
}

pub fn add_string_item(app: &AppHandle, store: &str, value: &str) -> Result<Vec<String>, String> {
  let item = value.trim();
  if item.is_empty() {
    return Err("Valor vazio.".to_string());
  }

  ensure_data_files(app)?;
  let data_dir = writable_data_dir(app)?;
  let path = file_path(&data_dir, store)?;
  let mut items = read_string_list(app, store)?;
  let already_exists = items
    .iter()
    .any(|existing| normalize_text(existing) == normalize_text(item));

  if !already_exists {
    items.insert(0, item.to_string());
    items.truncate(MAX_ITEMS);
    let json_items = items
      .iter()
      .map(|entry| Value::String(entry.clone()))
      .collect::<Vec<_>>();
    write_json_list(&path, &json_items)?;
  }

  read_string_list(app, store)
}

pub fn remove_string_item(app: &AppHandle, store: &str, value: &str) -> Result<Vec<String>, String> {
  let item = value.trim();
  if item.is_empty() {
    return Err("Valor vazio.".to_string());
  }

  ensure_data_files(app)?;
  let data_dir = writable_data_dir(app)?;
  let path = file_path(&data_dir, store)?;
  let target = normalize_text(item);
  let next_items = read_string_list(app, store)?
    .into_iter()
    .filter(|existing| normalize_text(existing) != target)
    .collect::<Vec<_>>();
  let json_items = next_items
    .iter()
    .map(|entry| Value::String(entry.clone()))
    .collect::<Vec<_>>();
  write_json_list(&path, &json_items)?;
  Ok(next_items)
}

pub fn replace_string_list(app: &AppHandle, store: &str, items: Vec<String>) -> Result<Vec<String>, String> {
  ensure_data_files(app)?;
  let data_dir = writable_data_dir(app)?;
  let path = file_path(&data_dir, store)?;
  let mut normalized_keys = std::collections::HashSet::new();
  let mut next_items = Vec::new();

  for item in items {
    let trimmed = item.trim();
    if trimmed.is_empty() {
      continue;
    }

    let key = normalize_text(trimmed);
    if normalized_keys.contains(&key) {
      continue;
    }

    normalized_keys.insert(key);
    next_items.push(trimmed.to_string());

    if next_items.len() >= MAX_ITEMS {
      break;
    }
  }

  let json_items = next_items
    .iter()
    .map(|entry| Value::String(entry.clone()))
    .collect::<Vec<_>>();
  write_json_list(&path, &json_items)?;
  Ok(next_items)
}

fn technology_name(item: &Value) -> String {
  item
    .get("nome")
    .and_then(Value::as_str)
    .or_else(|| item.as_str())
    .unwrap_or_default()
    .trim()
    .to_string()
}

fn read_named_value_items(app: &AppHandle, store: &str) -> Result<Vec<TechnologyItem>, String> {
  ensure_data_files(app)?;
  let path = file_path(&writable_data_dir(app)?, store)?;
  let items = read_json_list(&path)?;

  Ok(
    items
      .into_iter()
      .filter_map(|item| {
        let nome = technology_name(&item);
        if nome.is_empty() {
          return None;
        }

        Some(TechnologyItem {
          nome,
          valor: item
            .get("valor")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_string(),
        })
      })
      .collect(),
  )
}

fn add_named_value_item(
  app: &AppHandle,
  store: &str,
  nome: &str,
  valor: &str,
  empty_error: &str,
) -> Result<Vec<TechnologyItem>, String> {
  let name = nome.trim();
  if name.is_empty() {
    return Err(empty_error.to_string());
  }

  ensure_data_files(app)?;
  let data_dir = writable_data_dir(app)?;
  let path = file_path(&data_dir, store)?;
  let item = TechnologyItem {
    nome: name.to_string(),
    valor: valor.trim().to_string(),
  };
  let target = normalize_text(&item.nome);
  let mut next_items = read_named_value_items(app, store)?
    .into_iter()
    .filter(|existing| normalize_text(&existing.nome) != target)
    .collect::<Vec<_>>();
  next_items.insert(0, item);
  next_items.truncate(MAX_ITEMS);

  let json_items = next_items
    .iter()
    .map(|entry| {
      serde_json::json!({
        "nome": entry.nome,
        "valor": entry.valor,
      })
    })
    .collect::<Vec<_>>();
  write_json_list(&path, &json_items)?;
  Ok(next_items)
}

fn remove_named_value_item(
  app: &AppHandle,
  store: &str,
  nome: &str,
  empty_error: &str,
) -> Result<Vec<TechnologyItem>, String> {
  let name = nome.trim();
  if name.is_empty() {
    return Err(empty_error.to_string());
  }

  ensure_data_files(app)?;
  let data_dir = writable_data_dir(app)?;
  let path = file_path(&data_dir, store)?;
  let target = normalize_text(name);
  let next_items = read_named_value_items(app, store)?
    .into_iter()
    .filter(|existing| normalize_text(&existing.nome) != target)
    .collect::<Vec<_>>();
  let json_items = next_items
    .iter()
    .map(|entry| {
      serde_json::json!({
        "nome": entry.nome,
        "valor": entry.valor,
      })
    })
    .collect::<Vec<_>>();
  write_json_list(&path, &json_items)?;
  Ok(next_items)
}

fn replace_named_value_items(
  app: &AppHandle,
  store: &str,
  items: Vec<TechnologyItem>,
) -> Result<Vec<TechnologyItem>, String> {
  ensure_data_files(app)?;
  let data_dir = writable_data_dir(app)?;
  let path = file_path(&data_dir, store)?;
  let mut normalized_keys = std::collections::HashSet::new();
  let mut next_items = Vec::new();

  for item in items {
    let nome = item.nome.trim();
    if nome.is_empty() {
      continue;
    }

    let key = normalize_text(nome);
    if normalized_keys.contains(&key) {
      continue;
    }

    normalized_keys.insert(key);
    next_items.push(TechnologyItem {
      nome: nome.to_string(),
      valor: item.valor.trim().to_string(),
    });

    if next_items.len() >= MAX_ITEMS {
      break;
    }
  }

  let json_items = next_items
    .iter()
    .map(|entry| {
      serde_json::json!({
        "nome": entry.nome,
        "valor": entry.valor,
      })
    })
    .collect::<Vec<_>>();
  write_json_list(&path, &json_items)?;
  Ok(next_items)
}

pub fn read_technologies(app: &AppHandle) -> Result<Vec<TechnologyItem>, String> {
  read_named_value_items(app, "tecnologias")
}

pub fn add_technology(app: &AppHandle, nome: &str, valor: &str) -> Result<Vec<TechnologyItem>, String> {
  add_named_value_item(app, "tecnologias", nome, valor, "Informe uma tecnologia válida.")
}

pub fn remove_technology(app: &AppHandle, nome: &str) -> Result<Vec<TechnologyItem>, String> {
  remove_named_value_item(app, "tecnologias", nome, "Informe uma tecnologia válida.")
}

pub fn replace_technologies(app: &AppHandle, items: Vec<TechnologyItem>) -> Result<Vec<TechnologyItem>, String> {
  replace_named_value_items(app, "tecnologias", items)
}

pub fn read_unimed_n(app: &AppHandle) -> Result<Vec<TechnologyItem>, String> {
  read_named_value_items(app, "unimed-n")
}

pub fn add_unimed_n(app: &AppHandle, nome: &str, valor: &str) -> Result<Vec<TechnologyItem>, String> {
  add_named_value_item(app, "unimed-n", nome, valor, "Informe um procedimento Unimed N válido.")
}

pub fn remove_unimed_n(app: &AppHandle, nome: &str) -> Result<Vec<TechnologyItem>, String> {
  remove_named_value_item(app, "unimed-n", nome, "Informe um procedimento Unimed N válido.")
}

pub fn replace_unimed_n(app: &AppHandle, items: Vec<TechnologyItem>) -> Result<Vec<TechnologyItem>, String> {
  replace_named_value_items(app, "unimed-n", items)
}

const ZOOM_MIN: f64 = 0.5;
const ZOOM_MAX: f64 = 2.0;
const ZOOM_DEFAULT: f64 = 1.0;

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(writable_data_dir(app)?.join("settings.json"))
}

fn clamp_zoom(zoom: f64) -> f64 {
  if !zoom.is_finite() {
    return ZOOM_DEFAULT;
  }

  let rounded = (zoom * 10.0).round() / 10.0;
  rounded.clamp(ZOOM_MIN, ZOOM_MAX)
}

pub fn read_zoom_level(app: &AppHandle) -> Result<f64, String> {
  ensure_data_files(app)?;
  let path = settings_path(app)?;

  if !path.exists() {
    return Ok(ZOOM_DEFAULT);
  }

  let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
  let settings = serde_json::from_str::<Value>(&content).unwrap_or(Value::Null);
  let zoom = settings
    .get("zoom")
    .and_then(Value::as_f64)
    .unwrap_or(ZOOM_DEFAULT);

  Ok(clamp_zoom(zoom))
}

pub fn write_zoom_level(app: &AppHandle, zoom: f64) -> Result<f64, String> {
  ensure_data_files(app)?;
  let path = settings_path(app)?;
  let clamped = clamp_zoom(zoom);
  let settings = serde_json::json!({ "zoom": clamped });
  let serialized = serde_json::to_string_pretty(&settings).map_err(|error| error.to_string())?;
  fs::write(path, format!("{serialized}\n")).map_err(|error| error.to_string())?;
  Ok(clamped)
}

pub fn apply_zoom(app: &AppHandle, zoom: f64) -> Result<f64, String> {
  let clamped = clamp_zoom(zoom);
  let window = app
    .get_webview_window("main")
    .ok_or_else(|| "Janela principal não encontrada.".to_string())?;

  window.set_zoom(clamped).map_err(|error| error.to_string())?;
  Ok(clamped)
}

pub fn set_zoom_level(app: &AppHandle, zoom: f64) -> Result<f64, String> {
  let clamped = write_zoom_level(app, zoom)?;
  apply_zoom(app, clamped)
}

pub fn adjust_zoom_level(app: &AppHandle, delta: f64) -> Result<f64, String> {
  let current = read_zoom_level(app)?;
  set_zoom_level(app, current + delta)
}
