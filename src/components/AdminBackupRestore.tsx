"use client";

import {
  ChangeEvent,
  useState,
} from "react";
import { FullPageLink as Link } from "@/components/FullPageLink";
import { SavingOverlay } from "@/components/SavingOverlay";

type Preview = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  counts: Record<
    string,
    number
  >;
};

export function AdminBackupRestore() {
  const [backup, setBackup] =
    useState<unknown>(null);
  const [fileName, setFileName] =
    useState("");
  const [fileSize, setFileSize] =
    useState(0);
  const [preview, setPreview] =
    useState<Preview | null>(null);
  const [confirmation, setConfirmation] =
    useState("");
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState("");
  const [message, setMessage] =
    useState("");

  async function previewBackup(
    value: unknown,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    setPreview(null);

    try {
      const response = await fetch(
        "/api/admin/backup",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            mode: "preview",
            backup: value,
          }),
        },
      );

      const payload =
        (await response
          .json()
          .catch(
            () => ({}),
          )) as {
          error?: string;
          preview?: Preview;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to preview backup.",
        );
      }

      setPreview(
        payload.preview ?? null,
      );
      setMessage(
        payload.preview?.valid
          ? "Backup passed validation. Review the counts before restoring."
          : "Backup contains problems. Restore is blocked until they are fixed.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to preview backup.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function selectFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setConfirmation("");
    setPreview(null);
    setError("");
    setMessage("");

    try {
      const parsed = JSON.parse(
        await file.text(),
      ) as unknown;
      setBackup(parsed);
      await previewBackup(
        parsed,
      );
    } catch {
      setBackup(null);
      setError(
        "This file is not valid JSON.",
      );
    }
  }

  async function restore() {
    if (
      !backup ||
      !preview?.valid
    ) {
      return;
    }

    if (
      confirmation !==
      "RESTORE TRAVEL DATA"
    ) {
      setError(
        'Type "RESTORE TRAVEL DATA" exactly before restoring.',
      );
      return;
    }

    if (
      !window.confirm(
        "Replace all current travel data with this backup? Login/users are preserved, but current trips, expenses, planner and settlements will be replaced.",
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/backup",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            mode: "restore",
            confirmation,
            backup,
          }),
        },
      );

      const payload =
        (await response
          .json()
          .catch(
            () => ({}),
          )) as {
          error?: string;
          loginDataPreserved?: boolean;
        };

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to restore backup.",
        );
      }

      setMessage(
        "Travel data restored. User accounts and login data were preserved.",
      );

      window.setTimeout(
        () =>
          window.location.assign(
            "/admin",
          ),
        900,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to restore backup.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      {busy ? (
        <SavingOverlay
          title={
            preview
              ? "Processing travel backup"
              : "Reading travel backup"
          }
          message="Miles & Meals is validating the backup without touching login data."
        />
      ) : null}

      <section className="content-grid admin-backup-grid">
        <article className="panel admin-backup-card">
          <span
            className="export-icon"
            aria-hidden="true"
          >
            ↓
          </span>
          <div>
            <p className="eyebrow">
              BACKUP FIRST
            </p>
            <h2>
              Download full travel backup
            </h2>
            <p className="muted">
              Includes trips, personal budgets, country assignments, expenses, splits, settlements and planner items. Login/password tables are excluded.
            </p>
          </div>

          <Link
            className="button primary"
            href="/api/admin/backup"
            download
          >
            Download backup
          </Link>
        </article>

        <article className="panel admin-backup-card">
          <span
            className="export-icon"
            aria-hidden="true"
          >
            ↑
          </span>
          <div>
            <p className="eyebrow">
              CONTROLLED RESTORE
            </p>
            <h2>
              Preview a backup
            </h2>
            <p className="muted">
              Selecting a file runs validation only. Nothing is deleted until you explicitly confirm Restore.
            </p>
          </div>

          <label className="admin-backup-file">
            Choose JSON backup
            <input
              type="file"
              accept="application/json,.json"
              onChange={
                selectFile
              }
              disabled={busy}
            />
          </label>

          {fileName ? (
            <small className="muted">
              {fileName} ·{" "}
              {(
                fileSize /
                1024 /
                1024
              ).toFixed(2)}
              MB
            </small>
          ) : null}
        </article>
      </section>

      {preview ? (
        <section
          className={
            preview.valid
              ? "panel backup-preview valid"
              : "panel backup-preview invalid"
          }
        >
          <div className="panel-title">
            <div>
              <p className="eyebrow">
                PREVIEW
              </p>
              <h2>
                {preview.valid
                  ? "Backup is restorable"
                  : "Restore blocked"}
              </h2>
            </div>
          </div>

          <div className="backup-count-grid">
            {Object.entries(
              preview.counts,
            ).map(
              ([key, count]) => (
                <div key={key}>
                  <span>
                    {key}
                  </span>
                  <strong>
                    {count}
                  </strong>
                </div>
              ),
            )}
          </div>

          {preview.warnings.length ? (
            <div className="backup-message-list warning">
              {preview.warnings.map(
                (warning) => (
                  <p key={warning}>
                    ! {warning}
                  </p>
                ),
              )}
            </div>
          ) : null}

          {preview.errors.length ? (
            <div className="backup-message-list error">
              {preview.errors.map(
                (item) => (
                  <p key={item}>
                    ! {item}
                  </p>
                ),
              )}
            </div>
          ) : null}

          {preview.valid ? (
            <div className="backup-restore-confirm">
              <label>
                Type{" "}
                <strong>
                  RESTORE TRAVEL DATA
                </strong>
                <input
                  value={
                    confirmation
                  }
                  onChange={(
                    event,
                  ) =>
                    setConfirmation(
                      event.target
                        .value,
                    )
                  }
                  placeholder="RESTORE TRAVEL DATA"
                />
              </label>

              <button
                className="button danger"
                type="button"
                data-requires-online="true"
                disabled={
                  busy ||
                  confirmation !==
                    "RESTORE TRAVEL DATA"
                }
                onClick={
                  restore
                }
              >
                Restore travel data
              </button>

              <small>
                This replaces travel data only. User accounts, passwords, sessions, login audits, profile preferences and push subscriptions are not imported or overwritten.
              </small>
            </div>
          ) : null}
        </section>
      ) : null}

      {message ? (
        <p
          className="form-success"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </>
  );
}
