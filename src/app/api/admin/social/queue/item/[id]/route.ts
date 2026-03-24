import { NextResponse } from "next/server";
import {
  deleteQueueItem,
  getQueueItem,
  postNowQueueItem,
  retryQueueItem,
} from "@/lib/social/core/queue";

type Params = Promise<{ id: string }>;

export async function GET(_: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const item = await getQueueItem(id);

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Queue item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load queue item" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const removed = await deleteQueueItem(id);

    if (!removed) {
      return NextResponse.json(
        { ok: false, error: "Queue item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Queue item removed",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to delete queue item" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "retry") {
      const item = await retryQueueItem(id);

      if (!item) {
        return NextResponse.json(
          { ok: false, error: "Queue item not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        item,
        message: "Queue item retried",
      });
    }

    if (action === "post-now") {
      const item = await postNowQueueItem(id);

      if (!item) {
        return NextResponse.json(
          { ok: false, error: "Queue item not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        item,
        message: "Queue item scheduled to post now",
      });
    }

    return NextResponse.json(
      { ok: false, error: "Unsupported queue action" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update queue item" },
      { status: 500 }
    );
  }
}