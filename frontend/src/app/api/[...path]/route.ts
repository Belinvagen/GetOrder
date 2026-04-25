import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "https://getorder-production.up.railway.app";

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}

async function proxyRequest(request: NextRequest) {
  const url = new URL(request.url);
  // Ensure trailing slash for FastAPI compatibility
  let targetPath = url.pathname;
  if (!targetPath.endsWith("/")) {
    targetPath += "/";
  }
  const targetUrl = `${BACKEND_URL}${targetPath}${url.search}`;

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (!["host", "connection", "transfer-encoding", "content-length"].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  let body: string | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    try {
      body = await request.text();
    } catch {
      body = undefined;
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: "follow",
    });

    const responseBody = await res.arrayBuffer();
    
    const responseHeaders = new Headers();
    responseHeaders.set("content-type", res.headers.get("content-type") || "application/json");
    
    return new NextResponse(responseBody, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { detail: "Backend unavailable" },
      { status: 502 }
    );
  }
}
