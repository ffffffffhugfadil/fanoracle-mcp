import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface GradeResult {
  is_slabbed: boolean;
  grading_company?: "CGC" | "CBCS" | "PGX" | "unknown";
  certified_grade?: number;
  estimated_grade: number;
  grade_label: string;
  condition: string;
  defects: string[];
  confidence: "low" | "medium" | "high";
  slab_integrity?: "intact" | "cracked" | "tampered" | "unknown";
  notable_features: string[];
  estimated_market_tier: "low" | "mid" | "high" | "key";
  notes: string;
  detected_title?: string;
  detected_issue_number?: string;
  detected_publisher?: string;
  detected_year?: string;
  raw_text_detected?: string;
}

const GRADE_LABELS: Record<string, string> = {
  "10.0": "Gem Mint", "9.9": "Mint", "9.8": "Near Mint/Mint",
  "9.6": "Near Mint+", "9.4": "Near Mint", "9.2": "Near Mint-",
  "9.0": "Very Fine/Near Mint", "8.5": "Very Fine+", "8.0": "Very Fine",
  "7.5": "Very Fine-", "7.0": "Fine/Very Fine", "6.5": "Fine+",
  "6.0": "Fine", "5.5": "Fine-", "5.0": "Very Good/Fine",
  "4.5": "Very Good+", "4.0": "Very Good", "3.5": "Very Good-",
  "3.0": "Good/Very Good", "2.5": "Good+", "2.0": "Good",
  "1.8": "Good-", "1.5": "Fair/Good", "1.0": "Fair", "0.5": "Poor",
};

function gradeToLabel(grade: number): string {
  const key = grade.toFixed(1);
  return GRADE_LABELS[key] ?? GRADE_LABELS[grade.toFixed(0)] ?? "Unknown";
}

async function extractTextFromImage(imageContent: any): Promise<string> {
  // Step 1: OCR pass — extract ALL visible text
  const ocrResponse = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Please read and transcribe EVERY piece of text you can see in this image, no matter how small.
Focus especially on:
- Any label at the top of the case (CGC/CBCS label)
- The comic series title text
- Issue numbers
- Publisher names
- Grade numbers
- Page quality text
- Any text on the comic cover itself

List ALL text you see, word by word, exactly as written. Do not summarize — transcribe everything literally.`
          },
          imageContent,
        ],
      },
    ],
    max_tokens: 500,
    temperature: 0.0,
  });
  
  return ocrResponse.choices[0]?.message?.content ?? "";
}

export async function gradeComic(params: {
  image_url?: string;
  image_base64?: string;
  notes?: string;
}): Promise<GradeResult> {
  const { image_url, image_base64, notes } = params;

  const imageContent = image_url
    ? { type: "image_url" as const, image_url: { url: image_url } }
    : {
        type: "image_url" as const,
        image_url: { url: `data:image/jpeg;base64,${image_base64}` },
      };

  // Step 1: Extract all text via OCR pass
  const rawText = await extractTextFromImage(imageContent);

  // Step 2: Full grading analysis with OCR context
  const prompt = `You are an expert comic book grader with 20+ years of experience.

${notes ? `Submitter notes: ${notes}` : ""}

Here is ALL the text that was detected in the image via OCR:
"""
${rawText}
"""

Now using both the image AND the OCR text above, provide a complete grading analysis.

CGC label format reference:
- Title line: comic series name (e.g. "Wolverine", "X-Men", "Batman")  
- Issue line: "#76 Marvel Comics 1993" format
- Grade: large number on right side (e.g. "8.5")
- Page quality: "White Pages" / "Off-White to White" / "Cream to Off-White"

Using the OCR text and image, respond ONLY with this JSON (no markdown):
{
  "raw_text_detected": "<paste the key text from OCR that identifies this comic>",
  "detected_title": "<comic series title>",
  "detected_issue_number": "<issue number>",
  "detected_publisher": "<publisher>",
  "detected_year": "<year>",
  "is_slabbed": <true|false>,
  "grading_company": "<CGC|CBCS|PGX|unknown>",
  "certified_grade": <number or null>,
  "estimated_grade": <number>,
  "condition": "<condition>",
  "defects": ["<defects>"],
  "confidence": "<low|medium|high>",
  "slab_integrity": "<intact|cracked|tampered|unknown>",
  "notable_features": ["<features>"],
  "estimated_market_tier": "<low|mid|high|key>",
  "notes": "<2-3 sentences identifying the comic and explaining the grade>"
}`;

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          imageContent,
        ],
      },
    ],
    max_tokens: 900,
    temperature: 0.05,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();

  let parsed: Omit<GradeResult, "grade_label">;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Groq returned invalid JSON: ${raw}`);
  }

  return {
    ...parsed,
    grade_label: gradeToLabel(
      parsed.certified_grade ?? parsed.estimated_grade
    ),
  };
}
