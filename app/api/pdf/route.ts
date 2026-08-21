import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    const parsed = new URL(decodedUrl);

    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
    }

    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "BooksCircle-PDF-Reader/1.0",
        Accept: "application/pdf,application/octet-stream,*/*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote server responded with ${response.status}: ${response.statusText}` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        "Access-Control-Allow-Origin": "*",
        "Content-Length": arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error("PDF Proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDF via proxy", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
