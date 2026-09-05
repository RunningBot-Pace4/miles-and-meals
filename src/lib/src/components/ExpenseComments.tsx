"use client";

import { FormEvent, useState } from "react";

export type ExpenseCommentView = {
  id: string;
  body: string;
  userId: string;
  userName: string;
  createdAt: string;
};

export function ExpenseComments({
  expenseId,
  initialComments,
  readOnly = false,
}: {
  expenseId: string;
  initialComments: ExpenseCommentView[];
  readOnly?: boolean;
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/expenses/${expenseId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        comment?: ExpenseCommentView;
        error?: string;
      };
      if (!response.ok || !payload.comment) {
        throw new Error(payload.error ?? "Unable to add comment.");
      }
      setComments((current) => [...current, payload.comment as ExpenseCommentView]);
      setBody("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add comment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="expense-comments-card" aria-labelledby="expense-discussion-title">
      <div className="travel-section-heading">
        <div>
          <p className="eyebrow">GROUP DISCUSSION</p>
          <h2 id="expense-discussion-title">Comments &amp; corrections</h2>
        </div>
        <span>{comments.length}</span>
      </div>

      <div className="expense-comment-list">
        {comments.length ? comments.map((comment) => (
          <article key={comment.id}>
            <strong>{comment.userName}</strong>
            <p>{comment.body}</p>
            <small>{new Intl.DateTimeFormat("en-MY", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(comment.createdAt))}</small>
          </article>
        )) : (
          <p className="muted">No comments yet. Use this space to explain corrections without changing the original conversation elsewhere.</p>
        )}
      </div>

      {!readOnly ? (
        <form className="expense-comment-form" onSubmit={submit}>
          <label>
            Add a comment
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              placeholder="Example: This receipt includes JY and Tan only."
            />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button secondary" type="submit" disabled={busy || !body.trim()}>
            {busy ? "Adding…" : "Add comment"}
          </button>
        </form>
      ) : (
        <p className="muted">This Trip is closed, so the discussion is view-only.</p>
      )}
    </section>
  );
}
