import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface SlabVerificationResult {
  is_authentic: boolean;
  confidence: "low" | "medium" | "high";
  authenticity_score: number;
  grading_company?: "CGC" | "CBCS" | "PGX" | "unknown";
  red_flags: string[];
  green_flags: string[];
  hologram_detected: boolean;
  label_quality: "authentic" | "suspicious" | "fake" | "unknown";
  barcode_present: boolean;
  certification_number?: string;
  cgc_lookup_url?: string;
  verdict: "AUTHENTIC" | "SUSPICIOUS" | "LIKELY_FAKE" | "CANNOT_DETERMINE";
  recommendations: string[];
  notes: string;
}

export async function verifySlab(params: {
  image_url?: string;
  image_base64?: string;
  claimed_grade?: string;
  claimed_title?: string;
  cert_number?: string;
}): Promise<SlabVerificationResult> {
  const { image_url, image_base64, claimed_grade, claimed_title, cert_number } = params;

  // If only cert number provided, return lookup URL
  if (cert_number && !image_url && !image_base64) {
    const cleanCert = cert_number.replace(/\D/g, "");
    return {
      is_authentic: true,
      confidence: "medium",
      authenticity_score: 75,
      grading_company: "CGC",
      red_flags: [],
      green_flags: ["Cert number provided for verification"],
      hologram_detected: false,
      label_quality: "unknown",
      barcode_present: false,
      certification_number: cleanCert,
      cgc_lookup_url: `https://www.cgccomics.com/certlookup/details/?certInput=${cleanCert}`,
      verdict: "CANNOT_DETERMINE",
      recommendations: [
        `Verify cert #${cleanCert} at CGC website: https://www.cgccomics.com/certlookup/details/?certInput=${cleanCert}`,
        "Confirm comic title, grade, and publisher match the label",
        "Check hologram is present and shows rainbow iridescence",
      ],
      notes: `Cert number ${cleanCert} provided. Visual inspection not possible without image. Please verify on CGC's official registry.`,
    };
  }

  const imageContent = image_url
    ? { type: "image_url" as const, image_url: { url: image_url } }
    : {
        type: "image_url" as const,
        image_url: { url: `data:image/jpeg;base64,${image_base64}` },
      };

  const prompt = `You are a world-class CGC/CBCS slab authentication expert. Detect fake, tampered, or fraudulent comic book slabs.

${claimed_title ? `Claimed comic: ${claimed_title}` : ""}
${claimed_grade ? `Claimed grade: ${claimed_grade}` : ""}
${cert_number ? `Claimed cert number: ${cert_number}` : ""}

AUTHENTIC CGC SLAB characteristics:
LABEL:
- Blue gradient header "CGC UNIVERSAL GRADE" in white bold text
- Comic title in large bold black text, centered
- Grade number in large bold font on LEFT in white box
- "WHITE Pages" text below grade
- Hologram sticker TOP RIGHT (silver/rainbow iridescent)
- 10-digit certification number above barcode
- Creator credits bottom-left in small text

CASE:
- Clear hard acrylic, uniform thickness
- No yellowing, crazing, or warping
- Comic sits flat and centered
- Black inner frame

FAKE INDICATORS:
- Blurry/pixelated label text
- Wrong font or colors
- Missing/flat hologram
- Wrong grade position or size
- Thin/bendy case
- Comic loose inside case
- Label on regular paper

Respond ONLY with this JSON (no markdown):
{
  "is_authentic": <true|false>,
  "confidence": "<low|medium|high>",
  "authenticity_score": <0-100>,
  "grading_company": "<CGC|CBCS|PGX|unknown>",
  "red_flags": ["<suspicious details>"],
  "green_flags": ["<authentic details confirmed>"],
  "hologram_detected": <true|false>,
  "label_quality": "<authentic|suspicious|fake|unknown>",
  "barcode_present": <true|false>,
  "certification_number": "<10-digit number if visible, else null>",
  "cgc_lookup_url": "<https://www.cgccomics.com/certlookup/details/?certInput=CERTNUMBER if cert visible>",
  "verdict": "<AUTHENTIC|SUSPICIOUS|LIKELY_FAKE|CANNOT_DETERMINE>",
  "recommendations": ["<what buyer should do>"],
  "notes": "<2-3 sentences explaining verdict>"
}`;

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt }, imageContent],
      },
    ],
    max_tokens: 900,
    temperature: 0.05,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();

  let parsed: SlabVerificationResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Groq returned invalid JSON: ${raw}`);
  }

  // Add cert lookup URL if cert number detected
  if (parsed.certification_number && !parsed.cgc_lookup_url) {
    parsed.cgc_lookup_url = `https://www.cgccomics.com/certlookup/details/?certInput=${parsed.certification_number}`;
  }

  return parsed;
}
