// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

#![doc = include_str!("../README.md")]

use std::error::Error;
use std::fmt;

use harness_lens_core::AnalysisReport;

/// Stable output formats shared by terminal hosts.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OutputFormat {
    /// Compact human-readable overview.
    Human,
    /// Pretty-printed portable report JSON.
    Json,
}

/// Failure while rendering a completed report.
#[derive(Debug)]
pub struct RenderError(serde_json::Error);

impl fmt::Display for RenderError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "cannot render report JSON: {}", self.0)
    }
}

impl Error for RenderError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        Some(&self.0)
    }
}

/// Renders a completed report without writing to a terminal or filesystem.
pub fn render(report: &AnalysisReport, format: OutputFormat) -> Result<String, RenderError> {
    match format {
        OutputFormat::Human => Ok(render_human(report)),
        OutputFormat::Json => serde_json::to_string_pretty(report).map_err(RenderError),
    }
}

/// Renders the stable human-readable overview used by the native CLI.
#[must_use]
pub fn render_human(report: &AnalysisReport) -> String {
    let summary = report.summary();
    let mut lines = vec![format!(
        "Harness Lens found {} harness source(s) under {}",
        summary.sources,
        report.root.display()
    )];

    lines.extend(
        report
            .sources
            .iter()
            .map(|source| format!("- {}", source.path.display())),
    );

    lines.extend(report.metrics.iter().filter_map(|metric| {
        is_overview_metric(&metric.name).then(|| {
            format!(
                "{}: {} {}",
                metric.name,
                metric.value,
                metric.unit.as_deref().unwrap_or("")
            )
        })
    }));

    if summary.diagnostics > 0 {
        lines.push(format!("{} warning/error finding(s)", summary.diagnostics));
    }

    lines.join("\n")
}

fn is_overview_metric(name: &str) -> bool {
    name.starts_with("harness.total_")
        || name.starts_with("harness.input_cost_")
        || name == "harness.exact_duplicate_lines_or_paragraphs"
        || name == "harness.large_sources"
        || name == "harness.over_elaborated_sources"
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};

    use harness_lens::{HarnessLensConfig, Scanner};

    use super::{OutputFormat, render, render_human};

    static NEXT_DIRECTORY: AtomicU64 = AtomicU64::new(0);

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            let id = NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir()
                .join(format!("harness-lens-terminal-{}-{id}", std::process::id()));
            fs::create_dir_all(&path).unwrap();
            Self(path)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn renders_same_human_report_deterministically() {
        let workspace = TestDirectory::new();
        fs::write(workspace.0.join("AGENTS.md"), "Run tests before release.\n").unwrap();
        let report = Scanner::new()
            .scan(&workspace.0, &HarnessLensConfig::default())
            .unwrap();

        let first = render_human(&report);
        let second = render(&report, OutputFormat::Human).unwrap();

        assert_eq!(first, second);
        assert!(first.contains("Harness Lens found 1 harness source(s)"));
        assert!(first.contains("AGENTS.md"));
    }

    #[test]
    fn json_output_round_trips_without_source_content() {
        let workspace = TestDirectory::new();
        fs::write(workspace.0.join("AGENTS.md"), "Keep evidence bounded.\n").unwrap();
        let report = Scanner::new()
            .scan(&workspace.0, &HarnessLensConfig::default())
            .unwrap();

        let json = render(&report, OutputFormat::Json).unwrap();
        let decoded: harness_lens::AnalysisReport = serde_json::from_str(&json).unwrap();

        assert_eq!(decoded, report);
        assert!(!json.contains("Keep evidence bounded"));
    }
}
