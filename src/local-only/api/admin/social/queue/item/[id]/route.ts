import { NextResponse } from "next/server";
import {
  deleteQueueItem,
  findQueueItemById,
  rescheduleQueueItemNow,
  retryQueueItem,
} from "@/lib/social/core/queue";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const id = typeof body.id === "string" ? body.id.trim() : "";
    const action =
      typeof body.action === "string" ? body.action.trim() : "";

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400 }
      );
    }

    const item = findQueueItemById(id);

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Item not found" },
        { status: 404 }
      );
    }

    if (action === "delete") {
      deleteQueueItem(id);

      return NextResponse.json({
        ok: true,
        message: "Item deleted",
      });
    }

    if (action === "retry") {
      retryQueueItem(id);

      return NextResponse.json({
        ok: true,
        message: "Item moved to queue",
      });
    }

    if (action === "post-now") {
      rescheduleQueueItemNow(id);

      return NextResponse.json({
        ok: true,
        message: "Item scheduled for immediate posting",
      });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Action failed",
      },
      { status: 500 }
    );
  }
}