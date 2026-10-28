export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { formatFirebaseStorageUrl } from "@/lib/services/storage";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing 'url' parameter" },
      {
        status: 400,
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      }
    );
  }

  try {
    const resolvedUrl = formatFirebaseStorageUrl(targetUrl);
    const parsed = new URL(resolvedUrl);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Invalid URL protocol" },
        {
          status: 400,
          headers: {
            "X-Robots-Tag": "noindex, nofollow, noarchive",
          },
        }
      );
    }

    const response = await fetch(resolvedUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "BooksCircle-Secure-PDF-Delivery/2.0",
        Accept: "application/pdf,application/octet-stream,*/*",
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'inline; filename="ebook.pdf"',
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, notranslate",
          "Cache-Control": "private, max-age=3600, no-transform",
          "Access-Control-Allow-Origin": "*",
          "X-Content-Type-Options": "nosniff",
          "Content-Length": arrayBuffer.byteLength.toString(),
        },
      });
    }

    return NextResponse.json(
      { error: "PDF file not found" },
      {
        status: 404,
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      }
    );
  } catch (error) {
    console.error("PDF Delivery error:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDF file" },
      {
        status: 502,
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      }
    );
  }
}
