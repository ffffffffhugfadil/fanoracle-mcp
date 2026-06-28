import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchComicPrice } from "./tools/fetch_comic_price.js";
import { gradeComic } from "./tools/grade_comic.js";
import { detectKeyIssue } from "./tools/detect_key_issue.js";
import { collectionValue } from "./tools/collection_value.js";
import { verifySlab } from "./tools/verify_slab.js";

const server = new McpServer({
  name: "fanoracle-comic",
  version: "0.1.0",
});

// ── Tool 1: fetch_comic_price ──────────────────────────────────────────────
server.tool(
  "fetch_comic_price",
  "Fetch recent sold prices for a comic book from eBay. Returns min, max, and average sale price.",
  {
    title: z.string().describe("Comic title, e.g. 'Amazing Spider-Man'"),
    issue_number: z.string().describe("Issue number, e.g. '300'"),
    grade: z.string().optional().describe("CGC/CBCS grade, e.g. '9.8'. Omit for raw copies."),
  },
  async ({ title, issue_number, grade }) => {
    try {
      const result = await fetchComicPrice({ title, issue_number, grade });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 2: grade_comic ────────────────────────────────────────────────────
server.tool(
  "grade_comic",
  "Analyze a comic book image and estimate its condition grade (0.5–10.0 CGC scale). Provide a base64-encoded image or a public image URL.",
  {
    image_url: z.string().optional().describe("Public URL of the comic cover image"),
    image_base64: z.string().optional().describe("Base64-encoded image (JPEG or PNG)"),
    notes: z.string().optional().describe("Any known defects or context for the grader"),
  },
  async ({ image_url, image_base64, notes }) => {
    if (!image_url && !image_base64) {
      return {
        content: [{ type: "text", text: "Error: provide either image_url or image_base64" }],
        isError: true,
      };
    }
    try {
      const result = await gradeComic({ image_url, image_base64, notes });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 3: detect_key_issue ───────────────────────────────────────────────
server.tool(
  "detect_key_issue",
  "Check whether a comic issue is a 'key issue' (first appearance, origin, death, etc.) using the Comic Vine database.",
  {
    title: z.string().describe("Comic series title, e.g. 'Amazing Spider-Man'"),
    issue_number: z.string().describe("Issue number, e.g. '300'"),
    publisher: z.string().optional().describe("Publisher name, e.g. 'Marvel'"),
  },
  async ({ title, issue_number, publisher }) => {
    try {
      const result = await detectKeyIssue({ title, issue_number, publisher });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 4: collection_value ───────────────────────────────────────────────
server.tool(
  "collection_value",
  "Calculate the total estimated value of a comic collection stored on the Casper blockchain. Optionally add or query comics from the on-chain registry.",
  {
    action: z.enum(["get_count", "add_comic", "value_estimate"]).describe(
      "get_count: read comic count from chain | add_comic: add a comic to blockchain | value_estimate: estimate total collection value"
    ),
    comics: z
      .array(
        z.object({
          title: z.string(),
          issue_number: z.string(),
          grade: z.string().optional(),
        })
      )
      .optional()
      .describe("List of comics to value (required for value_estimate)"),
  },
  async ({ action, comics }) => {
    try {
      const result = await collectionValue({ action, comics });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// ── Start server ───────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FanOracle MCP server running");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

// ── Tool 5: verify_slab ────────────────────────────────────────────────────
server.tool(
  "verify_slab",
  "Verify authenticity of a CGC/CBCS graded comic slab from a photo. Detects fake, tampered, or fraudulent slabs using AI visual analysis.",
  {
    image_url: z.string().optional().describe("Public URL of the slab image"),
    image_base64: z.string().optional().describe("Base64-encoded image"),
    claimed_grade: z.string().optional().describe("Grade claimed on the slab, e.g. '9.8'"),
    claimed_title: z.string().optional().describe("Comic title claimed on the slab"),
    cert_number: z.string().optional().describe("CGC certification number from the label, e.g. 3944834002"),
  },
  async ({ image_url, image_base64, claimed_grade, claimed_title, cert_number }) => {
    if (!image_url && !image_base64 && !cert_number) {
      return {
        content: [{ type: "text", text: "Error: provide image_url, image_base64, or cert_number" }],
        isError: true,
      };
    }
    try {
      const result = await verifySlab({ image_url, image_base64, claimed_grade, claimed_title, cert_number });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);
